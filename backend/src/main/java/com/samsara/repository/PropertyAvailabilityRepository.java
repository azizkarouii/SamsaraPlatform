package com.samsara.repository;

import com.samsara.entity.PropertyAvailability;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface PropertyAvailabilityRepository extends JpaRepository<PropertyAvailability, Long> {
    List<PropertyAvailability> findByPropertyId(Long propertyId);
    Optional<PropertyAvailability> findByPropertyIdAndDate(Long propertyId, String date);
}
