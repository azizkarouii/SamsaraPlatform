package com.samsara.controller;

import com.samsara.dto.PropertyDto;
import com.samsara.entity.Property;
import com.samsara.service.PropertyService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/properties")
@RequiredArgsConstructor
public class PropertyController {

    private final PropertyService propertyService;

    @GetMapping
    public ResponseEntity<List<Property>> findAll(@RequestParam(required = false) String date) {
        if (date != null && !date.isEmpty()) {
            return ResponseEntity.ok(propertyService.findAvailableOnDate(date));
        }
        return ResponseEntity.ok(propertyService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Property> findById(@PathVariable Long id) {
        return ResponseEntity.ok(propertyService.findById(id));
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
    public ResponseEntity<Property> create(@RequestBody PropertyDto dto,
                                           Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(propertyService.create(dto, userId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Property> update(@PathVariable Long id,
                                           @RequestBody PropertyDto dto) {
        return ResponseEntity.ok(propertyService.update(id, dto));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<Property> patchUpdate(@PathVariable Long id,
                                                @RequestBody PropertyDto dto) {
        return ResponseEntity.ok(propertyService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        propertyService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
