package com.samsara.service;

import com.samsara.dto.ReservationDto;
import com.samsara.entity.Notification;
import com.samsara.entity.Reservation;
import com.samsara.entity.RevenueHistory;
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

        createNotification(reservation, "created");

        return reservation;
    }

    @Transactional
    public Reservation updateStatus(Long id, String status) {
        Reservation reservation = findById(id);
        reservation.setStatus(status);
        reservation = reservationRepository.save(reservation);

        if ("confirmed".equals(status)) {
            RevenueHistory revenue = RevenueHistory.builder()
                    .userId(reservation.getSamsarId())
                    .reservationId(reservation.getId())
                    .amount(reservation.getTotalAmount())
                    .type("reservation")
                    .build();
            revenueHistoryRepository.save(revenue);
        }

        createNotification(reservation, status);

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
    }

    private void createNotification(Reservation reservation, String action) {
        String title = "Reservation " + action;
        String message = "Reservation for " + reservation.getClientName()
                + " on property " + reservation.getPropertyId()
                + " from " + reservation.getStartDate()
                + " to " + reservation.getEndDate()
                + " has been " + action;

        Notification notification = Notification.builder()
                .userId(reservation.getSamsarId())
                .reservationId(reservation.getId())
                .propertyId(reservation.getPropertyId())
                .type("reservation")
                .title(title)
                .message(message)
                .build();

        notificationRepository.save(notification);
    }
}
