package com.samsara.repository;

import com.samsara.entity.PropertySamsar;
import com.samsara.entity.PropertySamsarId;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface PropertySamsarRepository extends JpaRepository<PropertySamsar, PropertySamsarId> {
    List<PropertySamsar> findBySamsarId(Long samsarId);
    List<PropertySamsar> findByPropertyId(Long propertyId);
    boolean existsByPropertyIdAndSamsarId(Long propertyId, Long samsarId);
    Optional<PropertySamsar> findByPropertyIdAndSamsarId(Long propertyId, Long samsarId);
}
