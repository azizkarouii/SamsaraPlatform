package com.samsara.service;

import com.samsara.dto.AuthResponse;
import com.samsara.dto.ChangePasswordDto;
import com.samsara.dto.LoginDto;
import com.samsara.dto.RegisterDto;
import com.samsara.dto.UpdateProfileDto;
import com.samsara.dto.UserDto;
import com.samsara.entity.User;
import com.samsara.entity.UserRole;
import com.samsara.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private static final int MAX_LOGIN_FAILURES = 5;

    private final JwtService jwtService;
    private final AttemptLimiter attemptLimiter;
    private final EmailVerificationService emailVerificationService;
    private final ImageStorage imageStorage;
    private final ImageFileValidator imageFileValidator;

    public AuthResponse register(RegisterDto dto) {
        String email = dto.getEmail().trim().toLowerCase();
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already in use");
        }
        String phone = validatePhone(dto.getPhone(), dto.getRole());

        User user = User.builder()
                .name(dto.getName().trim())
                .email(email)
                .password(passwordEncoder.encode(dto.getPassword()))
                .phone(phone)
                .role(dto.getRole())
                .build();

        if (!emailVerificationService.isEnabled()) {
            user.setEmailVerified(true);
        }
        user = userRepository.save(user);
        if (emailVerificationService.isEnabled()) {
            emailVerificationService.sendLink(user, dto.getLanguage());
            return AuthResponse.builder().verificationRequired(true).build();
        }
        return toAuthResponse(user);
    }

    /** After too many failures for an email from one address, attempts are refused for a while. */
    public AuthResponse login(LoginDto dto, String clientAddress) {
        String email = dto.getEmail().trim();
        String limitKey = "login:" + email.toLowerCase() + ":" + clientAddress;
        if (attemptLimiter.isBlocked(limitKey, MAX_LOGIN_FAILURES)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many failed attempts: try again in 15 minutes");
        }
        User user = userRepository.findByEmailIgnoreCase(email)
                .filter(found -> passwordEncoder.matches(dto.getPassword(), found.getPassword()))
                .orElse(null);
        if (user == null) {
            attemptLimiter.record(limitKey);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }
        attemptLimiter.reset(limitKey);
        if (!Boolean.TRUE.equals(user.getEmailVerified())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Please confirm your email address first");
        }
        return toAuthResponse(user);
    }

    public UserDto getProfile(Long userId) {
        return toUserDto(getUser(userId));
    }

    public UserDto updateProfile(Long userId, UpdateProfileDto dto) {
        User user = getUser(userId);
        user.setName(dto.getName().trim());
        user.setPhone(validatePhone(dto.getPhone(), user.getRole()));
        return toUserDto(userRepository.save(user));
    }

    /** Profile photo shown instead of the initials; photo_url keeps its storage key. */
    public UserDto updatePhoto(Long userId, MultipartFile file) {
        User user = getUser(userId);
        ImageFileValidator.CheckedImage image = imageFileValidator.check(file);
        String oldKey = user.getPhotoUrl();
        String newKey = imageStorage.save("avatars/" + userId, image.extension(), image.bytes());
        user.setPhotoUrl(newKey);
        try {
            user = userRepository.save(user);
        } catch (RuntimeException e) {
            imageStorage.delete(newKey);
            throw e;
        }
        if (oldKey != null && !oldKey.isBlank()) {
            imageStorage.delete(oldKey);
        }
        return toUserDto(user);
    }

    public UserDto removePhoto(Long userId) {
        User user = getUser(userId);
        String oldKey = user.getPhotoUrl();
        user.setPhotoUrl(null);
        user = userRepository.save(user);
        if (oldKey != null && !oldKey.isBlank()) {
            imageStorage.delete(oldKey);
        }
        return toUserDto(user);
    }

    /** The other devices are signed out; this one gets a new session. */
    public AuthResponse changePassword(Long userId, ChangePasswordDto dto) {
        User user = getUser(userId);
        if (!passwordEncoder.matches(dto.getCurrentPassword(), user.getPassword())) {
            throw new IllegalArgumentException("Current password is incorrect");
        }
        user.setPassword(passwordEncoder.encode(dto.getNewPassword()));
        user.setTokenVersion(user.getTokenVersion() + 1);
        return toAuthResponse(userRepository.save(user));
    }

    /** Every session of the account stops working, this one included. */
    public void signOutEverywhere(Long userId) {
        User user = getUser(userId);
        user.setTokenVersion(user.getTokenVersion() + 1);
        userRepository.save(user);
    }

    /** A samsar is found by email + phone when an owner shares a house, so his phone is mandatory. */
    private String validatePhone(String rawPhone, UserRole role) {
        String phone = PhoneUtils.normalize(rawPhone);
        if (phone == null) {
            if (role == UserRole.SAMSAR) {
                throw new IllegalArgumentException("Phone number is required for a samsar account");
            }
            return null;
        }
        if (phone.length() < 8 || phone.length() > 15) {
            throw new IllegalArgumentException("Phone number must contain at least 8 digits");
        }
        return phone;
    }

    private User getUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private AuthResponse toAuthResponse(User user) {
        String token = jwtService.generateToken(user.getId(), user.getEmail(), user.getRole().name(), user.getTokenVersion());
        return AuthResponse.builder()
                .accessToken(token)
                .user(toUserDto(user))
                .build();
    }

    private UserDto toUserDto(User user) {
        return UserDto.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .photoUrl(user.getPhotoUrl())
                .role(user.getRole().name())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
