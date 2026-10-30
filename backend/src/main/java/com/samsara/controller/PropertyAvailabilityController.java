package com.samsara.controller;

import com.samsara.entity.PropertyAvailability;
import com.samsara.service.PropertyAvailabilityService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/availabilities")
@RequiredArgsConstructor
public class PropertyAvailabilityController {

    private final PropertyAvailabilityService availabilityService;

    @GetMapping("/property/{propertyId}")
    public ResponseEntity<List<PropertyAvailability>> findByProperty(@PathVariable Long propertyId,
                                                                     Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(availabilityService.findByProperty(propertyId, userId));
    }

    @PostMapping
    public ResponseEntity<PropertyAvailability> setAvailability(@RequestBody Map<String, Object> body,
                                                                Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        Long propertyId = readPropertyId(body);
        String date = (String) body.get("date");
        String status = (String) body.getOrDefault("status", "available");
        String notes = (String) body.get("notes");
        return ResponseEntity.ok(availabilityService.setAvailability(propertyId, date, status, notes, userId));
    }

    @PostMapping("/range")
    public ResponseEntity<List<PropertyAvailability>> setRange(@RequestBody Map<String, Object> body,
                                                               Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(availabilityService.setRange(
                readPropertyId(body),
                (String) body.get("startDate"),
                (String) body.get("endDate"),
                (String) body.getOrDefault("status", "unavailable"),
                (String) body.get("notes"),
                userId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        availabilityService.delete(id, userId);
        return ResponseEntity.noContent().build();
    }

    private Long readPropertyId(Map<String, Object> body) {
        Object value = body.get("propertyId");
        if (value == null) {
            throw new IllegalArgumentException("propertyId is required");
        }
        return Long.valueOf(value.toString());
    }
}
