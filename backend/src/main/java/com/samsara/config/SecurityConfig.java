package com.samsara.config;

import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> {})
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(ex -> ex
                // Missing/expired token must answer 401 so the frontend can redirect to login
                .authenticationEntryPoint((request, response, authException) -> {
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                    response.getWriter().write("{\"message\":\"Authentication required\"}");
                }))
            .authorizeHttpRequests(auth -> auth
                // Error dispatches carry no JWT: without this, every 403/404 would be turned into a 401
                .requestMatchers("/error").permitAll()
                .requestMatchers("/auth/register", "/auth/login").permitAll()
                .requestMatchers("/properties/mine", "/properties/available").authenticated()
                .requestMatchers(HttpMethod.GET, "/properties/*", "/properties/*/occupancy").permitAll()
                .requestMatchers(HttpMethod.POST, "/properties").hasRole("PROPRIETAIRE")
                .requestMatchers(HttpMethod.PUT, "/properties/*").hasRole("PROPRIETAIRE")
                .requestMatchers(HttpMethod.PATCH, "/properties/*").hasRole("PROPRIETAIRE")
                .requestMatchers(HttpMethod.DELETE, "/properties/*").hasRole("PROPRIETAIRE")
                .requestMatchers(HttpMethod.POST, "/property-samsars").hasRole("PROPRIETAIRE")
                .requestMatchers(HttpMethod.POST, "/availabilities", "/availabilities/range").hasRole("PROPRIETAIRE")
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
