package com.samsara.service;

import com.samsara.entity.User;
import com.samsara.entity.UserToken;
import com.samsara.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class PasswordResetService {

    private static final int MAX_REQUESTS_PER_WINDOW = 3;
    private static final Duration VALIDITY = Duration.ofHours(1);

    private static final Map<String, String[]> EMAILS = Map.of(
            "fr", new String[]{"Réinitialisation de votre mot de passe Samsara",
                    "Bonjour %s,\n\nPour choisir un nouveau mot de passe, ouvrez ce lien (valable 1 heure) :\n%s\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez ce message."},
            "en", new String[]{"Reset your Samsara password",
                    "Hello %s,\n\nTo choose a new password, open this link (valid for 1 hour):\n%s\n\nIf you did not ask for this, ignore this message."},
            "ar", new String[]{"إعادة تعيين كلمة مرور Samsara",
                    "مرحبًا %s،\n\nلاختيار كلمة مرور جديدة، افتح هذا الرابط (صالح لمدة ساعة):\n%s\n\nإذا لم تطلب ذلك، فتجاهل هذه الرسالة."});

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AttemptLimiter attemptLimiter;
    private final UserTokens userTokens;
    private final MailService mailService;

    @Value("${application.frontend-url}")
    private String frontendUrl;

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
        String token = userTokens.issue(user.getId(), UserToken.PASSWORD_RESET, VALIDITY);
        String[] content = EMAILS.getOrDefault(language == null ? "fr" : language, EMAILS.get("fr"));
        mailService.send(user.getEmail(), content[0], String.format(content[1], user.getName(), frontendUrl + "/reset-password?token=" + token));
    }

    /** A new password also signs out every device, and confirms the email (the link reached its inbox). */
    @Transactional
    public void reset(String token, String newPassword) {
        Long userId = userTokens.consume(token, UserToken.PASSWORD_RESET)
                .orElseThrow(() -> new IllegalArgumentException("This reset link is invalid or has expired"));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("This reset link is invalid or has expired"));
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setEmailVerified(true);
        user.setTokenVersion(user.getTokenVersion() + 1);
        userRepository.save(user);
    }
}
