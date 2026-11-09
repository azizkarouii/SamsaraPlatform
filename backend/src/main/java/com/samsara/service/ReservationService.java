package com.samsara.service;

import com.samsara.dto.ReservationDto;
import com.samsara.dto.ReservationEarlyEndDto;
import com.samsara.dto.ReservationEarning;
import com.samsara.dto.ReservationPageDto;
import com.samsara.entity.Property;
import com.samsara.entity.Reservation;
import com.samsara.entity.ReservationEvent;
import com.samsara.entity.User;
import com.samsara.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;
import java.util.regex.Pattern;

import static com.samsara.service.ReservationStatus.*;

/**
 * Bookings: reading them, creating and editing them, and moving them along the workflow.
 * Prices are in {@link ReservationPricing}, money received and given back in {@link ReservationPaymentService}.
 */
@Service
@RequiredArgsConstructor
public class ReservationService {

    private static final Pattern TIME_PATTERN = Pattern.compile("^([01]\\d|2[0-3]):[0-5]\\d$");

    private static final Map<String, String> SORTABLE = Map.of(
            "clientName", "clientName",
            "propertyTitle", "p.title",
            "startDate", "startDate",
            "status", "status",
            "totalAmount", "totalAmount");
    private static final int MAX_PAGE_SIZE = 100;

    private final ReservationRepository reservationRepository;
    private final PropertyRepository propertyRepository;
    private final NotificationRepository notificationRepository;
    private final PropertyAvailabilityRepository availabilityRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final ReservationEventService eventService;
    private final ReservationPaymentService paymentService;
    private final ReservationPricing pricing;
    private final AccessService accessService;
    private final Clock clock;

    // ------------------------------------------------------------------------------------------ reading

    public List<Reservation> findVisibleTo(Long userId) {
        return hidePrivateTerms(reservationRepository.findVisibleTo(userId), userId);
    }

    /**
     * A samsar reads the other bookings of his houses, but what another samsar earns stays private.
     * Only called outside a transaction: the entities are detached, so nothing is written back.
     */
    private List<Reservation> hidePrivateTerms(List<Reservation> reservations, Long userId) {
        reservations.forEach(r -> hidePrivateTerms(r, userId));
        return reservations;
    }

    private Reservation hidePrivateTerms(Reservation reservation, Long userId) {
        Property property = reservation.getProperty() != null
                ? reservation.getProperty()
                : accessService.getProperty(reservation.getPropertyId());
        if (!userId.equals(reservation.getSamsarId()) && !accessService.isOwner(property, userId)) {
            reservation.setSamsarGain(null);
            reservation.setBaseAmount(null);
            reservation.setRefundAmount(null);
            reservation.setSamsarRefundAmount(null);
            reservation.setSamsarMarginTnd(null);
            reservation.setSamsarCommissionPercent(null);
        }
        return reservation;
    }

    /** The list screen: filtered, sorted and paged by the database, with the counts of the status tabs. */
    public ReservationPageDto findPage(Long userId, String status, String search, int page, int size, String sort, String direction) {
        String pattern = "%" + (search == null ? "" : search.trim().toLowerCase()) + "%";
        Sort order = Sort.by("asc".equalsIgnoreCase(direction) ? Sort.Direction.ASC : Sort.Direction.DESC,
                SORTABLE.getOrDefault(sort, "startDate"));
        PageRequest request = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), MAX_PAGE_SIZE), order);
        Page<Reservation> result = reservationRepository.findPage(userId, status == null ? "" : status, pattern, request);

        Map<String, Long> counts = new HashMap<>();
        for (Object[] row : reservationRepository.countByStatus(userId, pattern)) {
            counts.put((String) row[0], (Long) row[1]);
        }
        return new ReservationPageDto(hidePrivateTerms(result.getContent(), userId), result.getTotalElements(), counts);
    }

    /** What each booking this user manages brings him, from the payments actually received. */
    public List<ReservationEarning> findEarnings(Long userId) {
        List<Reservation> managed = reservationRepository.findVisibleTo(userId).stream()
                .filter(r -> accessService.isOwner(r.getProperty(), userId) || userId.equals(r.getSamsarId()))
                .toList();
        Map<Long, BigDecimal> paid = paymentService.paidByReservation(managed);
        return managed.stream().map(r -> {
            BigDecimal received = paid.getOrDefault(r.getId(), Money.ZERO);
            return accessService.isOwner(r.getProperty(), userId)
                    ? new ReservationEarning(r.getId(), ReservationEarnings.owner(r, received), Money.ZERO)
                    : new ReservationEarning(r.getId(), ReservationEarnings.samsar(r, received), ReservationEarnings.samsarUpcoming(r, received));
        }).toList();
    }

    public Reservation findById(Long id, Long userId) {
        Reservation reservation = getReservation(id);
        accessService.requireReservationView(reservation, userId);
        return hidePrivateTerms(reservation, userId);
    }

    public List<Reservation> findBySamsar(Long samsarId) {
        return hidePrivateTerms(reservationRepository.findBySamsarId(samsarId), samsarId);
    }

    public List<Reservation> findByProperty(Long propertyId, Long userId) {
        Property property = accessService.getProperty(propertyId);
        if (accessService.isOwner(property, userId)) {
            return reservationRepository.findByPropertyId(propertyId);
        }
        accessService.requireWorkOn(propertyId, userId);
        return hidePrivateTerms(reservationRepository.findByPropertyId(propertyId), userId);
    }

    public List<Reservation> findByPropertyCreator(Long ownerId) {
        return reservationRepository.findByPropertyCreatedBy(ownerId);
    }

    /** Date ranges holding a property, without client details, for calendars and the public page. */
    public List<Map<String, String>> findOccupancy(Long propertyId) {
        return reservationRepository.findOccupying(propertyId, LocalDate.now()).stream()
                .map(r -> Map.of(
                        "startDate", r.getStartDate().toString(),
                        "endDate", r.getEndDate().toString(),
                        "status", r.getStatus()))
                .toList();
    }

    /** The history is for the ones managing the booking: its samsar and the owner of the house. */
    public List<ReservationEvent> findEvents(Long id, Long userId) {
        accessService.requireReservationAccess(getReservation(id), userId);
        return eventService.findByReservation(id);
    }

    private Reservation getReservation(Long id) {
        return reservationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Reservation not found"));
    }

    /** Repairs old rows: statuses such as "in_progress" or "Pending", and amounts computed before their columns. */
    @Transactional
    public int normalizeLegacyData() {
        int fixed = 0;
        for (Reservation r : reservationRepository.findAll()) {
            String status = normalize(r.getStatus());
            boolean changed = !status.equals(r.getStatus());
            r.setStatus(status);
            if (r.getBaseAmount() == null || r.getSamsarGain() == null) {
                // Bookings older than these columns take the rates and the deal currently in force
                Property property = accessService.getProperty(r.getPropertyId());
                if (r.getBaseAmount() == null && property.getPricePerDay() != null) {
                    r.setBaseAmount(pricing.computeBaseAmount(property, r.getStartDate(), r.getEndDate()));
                    changed = true;
                }
                if (r.getSamsarGain() == null) {
                    pricing.freezeSamsarDeal(r, property, r.getSamsarId());
                    r.setSamsarGain(pricing.computeSamsarGain(r, property));
                    changed = true;
                }
            }
            if (changed) {
                reservationRepository.save(r);
                fixed++;
            }
        }
        return fixed;
    }

    /**
     * Called periodically: confirmed stays start on their arrival day and finish after their last day;
     * a request still pending once its stay is over can no longer happen and is cancelled.
     */
    @Transactional
    public void autoUpdateStatuses() {
        LocalDate today = LocalDate.now();
        for (Reservation r : reservationRepository.findPendingAndEnded(today)) {
            applyStatus(r, CANCELLED, null);
        }
        for (Reservation r : reservationRepository.findConfirmedAndDateReached(today)) {
            applyStatus(r, IN_PROGRESS, null);
        }
        for (Reservation r : reservationRepository.findInProgressAndEnded(today)) {
            applyStatus(r, COMPLETED, null);
        }
    }

    // ------------------------------------------------------------------------------------------ writing

    @Transactional
    public Reservation create(ReservationDto dto, Long userId) {
        if (dto.getPropertyId() == null) {
            throw new IllegalArgumentException("Property is required");
        }
        Property property = accessService.requireWorkOn(dto.getPropertyId(), userId);
        propertyRepository.lockById(property.getId());

        Reservation reservation = Reservation.builder()
                .propertyId(property.getId())
                .samsarId(userId)
                .startDate(parseDate(dto.getStartDate(), "start date"))
                .endDate(parseDate(dto.getEndDate(), "end date"))
                .checkInTime(dto.getCheckInTime() != null && !dto.getCheckInTime().isBlank() ? dto.getCheckInTime() : "14:00")
                .checkOutTime(dto.getCheckOutTime() != null && !dto.getCheckOutTime().isBlank() ? dto.getCheckOutTime() : "12:00")
                // An advance already paid means the client committed: the booking is confirmed straight away
                .status(Money.isPositive(dto.getAdvanceAmount()) ? CONFIRMED : PENDING)
                .clientName(dto.getClientName() != null ? dto.getClientName().trim() : null)
                .clientPhone(dto.getClientPhone())
                .advanceAmount(Money.of(dto.getAdvanceAmount()))
                .totalAmount(dto.getTotalAmount() != null ? Money.of(dto.getTotalAmount()) : null)
                .notes(dto.getNotes())
                .negotiatedPricePerDay(Money.positiveOrNull(dto.getNegotiatedPricePerDay()))
                .build();

        pricing.freezeSamsarDeal(reservation, property, userId);
        validate(reservation, property, userId);
        reservation.setSamsarGain(pricing.computeSamsarGain(reservation, property));
        requireNotInPast(reservation.getStartDate());
        if (arrivalReached(reservation)) {
            // The client is already there: the stay is under way, advance or not
            reservation.setStatus(IN_PROGRESS);
        }
        Reservation saved = reservationRepository.save(reservation);

        User actor = userRepository.findById(userId).orElse(null);
        paymentService.syncAdvancePayment(saved, userId);
        eventService.record(saved, actor, "created", Map.of(
                "status", saved.getStatus(), "total", saved.getTotalAmount(), "advance", saved.getAdvanceAmount()));
        if (IN_PROGRESS.equals(saved.getStatus())) {
            paymentService.recordBalanceOnArrival(saved);
        }
        if (actor != null) {
            notificationService.notifyReservationCreated(saved, property, actor);
        }
        overridePendingOverlaps(saved, property);
        return saved;
    }

    @Transactional
    public Reservation updateStatus(Long id, String status, Long userId) {
        Reservation reservation = getReservation(id);
        accessService.requireReservationAccess(reservation, userId);

        String target = normalize(status);
        if (!TRANSITIONS.containsKey(target)) {
            throw new IllegalArgumentException("Unknown status: " + status);
        }
        String current = normalize(reservation.getStatus());
        if (current.equals(target)) {
            return reservation;
        }
        if (!TRANSITIONS.getOrDefault(current, Set.of()).contains(target)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Cannot change status from " + current + " to " + target);
        }
        if (IN_PROGRESS.equals(target) && reservation.getStartDate().isAfter(LocalDate.now())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "The stay cannot start before the arrival date");
        }
        if (CONFIRMED.equals(target)) {
            propertyRepository.lockById(reservation.getPropertyId());
            if (!reservationRepository.findOverlapping(reservation.getPropertyId(),
                    reservation.getStartDate(), reservation.getEndDate(), reservation.getId()).isEmpty()) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "These dates are already confirmed for another reservation");
            }
        }
        User actor = userRepository.findById(userId).orElse(null);
        Reservation updated = applyStatus(reservation, target, actor);
        if (CONFIRMED.equals(target)) {
            overridePendingOverlaps(updated, updated.getProperty() != null
                    ? updated.getProperty()
                    : accessService.getProperty(updated.getPropertyId()));
        }
        return updated;
    }

    private Reservation applyStatus(Reservation reservation, String target, User actor) {
        String previous = reservation.getStatus();
        reservation.setStatus(target);
        reservation = reservationRepository.save(reservation);
        eventService.record(reservation, actor, "status_changed", Map.of("from", previous, "to", target));
        if (IN_PROGRESS.equals(target)) {
            paymentService.recordBalanceOnArrival(reservation);
        }

        Property property = reservation.getProperty() != null
                ? reservation.getProperty()
                : accessService.getProperty(reservation.getPropertyId());
        notificationService.notifyStatusChanged(reservation, property, actor, target);
        return reservation;
    }

    /**
     * Once a booking holds its dates (confirmed or in progress), the pending requests on the same dates
     * can no longer happen: they are cancelled and their stakeholders are told why.
     */
    private void overridePendingOverlaps(Reservation holder, Property property) {
        String status = normalize(holder.getStatus());
        if (!CONFIRMED.equals(status) && !IN_PROGRESS.equals(status)) {
            return;
        }
        for (Reservation pending : reservationRepository.findPendingOverlapping(holder.getPropertyId(),
                holder.getStartDate(), holder.getEndDate(), holder.getId())) {
            pending.setStatus(CANCELLED);
            reservationRepository.save(pending);
            eventService.record(pending, null, "overridden", Map.of("by", holder.getId()));
            notificationService.notifyReservationOverridden(pending, property);
        }
    }

    @Transactional
    public Reservation update(Long id, ReservationDto dto, Long userId) {
        Reservation reservation = getReservation(id);
        accessService.requireReservationAccess(reservation, userId);

        String status = normalize(reservation.getStatus());
        if (COMPLETED.equals(status) || CANCELLED.equals(status)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A completed or cancelled reservation cannot be modified");
        }

        propertyRepository.lockById(reservation.getPropertyId());
        LocalDate previousStart = reservation.getStartDate();
        LocalDate previousEnd = reservation.getEndDate();
        BigDecimal previousTotal = reservation.getTotalAmount();
        BigDecimal previousAdvance = reservation.getAdvanceAmount();

        // Status changes go through PATCH /reservations/{id}/status to respect the workflow
        if (dto.getStartDate() != null) {
            LocalDate start = parseDate(dto.getStartDate(), "start date");
            if (!start.equals(reservation.getStartDate())) {
                requireNotInPast(start);
                reservation.setStartDate(start);
            }
        }
        if (dto.getEndDate() != null) reservation.setEndDate(parseDate(dto.getEndDate(), "end date"));
        boolean datesChanged = !previousStart.equals(reservation.getStartDate()) || !previousEnd.equals(reservation.getEndDate());
        if (datesChanged) {
            // Other dates are priced at the current rates; otherwise the booking keeps its original price
            reservation.setBaseAmount(null);
        }
        if (dto.getCheckInTime() != null) reservation.setCheckInTime(dto.getCheckInTime());
        if (dto.getCheckOutTime() != null) reservation.setCheckOutTime(dto.getCheckOutTime());
        if (dto.getClientName() != null) reservation.setClientName(dto.getClientName().trim());
        if (dto.getClientPhone() != null) reservation.setClientPhone(dto.getClientPhone());
        if (dto.getAdvanceAmount() != null) reservation.setAdvanceAmount(Money.of(dto.getAdvanceAmount()));
        if (dto.getTotalAmount() != null) reservation.setTotalAmount(Money.of(dto.getTotalAmount()));
        if (dto.getNotes() != null) reservation.setNotes(dto.getNotes());
        if (dto.getNegotiatedPricePerDay() != null) {
            reservation.setNegotiatedPricePerDay(Money.positiveOrNull(dto.getNegotiatedPricePerDay()));
        }

        Property property = reservation.getProperty();
        validate(reservation, property, reservation.getSamsarId());
        reservation.setSamsarGain(pricing.computeSamsarGain(reservation, property));
        BigDecimal paidOutsideAdvance = paymentService.paidOutsideAdvance(reservation, previousAdvance);
        if (Money.greaterThan(Money.of(reservation.getAdvanceAmount()).add(paidOutsideAdvance), reservation.getTotalAmount())) {
            throw new IllegalArgumentException("The total cannot go below what was already paid");
        }
        reservation = reservationRepository.save(reservation);
        paymentService.syncAdvancePayment(reservation, userId);
        paymentService.requireRefundsWithinReceived(reservation);

        User actor = userRepository.findById(userId).orElse(null);
        Map<String, Object> changes = new LinkedHashMap<>();
        if (datesChanged) {
            changes.put("start", reservation.getStartDate().toString());
            changes.put("end", reservation.getEndDate().toString());
        }
        if (Money.of(previousTotal).compareTo(Money.of(reservation.getTotalAmount())) != 0) changes.put("total", reservation.getTotalAmount());
        if (Money.of(previousAdvance).compareTo(Money.of(reservation.getAdvanceAmount())) != 0) changes.put("advance", reservation.getAdvanceAmount());
        eventService.record(reservation, actor, "updated", changes);
        if (actor != null) {
            notificationService.notifyReservationUpdated(reservation, property, actor);
        }
        // Same rule as creation: once an advance is paid, a pending request becomes a confirmed booking.
        // validate() already ensured no confirmed stay holds these dates.
        if (PENDING.equals(status) && Money.isPositive(reservation.getAdvanceAmount())) {
            reservation = applyStatus(reservation, CONFIRMED, actor);
        }
        overridePendingOverlaps(reservation, property);
        return reservation;
    }

    /**
     * The stay stops before its planned end: the following days become free again. The price stays as agreed;
     * any money given back goes through the refund. A new end already reached closes the stay right away.
     */
    @Transactional
    public Reservation endEarly(Long id, ReservationEarlyEndDto dto, Long userId) {
        Reservation reservation = getReservation(id);
        accessService.requireReservationAccess(reservation, userId);
        if (!IN_PROGRESS.equals(normalize(reservation.getStatus()))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only a stay in progress can end early");
        }
        LocalDate newEnd = parseDate(dto.getEndDate(), "end date");
        if (newEnd.isBefore(reservation.getStartDate()) || !newEnd.isBefore(reservation.getEndDate())) {
            throw new IllegalArgumentException("The new end must be between the arrival and the planned end");
        }
        Property property = reservation.getProperty();
        User actor = userRepository.findById(userId).orElse(null);
        if (Money.isPositive(dto.getRefundAmount())) {
            paymentService.applyRefund(reservation, property, dto.getRefundAmount(), userId, actor);
        }
        LocalDate plannedEnd = reservation.getEndDate();
        if (reservation.getOriginalEndDate() == null) {
            reservation.setOriginalEndDate(plannedEnd);
        }
        reservation.setEndDate(newEnd);
        if (!newEnd.isAfter(LocalDate.now())) {
            reservation.setStatus(COMPLETED);
        }
        reservation = reservationRepository.save(reservation);
        eventService.record(reservation, actor, "ended_early", Map.of("from", plannedEnd.toString(), "to", newEnd.toString()));
        notificationService.notifyReservationEndedEarly(reservation, property, actor);
        return reservation;
    }

    @Transactional
    public void delete(Long id, Long userId) {
        Reservation reservation = getReservation(id);
        accessService.requireReservationAccess(reservation, userId);
        Property property = reservation.getProperty();
        User actor = userRepository.findById(userId).orElse(null);

        eventService.record(reservation, actor, "deleted", Map.of("client", reservation.getClientName()));
        notificationRepository.deleteByReservationId(reservation.getId());
        paymentService.deleteAll(reservation);
        reservationRepository.delete(reservation);

        if (actor != null) {
            notificationService.notifyReservationDeleted(reservation, property, actor);
        }
    }

    /** Rules shared by creation and edition; the amounts are checked by {@link ReservationPricing}. */
    private void validate(Reservation reservation, Property property, Long bookerId) {
        if (reservation.getClientName() == null || reservation.getClientName().isBlank()) {
            throw new IllegalArgumentException("Client name is required");
        }
        LocalDate start = reservation.getStartDate();
        LocalDate end = reservation.getEndDate();
        if (end.isBefore(start)) {
            throw new IllegalArgumentException("End date must be on or after start date");
        }
        if (!TIME_PATTERN.matcher(reservation.getCheckInTime()).matches()
                || !TIME_PATTERN.matcher(reservation.getCheckOutTime()).matches()) {
            throw new IllegalArgumentException("Times must use the HH:mm format");
        }
        pricing.checkAmounts(reservation, property, bookerId);

        Long excludeId = reservation.getId() != null ? reservation.getId() : -1L;
        if (!reservationRepository.findOverlapping(property.getId(), start, end, excludeId).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "These dates overlap an existing reservation");
        }
        if (availabilityRepository.existsBlockedBetween(property.getId(), start, end)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Some of these dates are marked unavailable by the owner");
        }
    }

    private boolean arrivalReached(Reservation reservation) {
        LocalDateTime arrival = reservation.getStartDate().atTime(LocalTime.parse(reservation.getCheckInTime()));
        return !arrival.isAfter(LocalDateTime.now(clock));
    }

    private void requireNotInPast(LocalDate startDate) {
        if (startDate.isBefore(LocalDate.now())) {
            throw new IllegalArgumentException("A reservation cannot start in the past");
        }
    }
}
