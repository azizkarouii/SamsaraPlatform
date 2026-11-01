package com.samsara.controller;

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

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterDto dto) {
        return ResponseEntity.ok(authService.register(dto));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginDto dto) {
        return ResponseEntity.ok(authService.login(dto));
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
    public ResponseEntity<Void> changePassword(@Valid @RequestBody ChangePasswordDto dto,
                                               Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        authService.changePassword(userId, dto);
        return ResponseEntity.noContent().build();
    }
}
