package com.samsara.repository;

import com.samsara.entity.ReservationEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ReservationEventRepository extends JpaRepository<ReservationEvent, Long> {
    List<ReservationEvent> findByReservationIdOrderByCreatedAtAscIdAsc(Long reservationId);
}
