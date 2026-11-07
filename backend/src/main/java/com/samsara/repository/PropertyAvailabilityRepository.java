package com.samsara.repository;

import java.time.LocalDate;
import com.samsara.entity.PropertyAvailability;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface PropertyAvailabilityRepository extends JpaRepository<PropertyAvailability, Long> {
    List<PropertyAvailability> findByPropertyIdOrderByDateAsc(Long propertyId);
    Optional<PropertyAvailability> findByPropertyIdAndDate(Long propertyId, LocalDate date);

    @Query("SELECT COUNT(pa) > 0 FROM PropertyAvailability pa WHERE pa.propertyId = :propertyId " +
           "AND pa.status <> 'available' AND pa.date BETWEEN :startDate AND :endDate")
    boolean existsBlockedBetween(@Param("propertyId") Long propertyId,
                                 @Param("startDate") LocalDate startDate,
                                 @Param("endDate") LocalDate endDate);

    @Modifying
    @Query("DELETE FROM PropertyAvailability pa WHERE pa.propertyId = :propertyId AND pa.date BETWEEN :startDate AND :endDate")
    void deleteByPropertyIdAndDateBetween(@Param("propertyId") Long propertyId,
                                          @Param("startDate") LocalDate startDate,
                                          @Param("endDate") LocalDate endDate);

    @Modifying
    @Query("DELETE FROM PropertyAvailability pa WHERE pa.propertyId = :propertyId")
    void deleteByPropertyId(@Param("propertyId") Long propertyId);
}
