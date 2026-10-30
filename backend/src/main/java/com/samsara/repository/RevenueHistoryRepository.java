package com.samsara.repository;

import com.samsara.entity.RevenueHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface RevenueHistoryRepository extends JpaRepository<RevenueHistory, Long> {
    List<RevenueHistory> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<RevenueHistory> findByReservationId(Long reservationId);
    boolean existsByReservationIdAndType(Long reservationId, String type);

    @Modifying
    @Query("DELETE FROM RevenueHistory rh WHERE rh.reservationId = :reservationId")
    void deleteByReservationId(@Param("reservationId") Long reservationId);
}
