package com.samsara.repository;

import com.samsara.entity.PropertyLink;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PropertyLinkRepository extends JpaRepository<PropertyLink, Long> {
    @Modifying
    @Query("DELETE FROM PropertyLink pl WHERE pl.propertyId = :propertyId")
    void deleteByPropertyId(@Param("propertyId") Long propertyId);
}
