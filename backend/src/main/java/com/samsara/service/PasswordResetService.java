package com.samsara.service;

import com.samsara.entity.PasswordResetToken;
import com.samsara.entity.User;
import com.samsara.repository.PasswordResetTokenRepository;
import com.samsara.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class PasswordResetService {

    private static final int MAX_REQUESTS_PER_WINDOW = 3;
    private static final int TOKEN_HOURS = 1;
    private static final SecureRandom RANDOM = new SecureRandom();

    private static final Map<String, String[]> EMAILS = Map.of(
            "fr", new String[]{"Réinitialisation de votre mot de passe Samsara",
                    "Bonjour %s,\n\nPour choisir un nouveau mot de passe, ouvrez ce lien (valable 1 heure) :\n%s\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez ce message."},
            "en", new String[]{"Reset your Samsara password",
                    "Hello %s,\n\nTo choose a new password, open this link (valid for 1 hour):\n%s\n\nIf you did not ask for this, ignore this message."},
            "ar", new String[]{"إعادة تعيين كلمة مرور Samsara",
                    "مرحبًا %s،\n\nلاختيار كلمة مرور جديدة، افتح هذا الرابط (صالح لمدة ساعة):\n%s\n\nإذا لم تطلب ذلك، فتجاهل هذه الرسالة."});

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final AttemptLimiter attemptLimiter;
    private final ObjectProvider<JavaMailSender> mailSender;

    @Value("${application.frontend-url}")
    private String frontendUrl;

    @Value("${application.mail.from}")
    private String mailFrom;

    /** Answers the same way whether the email exists or not, so accounts cannot be discovered through this form. */
    @Transactional
    public void requestReset(String email, String language) {
        String normalized = email.trim().toLowerCase();
        String limitKey = "forgot:" + normalized;
        if (attemptLimiter.isBlocked(limitKey, MAX_REQUESTS_PER_WINDOW)) {
            return;
        }
        attemptLimiter.record(limitKey);

        Optional<User> found = userRepository.findByEmailIgnoreCase(normalized);
        if (found.isEmpty()) {
            return;
        }
        User user = found.get();
        byte[] random = new byte[32];
        RANDOM.nextBytes(random);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(random);

        tokenRepository.deleteByUserId(user.getId());
        tokenRepository.save(PasswordResetToken.builder()
                .userId(user.getId())
                .tokenHash(hash(token))
                .expiresAt(LocalDateTime.now().plusHours(TOKEN_HOURS))
                .build());
        send(user, frontendUrl + "/reset-password?token=" + token, language);
    }

    @Transactional
    public void reset(String token, String newPassword) {
        PasswordResetToken stored = tokenRepository.findByTokenHash(hash(token))
                .filter(t -> t.getUsedAt() == null && t.getExpiresAt().isAfter(LocalDateTime.now()))
                .orElseThrow(() -> new IllegalArgumentException("This reset link is invalid or has expired"));
        User user = userRepository.findById(stored.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("This reset link is invalid or has expired"));
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        stored.setUsedAt(LocalDateTime.now());
        tokenRepository.save(stored);
    }

    private void send(User user, String link, String language) {
        JavaMailSender sender = mailSender.getIfAvailable();
        if (sender == null) {
            // Local development without a mail server: the link is only useful to whoever reads this server's log
            log.warn("No mail server configured (spring.mail.host). Password reset link for {}: {}", user.getEmail(), link);
            return;
        }
        String[] content = EMAILS.getOrDefault(language, EMAILS.get("fr"));
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(mailFrom);
        message.setTo(user.getEmail());
        message.setSubject(content[0]);
        message.setText(String.format(content[1], user.getName(), link));
        try {
            sender.send(message);
        } catch (MailException e) {
            log.error("Could not send the password reset email to {}", user.getEmail(), e);
        }
    }

    private static String hash(String token) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
