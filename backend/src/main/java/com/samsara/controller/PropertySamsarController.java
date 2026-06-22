package com.samsara.controller;

import com.samsara.dto.PropertySamsarInviteDto;
import com.samsara.dto.PropertySamsarPriceUpdateDto;
import com.samsara.entity.PropertySamsar;
import com.samsara.service.PropertySamsarService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/property-samsars")
@RequiredArgsConstructor
public class PropertySamsarController {

    private final PropertySamsarService propertySamsarService;

    @GetMapping
    public ResponseEntity<List<PropertySamsar>> findAll() {
        return ResponseEntity.ok(propertySamsarService.findAll());
    }

    @GetMapping("/samsar/{samsarId}")
    public ResponseEntity<List<PropertySamsar>> findBySamsar(@PathVariable Long samsarId) {
        return ResponseEntity.ok(propertySamsarService.findBySamsar(samsarId));
    }

    @GetMapping("/property/{propertyId}")
    public ResponseEntity<List<PropertySamsar>> findByProperty(@PathVariable Long propertyId) {
        return ResponseEntity.ok(propertySamsarService.findByProperty(propertyId));
    }

    @GetMapping("/mine")
    public ResponseEntity<List<PropertySamsar>> findMine(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(propertySamsarService.findBySamsarUser(userId));
    }

    @PostMapping
    public ResponseEntity<PropertySamsar> invite(@RequestBody PropertySamsarInviteDto dto,
                                                 Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(propertySamsarService.invite(dto, userId));
    }

    @PatchMapping("/{propertyId}/{samsarId}/price-increase")
    public ResponseEntity<PropertySamsar> updatePriceIncrease(@PathVariable Long propertyId,
                                                              @PathVariable Long samsarId,
                                                              @RequestBody PropertySamsarPriceUpdateDto dto,
                                                              Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(propertySamsarService.updatePriceIncrease(propertyId, samsarId, dto.getPriceIncreaseTnd(), userId));
    }

    @DeleteMapping("/{propertyId}/{samsarId}")
    public ResponseEntity<Void> remove(@PathVariable Long propertyId, @PathVariable Long samsarId) {
        propertySamsarService.remove(propertyId, samsarId);
        return ResponseEntity.noContent().build();
    }
}
