package com.samsara.config;

import com.samsara.repository.UserRepository;
import com.samsara.service.JwtService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import java.util.Set;

/**
 * Reads the session from the HttpOnly cookie (browser) or the Authorization header (other clients).
 * A token is refused once the account's token version moved on (password changed, signed out everywhere).
 */
@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    /** Sent by the app on every call. A form posted from another site cannot add it, so cookies cannot be abused. */
    public static final String CSRF_HEADER = "X-Requested-With";
    private static final Set<String> SAFE_METHODS = Set.of("GET", "HEAD", "OPTIONS");

    private final JwtService jwtService;
    private final UserRepository userRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String authHeader = request.getHeader("Authorization");
        String token = authHeader != null && authHeader.startsWith("Bearer ") ? authHeader.substring(7) : cookieToken(request);
        boolean fromCookie = token != null && (authHeader == null || !authHeader.startsWith("Bearer "));
        if (token == null) {
            filterChain.doFilter(request, response);
            return;
        }
        if (fromCookie && !SAFE_METHODS.contains(request.getMethod()) && request.getHeader(CSRF_HEADER) == null) {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write("{\"message\":\"Access denied\"}");
            return;
        }

        Claims claims;
        try {
            claims = jwtService.parseToken(token);
        } catch (JwtException | IllegalArgumentException e) {
            filterChain.doFilter(request, response);
            return;
        }
        Long userId = claims.get("userId", Long.class);
        Integer version = claims.get("ver", Integer.class);
        boolean current = userId != null && userRepository.findById(userId)
                .map(user -> Objects.equals(user.getTokenVersion(), version == null ? 0 : version))
                .orElse(false);
        if (current) {
            SimpleGrantedAuthority authority = new SimpleGrantedAuthority("ROLE_" + claims.get("role", String.class));
            SecurityContextHolder.getContext().setAuthentication(
                    new UsernamePasswordAuthenticationToken(userId, null, List.of(authority)));
        }
        filterChain.doFilter(request, response);
    }

    private static String cookieToken(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }
        return Arrays.stream(cookies)
                .filter(c -> AuthCookies.NAME.equals(c.getName()) && c.getValue() != null && !c.getValue().isBlank())
                .map(Cookie::getValue)
                .findFirst()
                .orElse(null);
    }
}
