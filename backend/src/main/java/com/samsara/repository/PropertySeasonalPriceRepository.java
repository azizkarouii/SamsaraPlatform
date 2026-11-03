package com.samsara.repository;

import com.samsara.entity.PropertySeasonalPrice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface PropertySeasonalPriceRepository extends JpaRepository<PropertySeasonalPrice, Long> {
    List<PropertySeasonalPrice> findByPropertyIdOrderByStartDateAsc(Long propertyId);

    @Modifying
    @Query("DELETE FROM PropertySeasonalPrice sp WHERE sp.propertyId = :propertyId")
    void deleteByPropertyId(@Param("propertyId") Long propertyId);
}
