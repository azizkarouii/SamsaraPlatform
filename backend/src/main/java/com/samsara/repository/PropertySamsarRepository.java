package com.samsara.repository;

import com.samsara.entity.PropertySamsar;
import com.samsara.entity.PropertySamsarId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface PropertySamsarRepository extends JpaRepository<PropertySamsar, PropertySamsarId> {
    @Query("SELECT ps FROM PropertySamsar ps JOIN FETCH ps.property JOIN FETCH ps.samsar WHERE ps.samsarId = :samsarId")
    List<PropertySamsar> findBySamsarId(@Param("samsarId") Long samsarId);

    @Query("SELECT ps FROM PropertySamsar ps JOIN FETCH ps.property JOIN FETCH ps.samsar WHERE ps.propertyId = :propertyId")
    List<PropertySamsar> findByPropertyId(@Param("propertyId") Long propertyId);

    boolean existsByPropertyIdAndSamsarId(Long propertyId, Long samsarId);

    @Query("SELECT ps FROM PropertySamsar ps JOIN FETCH ps.property JOIN FETCH ps.samsar WHERE ps.propertyId = :propertyId AND ps.samsarId = :samsarId")
    Optional<PropertySamsar> findByPropertyIdAndSamsarId(@Param("propertyId") Long propertyId, @Param("samsarId") Long samsarId);

    @Query("SELECT ps FROM PropertySamsar ps JOIN FETCH ps.property JOIN FETCH ps.samsar WHERE ps.property.createdBy = :userId")
    List<PropertySamsar> findByPropertyCreatedBy(@Param("userId") Long userId);

    @Modifying
    @Query("DELETE FROM PropertySamsar ps WHERE ps.samsarId = :samsarId AND ps.propertyId IN (SELECT p.id FROM Property p WHERE p.createdBy = :ownerId)")
    void deleteBySamsarIdAndPropertyCreatedBy(@Param("samsarId") Long samsarId, @Param("ownerId") Long ownerId);
}
