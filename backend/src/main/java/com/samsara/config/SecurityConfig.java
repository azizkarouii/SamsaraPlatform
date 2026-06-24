package com.samsara.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
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
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/auth/register", "/auth/login").permitAll()
                .requestMatchers(HttpMethod.GET, "/properties", "/properties/*").permitAll()
                .requestMatchers("/properties/mine").authenticated()
                .requestMatchers(HttpMethod.POST, "/properties").hasRole("PROPRIETAIRE")
                .requestMatchers(HttpMethod.PUT, "/properties/*").hasRole("PROPRIETAIRE")
                .requestMatchers(HttpMethod.DELETE, "/properties/*").hasRole("PROPRIETAIRE")
                .requestMatchers(HttpMethod.POST, "/property-samsars").hasRole("PROPRIETAIRE")
                .requestMatchers("/notifications/**").authenticated()
                .requestMatchers("/reservations/**").authenticated()
                .requestMatchers("/property-samsars/**").authenticated()
                .requestMatchers("/property-availability/**").authenticated()
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
