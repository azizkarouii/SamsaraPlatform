package com.samsara.controller;

import java.math.BigDecimal;
import com.samsara.entity.ReservationPayment;
import com.samsara.entity.ReservationEvent;
import com.samsara.dto.ReservationPaymentDto;
import com.samsara.dto.ReservationDto;
import com.samsara.dto.ReservationPageDto;
import com.samsara.dto.ReservationEarning;
import com.samsara.dto.ReservationEarlyEndDto;
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

    @GetMapping("/page")
    public ResponseEntity<ReservationPageDto> findPage(@RequestParam(required = false) String status,
                                                       @RequestParam(required = false) String search,
                                                       @RequestParam(defaultValue = "0") int page,
                                                       @RequestParam(defaultValue = "10") int size,
                                                       @RequestParam(defaultValue = "startDate") String sort,
                                                       @RequestParam(defaultValue = "desc") String direction,
                                                       Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(reservationService.findPage(userId, status, search, page, size, sort, direction));
    }

    @GetMapping("/earnings")
    public ResponseEntity<List<ReservationEarning>> findEarnings(Authentication authentication) {
        return ResponseEntity.ok(reservationService.findEarnings((Long) authentication.getPrincipal()));
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
                                                    @RequestBody Map<String, Object> body,
                                                    Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(reservationService.updateStatus(id, String.valueOf(body.get("status")), userId));
    }

    @PostMapping("/{id}/early-end")
    public ResponseEntity<Reservation> endEarly(@PathVariable Long id,
                                                @RequestBody ReservationEarlyEndDto dto,
                                                Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(reservationService.endEarly(id, dto, userId));
    }

    @PutMapping("/{id}/refund")
    public ResponseEntity<Reservation> setRefund(@PathVariable Long id,
                                                 @RequestBody Map<String, BigDecimal> body,
                                                 Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(reservationService.setRefund(id, body.get("amount"), userId));
    }

    @GetMapping("/{id}/payments")
    public ResponseEntity<List<ReservationPayment>> findPayments(@PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(reservationService.findPayments(id, (Long) authentication.getPrincipal()));
    }

    @PostMapping("/{id}/payments")
    public ResponseEntity<ReservationPayment> addPayment(@PathVariable Long id, @RequestBody ReservationPaymentDto dto,
                                                         Authentication authentication) {
        return ResponseEntity.ok(reservationService.addPayment(id, dto, (Long) authentication.getPrincipal()));
    }

    @DeleteMapping("/{id}/payments/{paymentId}")
    public ResponseEntity<Void> removePayment(@PathVariable Long id, @PathVariable Long paymentId, Authentication authentication) {
        reservationService.removePayment(id, paymentId, (Long) authentication.getPrincipal());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/history")
    public ResponseEntity<List<ReservationEvent>> findHistory(@PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(reservationService.findEvents(id, (Long) authentication.getPrincipal()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        reservationService.delete(id, userId);
        return ResponseEntity.noContent().build();
    }
}
