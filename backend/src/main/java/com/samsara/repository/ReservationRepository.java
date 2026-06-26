package com.samsara.repository;

import com.samsara.entity.Reservation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface ReservationRepository extends JpaRepository<Reservation, Long> {
    @Query("SELECT r FROM Reservation r JOIN FETCH r.property JOIN FETCH r.samsar")
    List<Reservation> findAll();

    @Query("SELECT r FROM Reservation r JOIN FETCH r.property JOIN FETCH r.samsar WHERE r.samsarId = :samsarId")
    List<Reservation> findBySamsarId(@Param("samsarId") Long samsarId);

    @Query("SELECT r FROM Reservation r JOIN FETCH r.property JOIN FETCH r.samsar WHERE r.propertyId = :propertyId")
    List<Reservation> findByPropertyId(@Param("propertyId") Long propertyId);
}
