package com.samsara.service;

import com.samsara.dto.PropertySamsarInviteDto;
import com.samsara.entity.PropertySamsar;
import com.samsara.entity.Property;
import com.samsara.entity.User;
import com.samsara.repository.PropertySamsarRepository;
import com.samsara.repository.PropertyRepository;
import com.samsara.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class PropertySamsarService {

    private static final Set<Integer> ALLOWED_PRICE_INCREASES = Set.of(10, 20, 30);

    private final PropertySamsarRepository propertySamsarRepository;
    private final PropertyRepository propertyRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    @Transactional(readOnly = true)
    public List<PropertySamsar> findAll() {
        return propertySamsarRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<PropertySamsar> findBySamsar(Long samsarId) {
        return propertySamsarRepository.findBySamsarId(samsarId);
    }

    @Transactional(readOnly = true)
    public List<PropertySamsar> findByProperty(Long propertyId) {
        return propertySamsarRepository.findByPropertyId(propertyId);
    }

    @Transactional(readOnly = true)
    public List<PropertySamsar> findBySamsarUser(Long samsarId) {
        return propertySamsarRepository.findBySamsarId(samsarId);
    }

    @Transactional(readOnly = true)
    public List<PropertySamsar> findByOwner(Long ownerId) {
        return propertySamsarRepository.findByPropertyCreatedBy(ownerId);
    }

    @Transactional
    public PropertySamsar invite(PropertySamsarInviteDto dto, Long ownerId) {
        Property property = propertyRepository.findById(dto.getPropertyId())
                .orElseThrow(() -> new RuntimeException("Property not found"));
        if (!ownerId.equals(property.getCreatedBy())) {
            throw new RuntimeException("Only the property owner can assign a samsar");
        }

        User samsar = userRepository.findByEmailAndPhone(dto.getEmail(), dto.getPhone())
                .orElseThrow(() -> new RuntimeException("Samsar not found with that email and phone"));

        if (propertySamsarRepository.existsByPropertyIdAndSamsarId(property.getId(), samsar.getId())) {
            throw new RuntimeException("Samsar already assigned to this property");
        }

        Integer priceIncreaseTnd = dto.getPriceIncreaseTnd();
        if (priceIncreaseTnd != null && !ALLOWED_PRICE_INCREASES.contains(priceIncreaseTnd)) {
            throw new RuntimeException("Allowed price increases are only 10, 20, or 30 TND");
        }

        PropertySamsar ps = PropertySamsar.builder()
                .propertyId(property.getId())
                .samsarId(samsar.getId())
                .priceIncreaseTnd(priceIncreaseTnd)
                .build();
        PropertySamsar saved = propertySamsarRepository.save(ps);
            User owner = userRepository.findById(ownerId)
                .orElseThrow(() -> new RuntimeException("Owner not found"));
            notificationService.sendPropertyAssignment(samsar.getId(), property, owner);
        return saved;
    }

    @Transactional
    public PropertySamsar updatePriceIncrease(Long propertyId, Long samsarId, Integer priceIncreaseTnd, Long requesterId) {
        if (priceIncreaseTnd == null || !ALLOWED_PRICE_INCREASES.contains(priceIncreaseTnd)) {
            throw new RuntimeException("Allowed price increases are only 10, 20, or 30 TND");
        }

        PropertySamsar relation = propertySamsarRepository.findByPropertyIdAndSamsarId(propertyId, samsarId)
                .orElseThrow(() -> new RuntimeException("Shared property link not found"));

        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new RuntimeException("Property not found"));
        if (!requesterId.equals(property.getCreatedBy()) && !requesterId.equals(samsarId)) {
            throw new RuntimeException("Not allowed to update this price increase");
        }

        relation.setPriceIncreaseTnd(priceIncreaseTnd);
        return propertySamsarRepository.save(relation);
    }

    public void remove(Long propertyId, Long samsarId) {
        propertySamsarRepository.findByPropertyIdAndSamsarId(propertyId, samsarId)
                .ifPresent(propertySamsarRepository::delete);
    }

    @Transactional
    public void removeSamsarFromAllOwnerProperties(Long samsarId, Long ownerId) {
        propertySamsarRepository.deleteBySamsarIdAndPropertyCreatedBy(samsarId, ownerId);
    }
}
