package com.samsara.service;

import com.samsara.dto.ReservationDto;
import com.samsara.entity.Property;
import com.samsara.entity.Reservation;
import com.samsara.entity.RevenueHistory;
import com.samsara.entity.User;
import com.samsara.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class ReservationService {

    public static final String PENDING = "pending";
    public static final String CONFIRMED = "confirmed";
    public static final String IN_PROGRESS = "in-progress";
    public static final String COMPLETED = "completed";
    public static final String CANCELLED = "cancelled";

    /** Workflow: pending → confirmed → in-progress → completed, cancellation possible until completion. */
    private static final Map<String, Set<String>> TRANSITIONS = Map.of(
            PENDING, Set.of(CONFIRMED, CANCELLED),
            CONFIRMED, Set.of(IN_PROGRESS, CANCELLED),
            IN_PROGRESS, Set.of(COMPLETED, CANCELLED),
            COMPLETED, Set.of(),
            CANCELLED, Set.of()
    );

    private static final Pattern TIME_PATTERN = Pattern.compile("^([01]\\d|2[0-3]):[0-5]\\d$");

    private final ReservationRepository reservationRepository;
    private final NotificationRepository notificationRepository;
    private final RevenueHistoryRepository revenueHistoryRepository;
    private final PropertyAvailabilityRepository availabilityRepository;
    private final PropertySamsarRepository propertySamsarRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final AccessService accessService;

    public List<Reservation> findVisibleTo(Long userId) {
        return reservationRepository.findVisibleTo(userId);
    }

    public Reservation findById(Long id, Long userId) {
        Reservation reservation = getReservation(id);
        accessService.requireReservationAccess(reservation, userId);
        return reservation;
    }

    public List<Reservation> findBySamsar(Long samsarId) {
        return reservationRepository.findBySamsarId(samsarId);
    }

    public List<Reservation> findByProperty(Long propertyId, Long userId) {
        Property property = accessService.getProperty(propertyId);
        if (accessService.isOwner(property, userId)) {
            return reservationRepository.findByPropertyId(propertyId);
        }
        accessService.requireWorkOn(propertyId, userId);
        // A samsar only sees the details of his own reservations; the calendar uses /occupancy
        return reservationRepository.findByPropertyId(propertyId).stream()
                .filter(r -> userId.equals(r.getSamsarId()))
                .toList();
    }

    public List<Reservation> findByPropertyCreator(Long ownerId) {
        return reservationRepository.findByPropertyCreatedBy(ownerId);
    }

    /** Date ranges holding a property, without client details, for calendars and the public page. */
    public List<Map<String, String>> findOccupancy(Long propertyId) {
        String today = LocalDate.now().format(DateTimeFormatter.ISO_DATE);
        return reservationRepository.findOccupying(propertyId, today).stream()
                .map(r -> Map.of(
                        "startDate", r.getStartDate(),
                        "endDate", r.getEndDate(),
                        "status", r.getStatus()))
                .toList();
    }

    private Reservation getReservation(Long id) {
        return reservationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Reservation not found"));
    }

    private String normalizeStatus(String status) {
        if (status == null) return PENDING;
        String normalized = status.trim().toLowerCase();
        if ("in_progress".equals(normalized) || "in progress".equals(normalized) || "in-progress".equals(normalized)) {
            return IN_PROGRESS;
        }
        if ("reserved".equals(normalized)) return CONFIRMED;
        if ("active".equals(normalized)) return IN_PROGRESS;
        return normalized;
    }

    /** Called periodically: confirmed stays start on their arrival day and finish after their last day. */
    @Transactional
    public void autoUpdateStatuses() {
        String today = LocalDate.now().format(DateTimeFormatter.ISO_DATE);
        for (Reservation r : reservationRepository.findConfirmedAndDateReached(today)) {
            applyStatus(r, IN_PROGRESS, null);
        }
        for (Reservation r : reservationRepository.findInProgressAndEnded(today)) {
            applyStatus(r, COMPLETED, null);
        }
    }

    @Transactional
    public Reservation create(ReservationDto dto, Long userId) {
        if (dto.getPropertyId() == null) {
            throw new IllegalArgumentException("Property is required");
        }
        Property property = accessService.requireWorkOn(dto.getPropertyId(), userId);

        Reservation reservation = Reservation.builder()
                .propertyId(property.getId())
                .samsarId(userId)
                .startDate(dto.getStartDate())
                .endDate(dto.getEndDate())
                .checkInTime(dto.getCheckInTime() != null && !dto.getCheckInTime().isBlank() ? dto.getCheckInTime() : "14:00")
                .checkOutTime(dto.getCheckOutTime() != null && !dto.getCheckOutTime().isBlank() ? dto.getCheckOutTime() : "12:00")
                .status(PENDING)
                .clientName(dto.getClientName() != null ? dto.getClientName().trim() : null)
                .clientPhone(dto.getClientPhone())
                .advanceAmount(dto.getAdvanceAmount() != null ? dto.getAdvanceAmount() : 0.0)
                .totalAmount(dto.getTotalAmount())
                .notes(dto.getNotes())
                .build();

        validate(reservation, property, userId);
        Reservation saved = reservationRepository.save(reservation);

        userRepository.findById(userId)
                .ifPresent(actor -> notificationService.notifyReservationCreated(saved, property, actor));
        return saved;
    }

    @Transactional
    public Reservation updateStatus(Long id, String status, Long userId) {
        Reservation reservation = getReservation(id);
        accessService.requireReservationAccess(reservation, userId);

        String target = normalizeStatus(status);
        if (!TRANSITIONS.containsKey(target)) {
            throw new IllegalArgumentException("Unknown status: " + status);
        }
        String current = normalizeStatus(reservation.getStatus());
        if (current.equals(target)) {
            return reservation;
        }
        if (!TRANSITIONS.getOrDefault(current, Set.of()).contains(target)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Cannot change status from " + current + " to " + target);
        }
        User actor = userRepository.findById(userId).orElse(null);
        return applyStatus(reservation, target, actor);
    }

    private Reservation applyStatus(Reservation reservation, String target, User actor) {
        reservation.setStatus(target);
        reservation = reservationRepository.save(reservation);

        double total = reservation.getTotalAmount() != null ? reservation.getTotalAmount() : 0.0;
        double advance = reservation.getAdvanceAmount() != null ? reservation.getAdvanceAmount() : 0.0;
        switch (target) {
            case CONFIRMED -> recordRevenue(reservation, "advance", advance);
            case IN_PROGRESS, COMPLETED -> {
                // The stay is paid in full once it starts
                recordRevenue(reservation, "advance", advance);
                recordRevenue(reservation, "completion", total - advance);
            }
            default -> { }
        }

        Property property = reservation.getProperty() != null
                ? reservation.getProperty()
                : accessService.getProperty(reservation.getPropertyId());
        notificationService.notifyStatusChanged(reservation, property, actor, target);
        return reservation;
    }

    private void recordRevenue(Reservation reservation, String type, double amount) {
        if (amount <= 0 || revenueHistoryRepository.existsByReservationIdAndType(reservation.getId(), type)) {
            return;
        }
        revenueHistoryRepository.save(RevenueHistory.builder()
                .userId(reservation.getSamsarId())
                .reservationId(reservation.getId())
                .amount(amount)
                .type(type)
                .build());
    }

    @Transactional
    public Reservation update(Long id, ReservationDto dto, Long userId) {
        Reservation reservation = getReservation(id);
        accessService.requireReservationAccess(reservation, userId);

        String status = normalizeStatus(reservation.getStatus());
        if (COMPLETED.equals(status) || CANCELLED.equals(status)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A completed or cancelled reservation cannot be modified");
        }

        // Status changes go through PATCH /reservations/{id}/status to respect the workflow
        if (dto.getStartDate() != null) reservation.setStartDate(dto.getStartDate());
        if (dto.getEndDate() != null) reservation.setEndDate(dto.getEndDate());
        if (dto.getCheckInTime() != null) reservation.setCheckInTime(dto.getCheckInTime());
        if (dto.getCheckOutTime() != null) reservation.setCheckOutTime(dto.getCheckOutTime());
        if (dto.getClientName() != null) reservation.setClientName(dto.getClientName().trim());
        if (dto.getClientPhone() != null) reservation.setClientPhone(dto.getClientPhone());
        if (dto.getAdvanceAmount() != null) reservation.setAdvanceAmount(dto.getAdvanceAmount());
        if (dto.getTotalAmount() != null) reservation.setTotalAmount(dto.getTotalAmount());
        if (dto.getNotes() != null) reservation.setNotes(dto.getNotes());

        Property property = reservation.getProperty();
        validate(reservation, property, reservation.getSamsarId());
        reservation = reservationRepository.save(reservation);

        User actor = userRepository.findById(userId).orElse(null);
        if (actor != null) {
            notificationService.notifyReservationUpdated(reservation, property, actor);
        }
        return reservation;
    }

    @Transactional
    public void delete(Long id, Long userId) {
        Reservation reservation = getReservation(id);
        accessService.requireReservationAccess(reservation, userId);
        Property property = reservation.getProperty();

        notificationRepository.deleteByReservationId(reservation.getId());
        revenueHistoryRepository.deleteByReservationId(reservation.getId());
        reservationRepository.delete(reservation);

        userRepository.findById(userId)
                .ifPresent(actor -> notificationService.notifyReservationDeleted(reservation, property, actor));
    }

    /**
     * Business rules shared by creation and edition.
     * The total follows the spec: number of days (last day included) × daily price; a samsar may add
     * at most the margin granted by the owner (10, 20 or 30 TND per day).
     */
    private void validate(Reservation reservation, Property property, Long bookerId) {
        if (reservation.getClientName() == null || reservation.getClientName().isBlank()) {
            throw new IllegalArgumentException("Client name is required");
        }
        LocalDate start = parseDate(reservation.getStartDate(), "start date");
        LocalDate end = parseDate(reservation.getEndDate(), "end date");
        if (end.isBefore(start)) {
            throw new IllegalArgumentException("End date must be on or after start date");
        }
        if (!TIME_PATTERN.matcher(reservation.getCheckInTime()).matches()
                || !TIME_PATTERN.matcher(reservation.getCheckOutTime()).matches()) {
            throw new IllegalArgumentException("Times must use the HH:mm format");
        }

        Double total = reservation.getTotalAmount();
        double advance = reservation.getAdvanceAmount() != null ? reservation.getAdvanceAmount() : 0.0;
        if (total == null || total < 0) {
            throw new IllegalArgumentException("Total amount is required and must be positive");
        }
        if (advance < 0 || advance > total) {
            throw new IllegalArgumentException("Advance must be between 0 and the total amount");
        }

        if (property.getPricePerDay() != null && !accessService.isOwner(property, bookerId)) {
            long days = ChronoUnit.DAYS.between(start, end) + 1;
            int margin = propertySamsarRepository.findByPropertyIdAndSamsarId(property.getId(), bookerId)
                    .map(ps -> ps.getPriceIncreaseTnd() != null ? ps.getPriceIncreaseTnd() : 0)
                    .orElse(0);
            double max = days * (property.getPricePerDay() + margin);
            if (total > max + 0.001) {
                throw new IllegalArgumentException(String.format(
                        "Total exceeds the allowed maximum of %.0f TND (%d days × (%.0f + %d) TND)",
                        max, days, property.getPricePerDay(), margin));
            }
        }

        Long excludeId = reservation.getId() != null ? reservation.getId() : -1L;
        if (!reservationRepository.findOverlapping(property.getId(), reservation.getStartDate(),
                reservation.getEndDate(), excludeId).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "These dates overlap an existing reservation");
        }
        if (availabilityRepository.existsBlockedBetween(property.getId(), reservation.getStartDate(), reservation.getEndDate())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Some of these dates are marked unavailable by the owner");
        }
    }

    private LocalDate parseDate(String value, String label) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("The " + label + " is required");
        }
        try {
            return LocalDate.parse(value, DateTimeFormatter.ISO_LOCAL_DATE);
        } catch (DateTimeParseException e) {
            throw new IllegalArgumentException("Invalid " + label + " (expected yyyy-MM-dd)");
        }
    }
}
