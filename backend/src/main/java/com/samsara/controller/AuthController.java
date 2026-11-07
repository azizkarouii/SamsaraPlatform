package com.samsara.controller;

import java.util.Map;
import org.springframework.http.HttpHeaders;
import com.samsara.service.EmailVerificationService;
import com.samsara.config.AuthCookies;
import com.samsara.dto.ForgotPasswordDto;
import com.samsara.dto.ResetPasswordDto;
import com.samsara.service.PasswordResetService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.MediaType;
import org.springframework.web.multipart.MultipartFile;
import com.samsara.dto.AuthResponse;
import com.samsara.dto.ChangePasswordDto;
import com.samsara.dto.LoginDto;
import com.samsara.dto.RegisterDto;
import com.samsara.dto.UpdateProfileDto;
import com.samsara.dto.UserDto;
import com.samsara.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final PasswordResetService passwordResetService;
    private final EmailVerificationService emailVerificationService;
    private final AuthCookies authCookies;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterDto dto) {
        return withSession(authService.register(dto));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginDto dto, HttpServletRequest request) {
        return withSession(authService.login(dto, request.getRemoteAddr()));
    }

    /** Signs this browser out (the cookie is erased). */
    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        return ResponseEntity.noContent().header(HttpHeaders.SET_COOKIE, authCookies.cleared().toString()).build();
    }

    @PostMapping("/logout-all")
    public ResponseEntity<Void> logoutEverywhere(Authentication authentication) {
        authService.signOutEverywhere((Long) authentication.getPrincipal());
        return logout();
    }

    @PostMapping("/verify-email")
    public ResponseEntity<Void> verifyEmail(@RequestBody Map<String, String> body) {
        emailVerificationService.verify(body.get("token"));
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/resend-verification")
    public ResponseEntity<Void> resendVerification(@RequestBody Map<String, String> body) {
        if (body.get("email") != null) {
            emailVerificationService.resend(body.get("email"), body.get("language"));
        }
        return ResponseEntity.noContent().build();
    }

    /** A response carrying a session also sets the HttpOnly cookie the browser will send with each call. */
    private ResponseEntity<AuthResponse> withSession(AuthResponse response) {
        if (response.getAccessToken() == null) {
            return ResponseEntity.ok(response);
        }
        return ResponseEntity.ok().header(HttpHeaders.SET_COOKIE, authCookies.session(response.getAccessToken()).toString()).body(response);
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Void> forgotPassword(@Valid @RequestBody ForgotPasswordDto dto) {
        passwordResetService.requestReset(dto.getEmail(), dto.getLanguage());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Void> resetPassword(@Valid @RequestBody ResetPasswordDto dto) {
        passwordResetService.reset(dto.getToken(), dto.getNewPassword());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/profile")
    public ResponseEntity<UserDto> profile(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(authService.getProfile(userId));
    }

    @PutMapping("/profile")
    public ResponseEntity<UserDto> updateProfile(@Valid @RequestBody UpdateProfileDto dto,
                                                 Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(authService.updateProfile(userId, dto));
    }

    @PutMapping(value = "/profile/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<UserDto> updatePhoto(@RequestParam("file") MultipartFile file,
                                               Authentication authentication) {
        return ResponseEntity.ok(authService.updatePhoto((Long) authentication.getPrincipal(), file));
    }

    @DeleteMapping("/profile/photo")
    public ResponseEntity<UserDto> removePhoto(Authentication authentication) {
        return ResponseEntity.ok(authService.removePhoto((Long) authentication.getPrincipal()));
    }

    @PutMapping("/password")
    public ResponseEntity<AuthResponse> changePassword(@Valid @RequestBody ChangePasswordDto dto,
                                                       Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return withSession(authService.changePassword(userId, dto));
    }
}
