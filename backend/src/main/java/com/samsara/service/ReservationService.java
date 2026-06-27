package com.samsara.service;

import com.samsara.dto.ReservationDto;
import com.samsara.entity.Property;
import com.samsara.entity.Reservation;
import com.samsara.entity.RevenueHistory;
import com.samsara.entity.User;
import com.samsara.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ReservationService {

    private final ReservationRepository reservationRepository;
    private final NotificationRepository notificationRepository;
    private final RevenueHistoryRepository revenueHistoryRepository;
    private final PropertyRepository propertyRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    public List<Reservation> findAll() {
        return reservationRepository.findAll();
    }

    public Reservation findById(Long id) {
        return reservationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Reservation not found"));
    }

    public List<Reservation> findBySamsar(Long samsarId) {
        return reservationRepository.findBySamsarId(samsarId);
    }

    public List<Reservation> findByProperty(Long propertyId) {
        return reservationRepository.findByPropertyId(propertyId);
    }

    public List<Reservation> findByPropertyCreator(Long ownerId) {
        return reservationRepository.findByPropertyCreatedBy(ownerId);
    }

    @Transactional
    public Reservation create(ReservationDto dto, Long samsarId) {
        Reservation reservation = Reservation.builder()
                .propertyId(dto.getPropertyId())
                .samsarId(samsarId)
                .startDate(dto.getStartDate())
                .endDate(dto.getEndDate())
                .checkInTime(dto.getCheckInTime() != null ? dto.getCheckInTime() : "14:00")
                .checkOutTime(dto.getCheckOutTime() != null ? dto.getCheckOutTime() : "12:00")
                .status("pending")
                .clientName(dto.getClientName())
                .clientPhone(dto.getClientPhone())
                .advanceAmount(dto.getAdvanceAmount() != null ? dto.getAdvanceAmount() : 0.0)
                .totalAmount(dto.getTotalAmount())
                .notes(dto.getNotes())
                .build();

        reservation = reservationRepository.save(reservation);

        Property property = propertyRepository.findById(dto.getPropertyId()).orElse(null);
        if (property != null) {
            User actor = userRepository.findById(samsarId).orElse(null);
            if (actor != null) {
                notificationService.notifyReservationCreated(reservation, property, actor);
            }
        }

        return reservation;
    }

    @Transactional
    public Reservation updateStatus(Long id, String status) {
        Reservation reservation = findById(id);
        String oldStatus = reservation.getStatus();
        reservation.setStatus(status);
        reservation = reservationRepository.save(reservation);

        if (!oldStatus.equals(status)) {
            if ("confirmed".equals(status)) {
                double advance = reservation.getAdvanceAmount() != null ? reservation.getAdvanceAmount() : 0.0;
                if (advance > 0) {
                    RevenueHistory revenue = RevenueHistory.builder()
                            .userId(reservation.getSamsarId())
                            .reservationId(reservation.getId())
                            .amount(advance)
                            .type("advance")
                            .build();
                    revenueHistoryRepository.save(revenue);
                }
            } else if ("in_progress".equals(status)) {
                double total = reservation.getTotalAmount() != null ? reservation.getTotalAmount() : 0.0;
                double advance = reservation.getAdvanceAmount() != null ? reservation.getAdvanceAmount() : 0.0;
                double remaining = total - advance;
                if (remaining > 0) {
                    RevenueHistory revenue = RevenueHistory.builder()
                            .userId(reservation.getSamsarId())
                            .reservationId(reservation.getId())
                            .amount(remaining)
                            .type("completion")
                            .build();
                    revenueHistoryRepository.save(revenue);
                }
            }

            Property property = propertyRepository.findById(reservation.getPropertyId()).orElse(null);
            if (property != null) {
                User actor = userRepository.findById(reservation.getSamsarId()).orElse(null);
                if (actor != null) {
                    if ("confirmed".equals(status)) {
                        notificationService.notifyReservationConfirmed(reservation, property, actor);
                    } else if ("cancelled".equals(status)) {
                        notificationService.notifyReservationCancelled(reservation, property, actor);
                    }
                }
            }
        }

        return reservation;
    }

    @Transactional
    public Reservation update(Long id, ReservationDto dto) {
        Reservation reservation = findById(id);
        if (dto.getStartDate() != null) reservation.setStartDate(dto.getStartDate());
        if (dto.getEndDate() != null) reservation.setEndDate(dto.getEndDate());
        if (dto.getCheckInTime() != null) reservation.setCheckInTime(dto.getCheckInTime());
        if (dto.getCheckOutTime() != null) reservation.setCheckOutTime(dto.getCheckOutTime());
        if (dto.getStatus() != null) reservation.setStatus(dto.getStatus());
        if (dto.getClientName() != null) reservation.setClientName(dto.getClientName());
        if (dto.getClientPhone() != null) reservation.setClientPhone(dto.getClientPhone());
        if (dto.getAdvanceAmount() != null) reservation.setAdvanceAmount(dto.getAdvanceAmount());
        if (dto.getTotalAmount() != null) reservation.setTotalAmount(dto.getTotalAmount());
        if (dto.getNotes() != null) reservation.setNotes(dto.getNotes());
        return reservationRepository.save(reservation);
    }

    @Transactional
    public void delete(Long id) {
        Reservation reservation = findById(id);
        reservationRepository.delete(reservation);

        Property property = propertyRepository.findById(reservation.getPropertyId()).orElse(null);
        if (property != null) {
            User actor = userRepository.findById(reservation.getSamsarId()).orElse(null);
            if (actor != null) {
                notificationService.notifyReservationDeleted(reservation, property, actor);
            }
        }
    }
}
