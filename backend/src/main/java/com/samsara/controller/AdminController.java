package com.samsara.controller;

import com.samsara.dto.AdminStatsDto;
import com.samsara.dto.AdminUserDto;
import com.samsara.dto.AdminUserRequest;
import com.samsara.service.AdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Accounts of the platform and its figures: superadmin only (see SecurityConfig). */
@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;

    @GetMapping("/stats")
    public AdminStatsDto stats() {
        return adminService.stats();
    }

    @GetMapping("/users")
    public List<AdminUserDto> users() {
        return adminService.listUsers();
    }

    @PostMapping("/users")
    public AdminUserDto create(@Valid @RequestBody AdminUserRequest request) {
        return adminService.create(request);
    }

    @PutMapping("/users/{id}")
    public AdminUserDto update(@PathVariable Long id, @Valid @RequestBody AdminUserRequest request) {
        return adminService.update(id, request);
    }

    @PatchMapping("/users/{id}/active")
    public AdminUserDto setActive(@PathVariable Long id, @RequestBody Map<String, Boolean> body) {
        return adminService.setActive(id, Boolean.TRUE.equals(body.get("active")));
    }

    @PatchMapping("/users/{id}/samsars")
    public AdminUserDto setSamsars(@PathVariable Long id, @RequestBody Map<String, Boolean> body) {
        return adminService.setSamsarsEnabled(id, Boolean.TRUE.equals(body.get("enabled")));
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        adminService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
