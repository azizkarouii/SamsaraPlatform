package com.samsara.controller;

import com.samsara.entity.PropertyImage;
import com.samsara.service.PropertyImageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
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
    public ResponseEntity<PropertyImage> upload(@RequestBody Map<String, Object> body) {
        Long propertyId = Long.valueOf(body.get("propertyId").toString());
        String imagePath = (String) body.get("imagePath");
        Boolean isMain = body.containsKey("isMain") ? (Boolean) body.get("isMain") : false;
        Integer position = body.containsKey("position") ? (Integer) body.get("position") : 0;
        return ResponseEntity.ok(propertyImageService.upload(propertyId, imagePath, isMain, position));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        propertyImageService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
