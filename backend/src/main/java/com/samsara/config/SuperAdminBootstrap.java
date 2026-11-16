package com.samsara.config;

import com.samsara.entity.User;
import com.samsara.entity.UserRole;
import com.samsara.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Optional: with SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD set, that superadmin is created at startup if no
 * account has this email yet (handy for a fresh database, the tests and the CI). Otherwise, insert him by SQL.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SuperAdminBootstrap implements ApplicationRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${application.superadmin.email:}")
    private String email;

    @Value("${application.superadmin.password:}")
    private String password;

    @Override
    public void run(ApplicationArguments args) {
        if (email == null || email.isBlank() || password == null || password.isBlank()
                || userRepository.existsByEmailIgnoreCase(email.trim())) {
            return;
        }
        userRepository.save(User.builder()
                .name("Super Admin")
                .email(email.trim().toLowerCase())
                .password(passwordEncoder.encode(password))
                .role(UserRole.SUPERADMIN)
                .emailVerified(true)
                .build());
        log.info("Superadmin {} created", email.trim().toLowerCase());
    }
}
