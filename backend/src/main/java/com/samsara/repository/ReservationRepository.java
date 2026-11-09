package com.samsara.repository;

import java.time.LocalDate;
import com.samsara.entity.Reservation;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface ReservationRepository extends JpaRepository<Reservation, Long> {

    /** Reminders: stays arriving or leaving on a given day. */
    List<Reservation> findByStatusAndStartDate(String status, LocalDate startDate);

    List<Reservation> findByStatusAndEndDate(String status, LocalDate endDate);
    String VISIBLE_TO_USER = "(r.samsarId = :userId OR p.createdBy = :userId "
            + "OR r.propertyId IN (SELECT ps.propertyId FROM PropertySamsar ps WHERE ps.samsarId = :userId))";
    String MATCHES_SEARCH = "(LOWER(r.clientName) LIKE :search OR LOWER(COALESCE(r.clientPhone, '')) LIKE :search "
            + "OR LOWER(p.title) LIKE :search)";

    /** One page of what a user can see; an empty status means every status. */
    @Query(value = "SELECT r FROM Reservation r JOIN FETCH r.property p JOIN FETCH r.samsar s WHERE " + VISIBLE_TO_USER
            + " AND " + MATCHES_SEARCH + " AND (:status = '' OR r.status = :status)",
           countQuery = "SELECT COUNT(r) FROM Reservation r JOIN r.property p WHERE " + VISIBLE_TO_USER
            + " AND " + MATCHES_SEARCH + " AND (:status = '' OR r.status = :status)")
    Page<Reservation> findPage(@Param("userId") Long userId, @Param("status") String status,
                               @Param("search") String search, Pageable pageable);

    @Query("SELECT r.status, COUNT(r) FROM Reservation r JOIN r.property p WHERE " + VISIBLE_TO_USER
            + " AND " + MATCHES_SEARCH + " GROUP BY r.status")
    List<Object[]> countByStatus(@Param("userId") Long userId, @Param("search") String search);

    @Override
    @Query("SELECT r FROM Reservation r JOIN FETCH r.property JOIN FETCH r.samsar WHERE r.id = :id")
    Optional<Reservation> findById(@Param("id") Long id);

    @Query("SELECT r FROM Reservation r JOIN FETCH r.property JOIN FETCH r.samsar " +
           "WHERE r.samsarId = :userId OR r.property.createdBy = :userId " +
           "OR r.propertyId IN (SELECT ps.propertyId FROM PropertySamsar ps WHERE ps.samsarId = :userId) " +
           "ORDER BY r.startDate DESC")
    List<Reservation> findVisibleTo(@Param("userId") Long userId);

    /** Reservations a samsar created, plus every reservation on the houses shared with him (read-only for him). */
    @Query("SELECT r FROM Reservation r JOIN FETCH r.property JOIN FETCH r.samsar " +
           "WHERE r.samsarId = :samsarId " +
           "OR r.propertyId IN (SELECT ps.propertyId FROM PropertySamsar ps WHERE ps.samsarId = :samsarId) " +
           "ORDER BY r.startDate DESC")
    List<Reservation> findBySamsarId(@Param("samsarId") Long samsarId);

    @Query("SELECT r FROM Reservation r JOIN FETCH r.property JOIN FETCH r.samsar WHERE r.propertyId = :propertyId ORDER BY r.startDate DESC")
    List<Reservation> findByPropertyId(@Param("propertyId") Long propertyId);

    @Query("SELECT r FROM Reservation r JOIN FETCH r.property JOIN FETCH r.samsar WHERE r.property.createdBy = :ownerId ORDER BY r.startDate DESC")
    List<Reservation> findByPropertyCreatedBy(@Param("ownerId") Long ownerId);

    /**
     * Reservations really holding the dates. A pending one (no advance yet) does not block them:
     * someone else may book over it, and it is cancelled once another booking of those dates is confirmed.
     */
    @Query("SELECT r FROM Reservation r WHERE r.propertyId = :propertyId " +
           "AND r.status IN ('confirmed', 'in-progress') " +
           "AND r.startDate <= :endDate AND r.endDate >= :startDate " +
           "AND r.id <> :excludeId")
    List<Reservation> findOverlapping(@Param("propertyId") Long propertyId,
                                      @Param("startDate") LocalDate startDate,
                                      @Param("endDate") LocalDate endDate,
                                      @Param("excludeId") Long excludeId);

    /** Pending requests overlapping a period: they are overridden when a booking of that period is confirmed. */
    @Query("SELECT r FROM Reservation r WHERE r.propertyId = :propertyId AND r.status = 'pending' " +
           "AND r.startDate <= :endDate AND r.endDate >= :startDate AND r.id <> :excludeId")
    List<Reservation> findPendingOverlapping(@Param("propertyId") Long propertyId,
                                             @Param("startDate") LocalDate startDate,
                                             @Param("endDate") LocalDate endDate,
                                             @Param("excludeId") Long excludeId);

    /** Calendar data: pending requests are returned too so they show in orange, but they do not block. */
    @Query("SELECT r FROM Reservation r WHERE r.propertyId = :propertyId " +
           "AND r.status IN ('pending', 'confirmed', 'in-progress') AND r.endDate >= :fromDate ORDER BY r.startDate")
    List<Reservation> findOccupying(@Param("propertyId") Long propertyId, @Param("fromDate") LocalDate fromDate);

    @Query("SELECT COUNT(r) > 0 FROM Reservation r WHERE r.propertyId = :propertyId AND r.status IN ('pending', 'confirmed', 'in-progress')")
    boolean existsActiveByPropertyId(@Param("propertyId") Long propertyId);

    @Query("SELECT r.id FROM Reservation r WHERE r.propertyId = :propertyId")
    List<Long> findIdsByPropertyId(@Param("propertyId") Long propertyId);

    @Query("SELECT r FROM Reservation r WHERE r.status = 'confirmed' AND r.startDate <= :today")
    List<Reservation> findConfirmedAndDateReached(@Param("today") LocalDate today);

    @Query("SELECT r FROM Reservation r WHERE r.status = 'pending' AND r.endDate < :today")
    List<Reservation> findPendingAndEnded(@Param("today") LocalDate today);

    @Query("SELECT r FROM Reservation r WHERE r.status = 'in-progress' AND r.endDate < :today")
    List<Reservation> findInProgressAndEnded(@Param("today") LocalDate today);
}
