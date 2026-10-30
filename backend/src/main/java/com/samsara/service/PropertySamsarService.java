package com.samsara.service;

import com.samsara.dto.PropertySamsarInviteDto;
import com.samsara.entity.PropertySamsar;
import com.samsara.entity.Property;
import com.samsara.entity.User;
import com.samsara.entity.UserRole;
import com.samsara.repository.PropertySamsarRepository;
import com.samsara.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Objects;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class PropertySamsarService {

    private static final Set<Integer> ALLOWED_PRICE_INCREASES = Set.of(10, 20, 30);

    private final PropertySamsarRepository propertySamsarRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final AccessService accessService;

    @Transactional(readOnly = true)
    public List<PropertySamsar> findByProperty(Long propertyId, Long requesterId) {
        accessService.requireOwner(propertyId, requesterId);
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
        if (dto.getPropertyId() == null || dto.getEmail() == null || dto.getPhone() == null) {
            throw new IllegalArgumentException("Property, email and phone are required");
        }
        Property property = accessService.requireOwner(dto.getPropertyId(), ownerId);

        // Both email and phone must match the same account, whatever the phone formatting
        String phone = PhoneUtils.normalize(dto.getPhone());
        User samsar = userRepository.findByEmailIgnoreCase(dto.getEmail().trim())
                .filter(u -> phone != null && Objects.equals(phone, PhoneUtils.normalize(u.getPhone())))
                .orElseThrow(() -> new RuntimeException("Samsar not found with that email and phone"));
        if (samsar.getRole() != UserRole.SAMSAR) {
            throw new IllegalArgumentException("This account is not a samsar account");
        }

        if (propertySamsarRepository.existsByPropertyIdAndSamsarId(property.getId(), samsar.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Samsar already assigned to this property");
        }

        Integer priceIncreaseTnd = dto.getPriceIncreaseTnd() != null ? dto.getPriceIncreaseTnd() : 10;
        if (!ALLOWED_PRICE_INCREASES.contains(priceIncreaseTnd)) {
            throw new IllegalArgumentException("Allowed price increases are only 10, 20, or 30 TND");
        }

        PropertySamsar saved = propertySamsarRepository.save(PropertySamsar.builder()
                .propertyId(property.getId())
                .samsarId(samsar.getId())
                .priceIncreaseTnd(priceIncreaseTnd)
                .build());
        User owner = userRepository.findById(ownerId)
                .orElseThrow(() -> new RuntimeException("Owner not found"));
        notificationService.sendPropertyAssignment(samsar.getId(), property, owner);
        return saved;
    }

    /** Only the owner decides the margin granted to a samsar. */
    @Transactional
    public PropertySamsar updatePriceIncrease(Long propertyId, Long samsarId, Integer priceIncreaseTnd, Long requesterId) {
        if (priceIncreaseTnd == null || !ALLOWED_PRICE_INCREASES.contains(priceIncreaseTnd)) {
            throw new IllegalArgumentException("Allowed price increases are only 10, 20, or 30 TND");
        }
        accessService.requireOwner(propertyId, requesterId);

        PropertySamsar relation = propertySamsarRepository.findByPropertyIdAndSamsarId(propertyId, samsarId)
                .orElseThrow(() -> new RuntimeException("Shared property link not found"));
        relation.setPriceIncreaseTnd(priceIncreaseTnd);
        return propertySamsarRepository.save(relation);
    }

    /** The owner can revoke a samsar, and a samsar can leave a property himself. */
    @Transactional
    public void remove(Long propertyId, Long samsarId, Long requesterId) {
        Property property = accessService.getProperty(propertyId);
        if (!accessService.isOwner(property, requesterId) && !requesterId.equals(samsarId)) {
            throw new AccessDeniedException("Not allowed to remove this samsar");
        }
        propertySamsarRepository.findByPropertyIdAndSamsarId(propertyId, samsarId)
                .ifPresent(propertySamsarRepository::delete);
    }

    @Transactional
    public void removeSamsarFromAllOwnerProperties(Long samsarId, Long ownerId) {
        propertySamsarRepository.deleteBySamsarIdAndPropertyCreatedBy(samsarId, ownerId);
    }
}
