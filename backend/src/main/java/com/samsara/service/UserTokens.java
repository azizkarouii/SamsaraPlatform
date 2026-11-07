package com.samsara.service;

import com.samsara.entity.UserToken;
import com.samsara.repository.UserTokenRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;

/** One-time links sent by email: only their hash is stored, and each can be used once before it expires. */
@Component
@RequiredArgsConstructor
public class UserTokens {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserTokenRepository tokenRepository;

    /** Replaces any previous link of the same purpose and returns the new token to put in the link. */
    public String issue(Long userId, String purpose, Duration validity) {
        byte[] random = new byte[32];
        RANDOM.nextBytes(random);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(random);
        tokenRepository.deleteByUserIdAndPurpose(userId, purpose);
        tokenRepository.save(UserToken.builder()
                .userId(userId)
                .tokenHash(hash(token))
                .purpose(purpose)
                .expiresAt(LocalDateTime.now().plus(validity))
                .build());
        return token;
    }

    /** The user the link belongs to, if it is valid; the link cannot be used again afterwards. */
    public Optional<Long> consume(String token, String purpose) {
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }
        return tokenRepository.findByTokenHashAndPurpose(hash(token), purpose)
                .filter(t -> t.getUsedAt() == null && t.getExpiresAt().isAfter(LocalDateTime.now()))
                .map(t -> {
                    t.setUsedAt(LocalDateTime.now());
                    tokenRepository.save(t);
                    return t.getUserId();
                });
    }

    private static String hash(String token) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
