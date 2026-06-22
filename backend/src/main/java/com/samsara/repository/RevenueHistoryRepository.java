package com.samsara.repository;

import com.samsara.entity.RevenueHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RevenueHistoryRepository extends JpaRepository<RevenueHistory, Long> {
    List<RevenueHistory> findByUserId(Long userId);
    List<RevenueHistory> findByReservationId(Long reservationId);
}
