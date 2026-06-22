package com.samsara.controller;

import com.samsara.entity.PropertyAvailability;
import com.samsara.service.PropertyAvailabilityService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/availabilities")
@RequiredArgsConstructor
public class PropertyAvailabilityController {

    private final PropertyAvailabilityService availabilityService;

    @GetMapping("/property/{propertyId}")
    public ResponseEntity<List<PropertyAvailability>> findByProperty(@PathVariable Long propertyId) {
        return ResponseEntity.ok(availabilityService.findByProperty(propertyId));
    }

    @PostMapping
    public ResponseEntity<PropertyAvailability> setAvailability(@RequestBody Map<String, Object> body) {
        Long propertyId = Long.valueOf(body.get("propertyId").toString());
        String date = (String) body.get("date");
        String status = (String) body.getOrDefault("status", "available");
        String notes = (String) body.get("notes");
        return ResponseEntity.ok(availabilityService.setAvailability(propertyId, date, status, notes));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        availabilityService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
