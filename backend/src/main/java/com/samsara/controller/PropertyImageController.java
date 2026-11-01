package com.samsara.controller;

import com.samsara.entity.PropertyImage;
import com.samsara.service.PropertyImageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/** Photos of a property; the files themselves are served under /uploads/{imagePath}. */
@RestController
@RequestMapping("/properties/{propertyId}/images")
@RequiredArgsConstructor
public class PropertyImageController {

    private final PropertyImageService propertyImageService;

    /** Public, like the property page itself. */
    @GetMapping
    public ResponseEntity<List<PropertyImage>> findByProperty(@PathVariable Long propertyId) {
        return ResponseEntity.ok(propertyImageService.findByProperty(propertyId));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<List<PropertyImage>> upload(@PathVariable Long propertyId,
                                                      @RequestParam("files") List<MultipartFile> files,
                                                      Authentication authentication) {
        return ResponseEntity.ok(propertyImageService.upload(propertyId, files, (Long) authentication.getPrincipal()));
    }

    @PutMapping("/order")
    public ResponseEntity<List<PropertyImage>> reorder(@PathVariable Long propertyId,
                                                       @RequestBody List<Long> orderedIds,
                                                       Authentication authentication) {
        return ResponseEntity.ok(propertyImageService.reorder(propertyId, orderedIds, (Long) authentication.getPrincipal()));
    }

    @PutMapping(value = "/{imageId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<PropertyImage> replace(@PathVariable Long propertyId,
                                                 @PathVariable Long imageId,
                                                 @RequestParam("file") MultipartFile file,
                                                 Authentication authentication) {
        return ResponseEntity.ok(propertyImageService.replace(propertyId, imageId, file, (Long) authentication.getPrincipal()));
    }

    @DeleteMapping("/{imageId}")
    public ResponseEntity<List<PropertyImage>> delete(@PathVariable Long propertyId,
                                                      @PathVariable Long imageId,
                                                      Authentication authentication) {
        return ResponseEntity.ok(propertyImageService.delete(propertyId, imageId, (Long) authentication.getPrincipal()));
    }
}
