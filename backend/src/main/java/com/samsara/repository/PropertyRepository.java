package com.samsara.repository;

import com.samsara.entity.Property;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface PropertyRepository extends JpaRepository<Property, Long> {
    List<Property> findByCreatedBy(Long createdBy, Sort sort);

    @Query("SELECT DISTINCT p FROM Property p WHERE p.id NOT IN (" +
        "SELECT r.property.id FROM Reservation r " +
        "WHERE r.status IN ('pending', 'confirmed', 'in-progress') " +
        "AND r.startDate <= :endDate AND r.endDate >= :startDate) " +
        "AND p.id NOT IN (" +
        "SELECT pa.property.id FROM PropertyAvailability pa " +
        "WHERE pa.status <> 'available' " +
        "AND pa.date BETWEEN :startDate AND :endDate)")
    List<Property> findAvailableBetween(@Param("startDate") String startDate,
                         @Param("endDate") String endDate,
                         Sort sort);

    @Query("SELECT DISTINCT p FROM Property p WHERE p.createdBy = :createdBy AND p.id NOT IN (" +
        "SELECT r.property.id FROM Reservation r " +
        "WHERE r.status IN ('pending', 'confirmed', 'in-progress') " +
        "AND r.startDate <= :endDate AND r.endDate >= :startDate) " +
        "AND p.id NOT IN (" +
        "SELECT pa.property.id FROM PropertyAvailability pa " +
        "WHERE pa.status <> 'available' " +
        "AND pa.date BETWEEN :startDate AND :endDate)")
    List<Property> findAvailableBetweenByCreatedBy(@Param("startDate") String startDate,
                             @Param("endDate") String endDate,
                             @Param("createdBy") Long createdBy,
                             Sort sort);

    /** Properties the user can work with (owned or shared with him) that are free on the whole period. */
    @Query("SELECT DISTINCT p FROM Property p WHERE (p.createdBy = :userId OR p.id IN (" +
        "SELECT ps.propertyId FROM PropertySamsar ps WHERE ps.samsarId = :userId)) " +
        "AND p.id NOT IN (" +
        "SELECT r.propertyId FROM Reservation r " +
        "WHERE r.status IN ('pending', 'confirmed', 'in-progress') " +
        "AND r.startDate <= :endDate AND r.endDate >= :startDate) " +
        "AND p.id NOT IN (" +
        "SELECT pa.propertyId FROM PropertyAvailability pa " +
        "WHERE pa.status <> 'available' " +
        "AND pa.date BETWEEN :startDate AND :endDate)")
    List<Property> findAvailableBetweenForUser(@Param("startDate") String startDate,
                             @Param("endDate") String endDate,
                             @Param("userId") Long userId,
                             Sort sort);

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
