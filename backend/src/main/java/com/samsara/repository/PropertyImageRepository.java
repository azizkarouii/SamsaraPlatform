package com.samsara.repository;

import com.samsara.entity.PropertyImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface PropertyImageRepository extends JpaRepository<PropertyImage, Long> {
    List<PropertyImage> findByPropertyIdOrderByPositionAscIdAsc(Long propertyId);

    long countByPropertyId(Long propertyId);

    @Modifying
    @Query("DELETE FROM PropertyImage pi WHERE pi.propertyId = :propertyId")
    void deleteByPropertyId(@Param("propertyId") Long propertyId);
}
