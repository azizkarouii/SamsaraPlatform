package com.samsara.controller;

import com.samsara.entity.RevenueHistory;
import com.samsara.service.RevenueHistoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/revenues")
@RequiredArgsConstructor
public class RevenueHistoryController {

    private final RevenueHistoryService revenueHistoryService;

    @GetMapping("/mine")
    public ResponseEntity<List<RevenueHistory>> findMine(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(revenueHistoryService.findByUser(userId));
    }

    @GetMapping("/reservation/{reservationId}")
    public ResponseEntity<List<RevenueHistory>> findByReservation(@PathVariable Long reservationId,
                                                                  Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(revenueHistoryService.findByReservation(reservationId, userId));
    }
}
