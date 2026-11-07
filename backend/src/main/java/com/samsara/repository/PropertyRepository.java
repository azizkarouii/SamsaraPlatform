package com.samsara.repository;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Page;
import java.time.LocalDate;
import com.samsara.entity.Property;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

/** Availability searches: only confirmed / in-progress stays occupy a house, a pending request can be overridden. */
public interface PropertyRepository extends JpaRepository<Property, Long> {
    List<Property> findByCreatedBy(Long createdBy, Sort sort);

    long countByCreatedBy(Long createdBy);

    String OWNED_MATCHING = "p.createdBy = :userId AND (LOWER(p.title) LIKE :search OR LOWER(COALESCE(p.address, '')) LIKE :search "
            + "OR LOWER(COALESCE(p.configuration, '')) LIKE :search)";

    /** "My houses" screen: filtered, sorted and paged by the database. */
    @Query("SELECT p FROM Property p WHERE " + OWNED_MATCHING)
    Page<Property> findOwnedPage(@Param("userId") Long userId, @Param("search") String search, Pageable pageable);

    /** Same, limited to the houses free on a day. */
    @Query("SELECT p FROM Property p WHERE " + OWNED_MATCHING + " AND p.id NOT IN ("
            + "SELECT r.propertyId FROM Reservation r WHERE r.status IN ('confirmed', 'in-progress') "
            + "AND r.startDate <= :date AND r.endDate >= :date)")
    Page<Property> findOwnedFreeOnPage(@Param("userId") Long userId, @Param("search") String search,
                                       @Param("date") LocalDate date, Pageable pageable);

    /**
     * Takes a row lock until the end of the transaction: checks then writes on a house's calendar run one at a
     * time, so two simultaneous bookings cannot both pass the overlap check.
     */
    @Query(value = "SELECT id FROM properties WHERE id = :id FOR UPDATE", nativeQuery = true)
    Long lockById(@Param("id") Long id);

    @Query("SELECT DISTINCT p FROM Property p WHERE p.id NOT IN (" +
        "SELECT r.property.id FROM Reservation r " +
        "WHERE r.status IN ('confirmed', 'in-progress') " +
        "AND r.startDate <= :endDate AND r.endDate >= :startDate) " +
        "AND p.id NOT IN (" +
        "SELECT pa.property.id FROM PropertyAvailability pa " +
        "WHERE pa.status <> 'available' " +
        "AND pa.date BETWEEN :startDate AND :endDate)")
    List<Property> findAvailableBetween(@Param("startDate") LocalDate startDate,
                         @Param("endDate") LocalDate endDate,
                         Sort sort);

    @Query("SELECT DISTINCT p FROM Property p WHERE p.createdBy = :createdBy AND p.id NOT IN (" +
        "SELECT r.property.id FROM Reservation r " +
        "WHERE r.status IN ('confirmed', 'in-progress') " +
        "AND r.startDate <= :endDate AND r.endDate >= :startDate) " +
        "AND p.id NOT IN (" +
        "SELECT pa.property.id FROM PropertyAvailability pa " +
        "WHERE pa.status <> 'available' " +
        "AND pa.date BETWEEN :startDate AND :endDate)")
    List<Property> findAvailableBetweenByCreatedBy(@Param("startDate") LocalDate startDate,
                             @Param("endDate") LocalDate endDate,
                             @Param("createdBy") Long createdBy,
                             Sort sort);

    /** Properties the user can work with (owned or shared with him) that are free on the whole period. */
    @Query("SELECT DISTINCT p FROM Property p WHERE (p.createdBy = :userId OR p.id IN (" +
        "SELECT ps.propertyId FROM PropertySamsar ps WHERE ps.samsarId = :userId)) " +
        "AND p.id NOT IN (" +
        "SELECT r.propertyId FROM Reservation r " +
        "WHERE r.status IN ('confirmed', 'in-progress') " +
        "AND r.startDate <= :endDate AND r.endDate >= :startDate) " +
        "AND p.id NOT IN (" +
        "SELECT pa.propertyId FROM PropertyAvailability pa " +
        "WHERE pa.status <> 'available' " +
        "AND pa.date BETWEEN :startDate AND :endDate)")
    List<Property> findAvailableBetweenForUser(@Param("startDate") LocalDate startDate,
                             @Param("endDate") LocalDate endDate,
                             @Param("userId") Long userId,
                             Sort sort);

    @Query("SELECT p FROM Property p WHERE p.createdBy = :createdBy AND p.id NOT IN (" +
        "SELECT r.property.id FROM Reservation r " +
        "WHERE r.status IN ('confirmed', 'in-progress') " +
        "AND r.startDate <= :date AND r.endDate >= :date)")
    List<Property> findAvailableOnDateByCreatedBy(@Param("date") LocalDate date,
                             @Param("createdBy") Long createdBy,
                             Sort sort);

    @Query("SELECT p FROM Property p WHERE p.id NOT IN (" +
           "SELECT r.property.id FROM Reservation r " +
           "WHERE r.status IN ('confirmed', 'in-progress') " +
           "AND r.startDate <= :date AND r.endDate >= :date)")
    List<Property> findAvailableOnDate(@Param("date") LocalDate date);
}
