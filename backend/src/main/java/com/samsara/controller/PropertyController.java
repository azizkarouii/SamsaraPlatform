package com.samsara.controller;

import com.samsara.dto.PropertyDto;
import com.samsara.entity.Property;
import com.samsara.service.PropertyAvailabilityService;
import com.samsara.service.PropertyService;
import com.samsara.service.ReservationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/properties")
@RequiredArgsConstructor
public class PropertyController {

    private final PropertyService propertyService;
    private final ReservationService reservationService;
    private final PropertyAvailabilityService availabilityService;

    @GetMapping
    public ResponseEntity<List<Property>> findAll(@RequestParam(required = false) String date,
                                                  Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(date != null && !date.isEmpty()
                ? propertyService.findByCreatorAndDate(userId, date)
                : propertyService.findByCreator(userId));
    }

    /** Free properties on a period among those the current user owns or was shared. */
    @GetMapping("/available")
    public ResponseEntity<List<Property>> findAvailableBetween(@RequestParam String startDate,
                                                               @RequestParam String endDate,
                                                               Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(propertyService.findAvailableBetweenForUser(userId, startDate, endDate));
    }

    /** Public: anyone with the share link can see the property, but not the owner's phone. */
    @GetMapping("/{id}")
    public ResponseEntity<Property> findById(@PathVariable Long id, Authentication authentication) {
        Property property = propertyService.findById(id);
        if (authentication == null || !(authentication.getPrincipal() instanceof Long)) {
            property.setOwnerContact(null);
        }
        return ResponseEntity.ok(property);
    }

    /** Public: occupied periods and blocked days, without any client information. */
    @GetMapping("/{id}/occupancy")
    public ResponseEntity<Map<String, Object>> occupancy(@PathVariable Long id) {
        propertyService.findById(id);
        Map<String, Object> body = new HashMap<>();
        body.put("reservations", reservationService.findOccupancy(id));
        body.put("blockedDates", availabilityService.findBlockedDates(id));
        return ResponseEntity.ok(body);
    }

    @GetMapping("/mine")
    public ResponseEntity<List<Property>> findMine(@RequestParam(required = false) String date,
                                                   Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        if (date != null && !date.isEmpty()) {
            return ResponseEntity.ok(propertyService.findByCreatorAndDate(userId, date));
        }
        return ResponseEntity.ok(propertyService.findByCreator(userId));
    }

    @PostMapping
    public ResponseEntity<Property> create(@Valid @RequestBody PropertyDto dto,
                                           Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(propertyService.create(dto, userId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Property> update(@PathVariable Long id,
                                           @RequestBody PropertyDto dto,
                                           Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(propertyService.update(id, dto, userId));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<Property> patchUpdate(@PathVariable Long id,
                                                @RequestBody PropertyDto dto,
                                                Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(propertyService.update(id, dto, userId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        propertyService.delete(id, userId);
        return ResponseEntity.noContent().build();
    }
}
