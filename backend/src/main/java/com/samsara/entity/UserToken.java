package com.samsara.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * One-time link sent by email (password reset, email verification). Only the hash of the token is stored:
 * a database leak gives no usable link.
 */
@Entity
@Table(name = "user_tokens")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserToken {
    public static final String PASSWORD_RESET = "password_reset";
    public static final String EMAIL_VERIFICATION = "email_verification";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "token_hash", nullable = false, length = 64)
    private String tokenHash;

    @Column(nullable = false, length = 30)
    private String purpose;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "used_at")
    private LocalDateTime usedAt;
}
