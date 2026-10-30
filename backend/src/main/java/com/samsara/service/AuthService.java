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
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

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

        user = userRepository.save(user);
        return toAuthResponse(user);
    }

    public AuthResponse login(LoginDto dto) {
        User user = userRepository.findByEmailIgnoreCase(dto.getEmail().trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));

        if (!passwordEncoder.matches(dto.getPassword(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
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

    public void changePassword(Long userId, ChangePasswordDto dto) {
        User user = getUser(userId);
        if (!passwordEncoder.matches(dto.getCurrentPassword(), user.getPassword())) {
            throw new IllegalArgumentException("Current password is incorrect");
        }
        user.setPassword(passwordEncoder.encode(dto.getNewPassword()));
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
        String token = jwtService.generateToken(user.getId(), user.getEmail(), user.getRole().name());
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
