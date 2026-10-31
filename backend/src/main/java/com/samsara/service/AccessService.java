package com.samsara.service;

import com.samsara.entity.Property;
import com.samsara.entity.Reservation;
import com.samsara.repository.PropertyRepository;
import com.samsara.repository.PropertySamsarRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

/**
 * Central ownership rules:
 * - a property is managed by its creator (PROPRIETAIRE);
 * - a samsar works on a property only once the owner shared it with him;
 * - a reservation is handled by the samsar who created it or the owner of the property;
 * - every samsar the property is shared with can read its reservations (he is notified about them).
 */
@Service
@RequiredArgsConstructor
public class AccessService {

    private final PropertyRepository propertyRepository;
    private final PropertySamsarRepository propertySamsarRepository;

    public Property getProperty(Long propertyId) {
        return propertyRepository.findById(propertyId)
                .orElseThrow(() -> new RuntimeException("Property not found"));
    }

    public boolean isOwner(Property property, Long userId) {
        return userId != null && userId.equals(property.getCreatedBy());
    }

    public boolean canWorkOn(Property property, Long userId) {
        return isOwner(property, userId)
                || propertySamsarRepository.existsByPropertyIdAndSamsarId(property.getId(), userId);
    }

    public Property requireOwner(Long propertyId, Long userId) {
        Property property = getProperty(propertyId);
        if (!isOwner(property, userId)) {
            throw new AccessDeniedException("Only the property owner can do this");
        }
        return property;
    }

    public Property requireWorkOn(Long propertyId, Long userId) {
        Property property = getProperty(propertyId);
        if (!canWorkOn(property, userId)) {
            throw new AccessDeniedException("You do not have access to this property");
        }
        return property;
    }

    /** Read access: the manager of the reservation, or any samsar working on the property. */
    public void requireReservationView(Reservation reservation, Long userId) {
        if (userId.equals(reservation.getSamsarId())) {
            return;
        }
        Property property = reservation.getProperty() != null
                ? reservation.getProperty()
                : getProperty(reservation.getPropertyId());
        if (!canWorkOn(property, userId)) {
            throw new AccessDeniedException("You do not have access to this reservation");
        }
    }

    /** Write access (edit, status, delete): the samsar who created it or the owner of the property. */
    public void requireReservationAccess(Reservation reservation, Long userId) {
        if (userId.equals(reservation.getSamsarId())) {
            return;
        }
        Property property = reservation.getProperty() != null
                ? reservation.getProperty()
                : getProperty(reservation.getPropertyId());
        if (!isOwner(property, userId)) {
            throw new AccessDeniedException("You do not have access to this reservation");
        }
    }
}
