package com.samsara.repository;

import com.samsara.entity.ReservationPayment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ReservationPaymentRepository extends JpaRepository<ReservationPayment, Long> {
    List<ReservationPayment> findByReservationIdOrderByPaidOnAscIdAsc(Long reservationId);

    Optional<ReservationPayment> findFirstByReservationIdAndKind(Long reservationId, String kind);

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM ReservationPayment p WHERE p.reservationId = :reservationId")
    BigDecimal sumByReservationId(@Param("reservationId") Long reservationId);

    /** [reservationId, total paid] for many bookings at once (dashboard, reports). */
    @Query("SELECT p.reservationId, SUM(p.amount) FROM ReservationPayment p WHERE p.reservationId IN :ids GROUP BY p.reservationId")
    List<Object[]> sumByReservationIds(@Param("ids") Collection<Long> ids);

    @Modifying
    @Query("DELETE FROM ReservationPayment p WHERE p.reservationId = :reservationId")
    void deleteByReservationId(@Param("reservationId") Long reservationId);
}
