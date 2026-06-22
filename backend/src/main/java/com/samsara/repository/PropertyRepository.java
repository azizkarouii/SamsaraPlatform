package com.samsara.repository;

import com.samsara.entity.Property;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface PropertyRepository extends JpaRepository<Property, Long> {
    List<Property> findByCreatedBy(Long createdBy, Sort sort);

    @Query("SELECT p FROM Property p WHERE p.createdBy = :createdBy AND p.id NOT IN (" +
        "SELECT r.property.id FROM Reservation r " +
        "WHERE r.status NOT IN ('cancelled', 'completed') " +
        "AND r.startDate <= :date AND r.endDate >= :date)")
    List<Property> findAvailableOnDateByCreatedBy(@Param("date") String date,
                             @Param("createdBy") Long createdBy,
                             Sort sort);

    @Query("SELECT p FROM Property p WHERE p.id NOT IN (" +
           "SELECT r.property.id FROM Reservation r " +
           "WHERE r.status NOT IN ('cancelled', 'completed') " +
           "AND r.startDate <= :date AND r.endDate >= :date)")
    List<Property> findAvailableOnDate(@Param("date") String date);
}
