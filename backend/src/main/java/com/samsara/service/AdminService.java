package com.samsara.service;

import com.samsara.dto.AdminStatsDto;
import com.samsara.dto.AdminUserDto;
import com.samsara.dto.AdminUserRequest;
import com.samsara.entity.User;
import com.samsara.entity.UserRole;
import com.samsara.repository.NotificationRepository;
import com.samsara.repository.PropertyRepository;
import com.samsara.repository.PropertySamsarRepository;
import com.samsara.repository.ReservationRepository;
import com.samsara.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/**
 * The superadmin's work: he alone creates the accounts (owners and samsars), turns them off and on,
 * and decides which owners work with samsars.
 */
@Service
@RequiredArgsConstructor
public class AdminService {

    private static final Set<UserRole> MANAGED = Set.of(UserRole.PROPRIETAIRE, UserRole.SAMSAR);

    private final UserRepository userRepository;
    private final PropertyRepository propertyRepository;
    private final PropertySamsarRepository propertySamsarRepository;
    private final ReservationRepository reservationRepository;
    private final NotificationRepository notificationRepository;
    private final PasswordEncoder passwordEncoder;
    private final Clock clock;

    @Value("${application.subscription.monthly-price:50}")
    private BigDecimal monthlyPrice;

    public List<AdminUserDto> listUsers() {
        return userRepository.findByRoleNotOrderByCreatedAtDesc(UserRole.SUPERADMIN).stream().map(this::toDto).toList();
    }

    @Transactional
    public AdminUserDto create(AdminUserRequest request) {
        if (request.getRole() == null || !MANAGED.contains(request.getRole())) {
            throw new IllegalArgumentException("Role must be PROPRIETAIRE or SAMSAR");
        }
        String email = request.getEmail().trim().toLowerCase();
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already in use");
        }
        User user = User.builder()
                .name(request.getName().trim())
                .email(email)
                .password(passwordEncoder.encode(checkedPassword(request.getPassword())))
                .phone(AuthService.validatePhone(request.getPhone(), request.getRole()))
                .role(request.getRole())
                .active(request.getActive() == null || request.getActive())
                .samsarsEnabled(request.getSamsarsEnabled() == null || request.getSamsarsEnabled())
                .emailVerified(true)
                .language(AuthService.supportedLanguage(request.getLanguage(), "fr"))
                .build();
        return toDto(userRepository.save(user));
    }

    /** Name, email, phone, options; a new password signs the account out of its devices. */
    @Transactional
    public AdminUserDto update(Long id, AdminUserRequest request) {
        User user = managed(id);
        String email = request.getEmail().trim().toLowerCase();
        if (!email.equalsIgnoreCase(user.getEmail()) && userRepository.existsByEmailIgnoreCase(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already in use");
        }
        user.setName(request.getName().trim());
        user.setEmail(email);
        user.setPhone(AuthService.validatePhone(request.getPhone(), user.getRole()));
        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(checkedPassword(request.getPassword())));
            user.setTokenVersion(user.getTokenVersion() + 1);
        }
        if (request.getActive() != null) {
            applyActive(user, request.getActive());
        }
        if (request.getSamsarsEnabled() != null) {
            applySamsars(user, request.getSamsarsEnabled());
        }
        return toDto(userRepository.save(user));
    }

    /** Off: the account can no longer sign in and its open sessions stop at their next call. */
    @Transactional
    public AdminUserDto setActive(Long id, boolean active) {
        User user = managed(id);
        applyActive(user, active);
        return toDto(userRepository.save(user));
    }

    /** Off: the samsars lose access to this owner's houses, and he no longer sees anything about samsars. */
    @Transactional
    public AdminUserDto setSamsarsEnabled(Long id, boolean enabled) {
        User user = managed(id);
        applySamsars(user, enabled);
        return toDto(userRepository.save(user));
    }

    /** Only an account with no house and no reservation goes away; otherwise it is turned off. */
    @Transactional
    public void delete(Long id) {
        User user = managed(id);
        if (propertyRepository.countByCreatedBy(id) > 0 || reservationRepository.existsBySamsarId(id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This account still has houses or reservations: turn it off instead");
        }
        propertySamsarRepository.deleteBySamsarId(id);
        notificationRepository.deleteByUserId(id);
        userRepository.delete(user);
    }

    public AdminStatsDto stats() {
        List<User> accounts = userRepository.findByRoleNotOrderByCreatedAtDesc(UserRole.SUPERADMIN);
        YearMonth now = YearMonth.now(clock);
        long paying = accounts.stream().filter(this::isActive).count();
        long billedMonths = accounts.stream().filter(this::isActive)
                .mapToLong(user -> ChronoUnit.MONTHS.between(startMonth(user, now), now) + 1)
                .sum();
        List<AdminStatsDto.Month> months = new ArrayList<>();
        for (int back = 5; back >= 0; back--) {
            YearMonth month = now.minusMonths(back);
            long count = accounts.stream().filter(this::isActive).filter(user -> !startMonth(user, now).isAfter(month)).count();
            months.add(new AdminStatsDto.Month(month.toString(), count, monthlyPrice.multiply(BigDecimal.valueOf(count))));
        }
        return AdminStatsDto.builder()
                .owners(userRepository.countByRole(UserRole.PROPRIETAIRE))
                .activeOwners(userRepository.countByRoleAndActiveTrue(UserRole.PROPRIETAIRE))
                .samsars(userRepository.countByRole(UserRole.SAMSAR))
                .activeSamsars(userRepository.countByRoleAndActiveTrue(UserRole.SAMSAR))
                .ownersWithSamsars(accounts.stream()
                        .filter(user -> user.getRole() == UserRole.PROPRIETAIRE && Boolean.TRUE.equals(user.getSamsarsEnabled()))
                        .count())
                .houses(propertyRepository.count())
                .reservations(reservationRepository.count())
                .newAccountsThisMonth(accounts.stream().filter(user -> startMonth(user, now).equals(now)).count())
                .monthlyPrice(monthlyPrice)
                .monthlyRevenue(monthlyPrice.multiply(BigDecimal.valueOf(paying)))
                .totalRevenue(monthlyPrice.multiply(BigDecimal.valueOf(billedMonths)))
                .months(months)
                .build();
    }

    private void applyActive(User user, boolean active) {
        if (!active && Boolean.TRUE.equals(user.getActive())) {
            user.setTokenVersion(user.getTokenVersion() + 1);
        }
        user.setActive(active);
    }

    private void applySamsars(User user, boolean enabled) {
        if (user.getRole() != UserRole.PROPRIETAIRE) {
            return;
        }
        if (!enabled && Boolean.TRUE.equals(user.getSamsarsEnabled())) {
            propertySamsarRepository.deleteByPropertyCreatedBy(user.getId());
        }
        user.setSamsarsEnabled(enabled);
    }

    private boolean isActive(User user) {
        return Boolean.TRUE.equals(user.getActive());
    }

    private static YearMonth startMonth(User user, YearMonth fallback) {
        LocalDate created = user.getCreatedAt() == null ? null : user.getCreatedAt().toLocalDate();
        return created == null ? fallback : YearMonth.from(created);
    }

    private static String checkedPassword(String password) {
        if (password == null || password.length() < 6) {
            throw new IllegalArgumentException("Password must contain at least 6 characters");
        }
        return password;
    }

    /** The superadmin manages owners and samsars, never another superadmin. */
    private User managed(Long id) {
        User user = userRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("User not found"));
        if (!MANAGED.contains(user.getRole())) {
            throw new IllegalArgumentException("A superadmin account cannot be changed here");
        }
        return user;
    }

    private AdminUserDto toDto(User user) {
        boolean owner = user.getRole() == UserRole.PROPRIETAIRE;
        return AdminUserDto.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .role(user.getRole().name())
                .active(user.getActive())
                .samsarsEnabled(owner ? user.getSamsarsEnabled() : null)
                .photoUrl(user.getPhotoUrl())
                .createdAt(user.getCreatedAt())
                .houses(owner ? propertyRepository.countByCreatedBy(user.getId()) : 0)
                .shares(owner ? propertySamsarRepository.countByPropertyCreatedBy(user.getId())
                        : propertySamsarRepository.countBySamsarId(user.getId()))
                .build();
    }
}
