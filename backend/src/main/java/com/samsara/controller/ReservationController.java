package com.samsara.controller;

import com.samsara.dto.ReservationDto;
import com.samsara.entity.Reservation;
import com.samsara.service.ReservationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/reservations")
@RequiredArgsConstructor
public class ReservationController {

    private final ReservationService reservationService;

    @GetMapping
    public ResponseEntity<List<Reservation>> findAll(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(reservationService.findVisibleTo(userId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Reservation> findById(@PathVariable Long id, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(reservationService.findById(id, userId));
    }

    @GetMapping("/mine")
    public ResponseEntity<List<Reservation>> findMine(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(reservationService.findBySamsar(userId));
    }

    @GetMapping("/by-owner")
    public ResponseEntity<List<Reservation>> findByOwner(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(reservationService.findByPropertyCreator(userId));
    }

    @GetMapping("/property/{propertyId}")
    public ResponseEntity<List<Reservation>> findByProperty(@PathVariable Long propertyId, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(reservationService.findByProperty(propertyId, userId));
    }

    @PostMapping
    public ResponseEntity<Reservation> create(@RequestBody ReservationDto dto,
                                              Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(reservationService.create(dto, userId));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<Reservation> update(@PathVariable Long id,
                                              @RequestBody ReservationDto dto,
                                              Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(reservationService.update(id, dto, userId));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<Reservation> updateStatus(@PathVariable Long id,
                                                    @RequestBody Map<String, String> body,
                                                    Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(reservationService.updateStatus(id, body.get("status"), userId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        reservationService.delete(id, userId);
        return ResponseEntity.noContent().build();
    }
}
