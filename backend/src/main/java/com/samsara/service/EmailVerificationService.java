package com.samsara.service;

import com.samsara.entity.User;
import com.samsara.entity.UserToken;
import com.samsara.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.util.Map;

/** A new account must open a link sent to its email before signing in: nobody can sign up with someone else's address. */
@Service
@RequiredArgsConstructor
public class EmailVerificationService {

    private static final int MAX_SENDS_PER_WINDOW = 3;
    private static final Duration VALIDITY = Duration.ofHours(24);

    private static final Map<String, String[]> EMAILS = Map.of(
            "fr", new String[]{"Confirmez votre adresse email Samsara",
                    "Bonjour %s,\n\nPour activer votre compte Samsara, ouvrez ce lien (valable 24 heures) :\n%s\n\nSi vous n'avez pas créé de compte, ignorez ce message."},
            "en", new String[]{"Confirm your Samsara email address",
                    "Hello %s,\n\nTo activate your Samsara account, open this link (valid for 24 hours):\n%s\n\nIf you did not create an account, ignore this message."},
            "ar", new String[]{"أكّد بريدك الإلكتروني في Samsara",
                    "مرحبًا %s،\n\nلتفعيل حسابك في Samsara، افتح هذا الرابط (صالح لمدة 24 ساعة):\n%s\n\nإذا لم تنشئ حسابًا، فتجاهل هذه الرسالة."});

    private final UserRepository userRepository;
    private final UserTokens userTokens;
    private final MailService mailService;
    private final AttemptLimiter attemptLimiter;

    @Value("${application.frontend-url}")
    private String frontendUrl;

    @Value("${application.auth.email-verification:true}")
    private boolean enabled;

    public boolean isEnabled() {
        return enabled;
    }

    @Transactional
    public void sendLink(User user, String language) {
        String token = userTokens.issue(user.getId(), UserToken.EMAIL_VERIFICATION, VALIDITY);
        String[] content = EMAILS.getOrDefault(language == null ? "fr" : language, EMAILS.get("fr"));
        mailService.send(user.getEmail(), content[0], String.format(content[1], user.getName(), frontendUrl + "/verify-email?token=" + token));
    }

    /** Answers the same way whatever the email, so accounts cannot be discovered through this form. */
    @Transactional
    public void resend(String email, String language) {
        String normalized = email.trim().toLowerCase();
        String limitKey = "verify:" + normalized;
        if (attemptLimiter.isBlocked(limitKey, MAX_SENDS_PER_WINDOW)) {
            return;
        }
        attemptLimiter.record(limitKey);
        userRepository.findByEmailIgnoreCase(normalized)
                .filter(user -> !Boolean.TRUE.equals(user.getEmailVerified()))
                .ifPresent(user -> sendLink(user, language));
    }

    @Transactional
    public void verify(String token) {
        Long userId = userTokens.consume(token, UserToken.EMAIL_VERIFICATION)
                .orElseThrow(() -> new IllegalArgumentException("This verification link is invalid or has expired"));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("This verification link is invalid or has expired"));
        user.setEmailVerified(true);
        userRepository.save(user);
    }
}
