package com.samsara.repository;

import com.samsara.entity.Reservation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ReservationRepository extends JpaRepository<Reservation, Long> {
    List<Reservation> findBySamsarId(Long samsarId);
    List<Reservation> findByPropertyId(Long propertyId);
}
