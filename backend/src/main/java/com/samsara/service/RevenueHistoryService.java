package com.samsara.service;

import com.samsara.entity.RevenueHistory;
import com.samsara.repository.ReservationRepository;
import com.samsara.repository.RevenueHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RevenueHistoryService {

    private final RevenueHistoryRepository revenueHistoryRepository;
    private final ReservationRepository reservationRepository;
    private final AccessService accessService;

    public List<RevenueHistory> findByUser(Long userId) {
        return revenueHistoryRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public List<RevenueHistory> findByReservation(Long reservationId, Long userId) {
        reservationRepository.findById(reservationId)
                .ifPresentOrElse(r -> accessService.requireReservationAccess(r, userId),
                        () -> { throw new RuntimeException("Reservation not found"); });
        return revenueHistoryRepository.findByReservationId(reservationId);
    }
}
