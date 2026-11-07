package com.samsara.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * The session token travels in an HttpOnly cookie: page scripts cannot read it, so a script injected in the
 * page cannot steal it. SameSite=Lax keeps other sites from sending it.
 */
@Component
public class AuthCookies {

    public static final String NAME = "samsara_token";

    @Value("${application.auth.cookie-secure:true}")
    private boolean secure;

    @Value("${application.jwt.expiration}")
    private long expirationMs;

    @Value("${server.servlet.context-path:/}")
    private String path;

    public ResponseCookie session(String token) {
        return base(token).maxAge(Duration.ofMillis(expirationMs)).build();
    }

    public ResponseCookie cleared() {
        return base("").maxAge(0).build();
    }

    private ResponseCookie.ResponseCookieBuilder base(String value) {
        return ResponseCookie.from(NAME, value)
                .httpOnly(true)
                .secure(secure)
                .sameSite("Lax")
                .path(path == null || path.isBlank() ? "/" : path);
    }
}
