package com.samsara.service;

import com.samsara.entity.RevenueHistory;
import com.samsara.repository.RevenueHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RevenueHistoryService {

    private final RevenueHistoryRepository revenueHistoryRepository;

    public List<RevenueHistory> findByUser(Long userId) {
        return revenueHistoryRepository.findByUserId(userId);
    }

    public List<RevenueHistory> findByReservation(Long reservationId) {
        return revenueHistoryRepository.findByReservationId(reservationId);
    }

    public List<RevenueHistory> findAll() {
        return revenueHistoryRepository.findAll();
    }
}
