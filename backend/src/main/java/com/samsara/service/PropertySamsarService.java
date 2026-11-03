package com.samsara.service;

import com.samsara.dto.PropertySamsarInviteDto;
import com.samsara.entity.PropertySamsar;
import com.samsara.entity.Property;
import com.samsara.entity.User;
import com.samsara.entity.UserRole;
import com.samsara.repository.PropertyRepository;
import com.samsara.repository.PropertySamsarRepository;
import com.samsara.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
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
    private static final Set<Integer> ALLOWED_COMMISSIONS = Set.of(10);

    private final PropertySamsarRepository propertySamsarRepository;
    private final PropertyRepository propertyRepository;
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
        User samsar = findSamsar(dto);

        if (propertySamsarRepository.existsByPropertyIdAndSamsarId(property.getId(), samsar.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Samsar already assigned to this property");
        }

        PropertySamsar relation = PropertySamsar.builder()
                .propertyId(property.getId())
                .samsarId(samsar.getId())
                .build();
        applyDeal(relation, requestedIncrease(dto), dto.getCommissionPercent());
        PropertySamsar saved = propertySamsarRepository.save(relation);
        User owner = userRepository.findById(ownerId)
                .orElseThrow(() -> new RuntimeException("Owner not found"));
        notificationService.sendPropertyAssignment(samsar.getId(), property, owner);
        return saved;
    }

    /** Shares every property of the owner with the samsar in one go; houses already shared are left untouched. */
    @Transactional
    public List<PropertySamsar> inviteToAllProperties(PropertySamsarInviteDto dto, Long ownerId) {
        if (dto.getEmail() == null || dto.getPhone() == null) {
            throw new IllegalArgumentException("Email and phone are required");
        }
        User samsar = findSamsar(dto);
        // Validated before anything is written, on a throwaway relation
        applyDeal(new PropertySamsar(), requestedIncrease(dto), dto.getCommissionPercent());

        List<Property> properties = propertyRepository.findByCreatedBy(ownerId, Sort.by("title"));
        if (properties.isEmpty()) {
            throw new IllegalArgumentException("You have no property to share");
        }
        List<Property> added = properties.stream()
                .filter(p -> !propertySamsarRepository.existsByPropertyIdAndSamsarId(p.getId(), samsar.getId()))
                .toList();
        if (added.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Samsar already assigned to all your properties");
        }

        List<PropertySamsar> saved = propertySamsarRepository.saveAll(added.stream()
                .map(p -> {
                    PropertySamsar relation = PropertySamsar.builder()
                            .propertyId(p.getId())
                            .samsarId(samsar.getId())
                            .build();
                    applyDeal(relation, requestedIncrease(dto), dto.getCommissionPercent());
                    return relation;
                })
                .toList());
        User owner = userRepository.findById(ownerId)
                .orElseThrow(() -> new RuntimeException("Owner not found"));
        notificationService.sendPropertiesAssignment(samsar.getId(), added, owner);
        return saved;
    }

    /** Both email and phone must match the same samsar account, whatever the phone formatting. */
    private User findSamsar(PropertySamsarInviteDto dto) {
        String phone = PhoneUtils.normalize(dto.getPhone());
        User samsar = userRepository.findByEmailIgnoreCase(dto.getEmail().trim())
                .filter(u -> phone != null && Objects.equals(phone, PhoneUtils.normalize(u.getPhone())))
                .orElseThrow(() -> new RuntimeException("Samsar not found with that email and phone"));
        if (samsar.getRole() != UserRole.SAMSAR) {
            throw new IllegalArgumentException("This account is not a samsar account");
        }
        return samsar;
    }

    /** An invitation naming no deal at all defaults to +10 TND per day. */
    private Integer requestedIncrease(PropertySamsarInviteDto dto) {
        return dto.getPriceIncreaseTnd() == null && dto.getCommissionPercent() == null
                ? Integer.valueOf(10)
                : dto.getPriceIncreaseTnd();
    }

    /** A samsar works either with a fixed margin per day (10, 20, 30 TND) or with a commission (10%), never both. */
    private void applyDeal(PropertySamsar relation, Integer priceIncreaseTnd, Integer commissionPercent) {
        if (commissionPercent != null) {
            if (priceIncreaseTnd != null || !ALLOWED_COMMISSIONS.contains(commissionPercent)) {
                throw new IllegalArgumentException("Allowed deals are 10, 20 or 30 TND per day, or a 10% commission");
            }
            relation.setCommissionPercent(commissionPercent);
            relation.setPriceIncreaseTnd(0);
            return;
        }
        if (priceIncreaseTnd == null || !ALLOWED_PRICE_INCREASES.contains(priceIncreaseTnd)) {
            throw new IllegalArgumentException("Allowed deals are 10, 20 or 30 TND per day, or a 10% commission");
        }
        relation.setCommissionPercent(null);
        relation.setPriceIncreaseTnd(priceIncreaseTnd);
    }

    /** Only the owner decides the margin granted to a samsar. */
    @Transactional
    public PropertySamsar updatePriceIncrease(Long propertyId, Long samsarId, Integer priceIncreaseTnd,
                                              Integer commissionPercent, Long requesterId) {
        accessService.requireOwner(propertyId, requesterId);

        PropertySamsar relation = propertySamsarRepository.findByPropertyIdAndSamsarId(propertyId, samsarId)
                .orElseThrow(() -> new RuntimeException("Shared property link not found"));
        applyDeal(relation, priceIncreaseTnd, commissionPercent);
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
