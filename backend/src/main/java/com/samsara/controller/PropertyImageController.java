package com.samsara.controller;

import com.samsara.entity.PropertyImage;
import com.samsara.service.PropertyImageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/images")
@RequiredArgsConstructor
public class PropertyImageController {

    private final PropertyImageService propertyImageService;

    @GetMapping("/property/{propertyId}")
    public ResponseEntity<List<PropertyImage>> findByProperty(@PathVariable Long propertyId) {
        return ResponseEntity.ok(propertyImageService.findByProperty(propertyId));
    }

    @PostMapping
    public ResponseEntity<PropertyImage> upload(@RequestBody Map<String, Object> body, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        Long propertyId = Long.valueOf(body.get("propertyId").toString());
        String imagePath = (String) body.get("imagePath");
        Boolean isMain = Boolean.TRUE.equals(body.get("isMain"));
        Integer position = body.get("position") instanceof Number n ? n.intValue() : 0;
        return ResponseEntity.ok(propertyImageService.upload(propertyId, imagePath, isMain, position, userId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, Authentication authentication) {
        propertyImageService.delete(id, (Long) authentication.getPrincipal());
        return ResponseEntity.noContent().build();
    }
}
