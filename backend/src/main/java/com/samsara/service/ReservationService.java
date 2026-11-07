package com.samsara.service;

import com.samsara.dto.ReservationDto;
import com.samsara.dto.ReservationEarlyEndDto;
import com.samsara.dto.ReservationEarning;
import com.samsara.dto.ReservationPageDto;
import com.samsara.dto.ReservationPaymentDto;
import com.samsara.entity.Property;
import com.samsara.entity.PropertySeasonalPrice;
import com.samsara.entity.Reservation;
import com.samsara.entity.ReservationEvent;
import com.samsara.entity.ReservationPayment;
import com.samsara.entity.User;
import com.samsara.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.*;
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

    private static final Map<String, String> SORTABLE = Map.of(
            "clientName", "clientName",
            "propertyTitle", "p.title",
            "startDate", "startDate",
            "status", "status",
            "totalAmount", "totalAmount");
    private static final int MAX_PAGE_SIZE = 100;

    private final ReservationRepository reservationRepository;
    private final ReservationPaymentRepository paymentRepository;
    private final PropertyRepository propertyRepository;
    private final NotificationRepository notificationRepository;
    private final PropertyAvailabilityRepository availabilityRepository;
    private final PropertySamsarRepository propertySamsarRepository;
    private final PropertySeasonalPriceRepository seasonalPriceRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final ReservationEventService eventService;
    private final AccessService accessService;

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
        Map<Long, BigDecimal> paid = paidByReservation(managed);
        return managed.stream().map(r -> {
            BigDecimal received = paid.getOrDefault(r.getId(), Money.ZERO);
            return accessService.isOwner(r.getProperty(), userId)
                    ? new ReservationEarning(r.getId(), ReservationEarnings.owner(r, received), Money.ZERO)
                    : new ReservationEarning(r.getId(), ReservationEarnings.samsar(r, received), ReservationEarnings.samsarUpcoming(r, received));
        }).toList();
    }

    /** Total received per booking, in one query. */
    public Map<Long, BigDecimal> paidByReservation(Collection<Reservation> reservations) {
        Map<Long, BigDecimal> paid = new HashMap<>();
        if (reservations.isEmpty()) {
            return paid;
        }
        for (Object[] row : paymentRepository.sumByReservationIds(reservations.stream().map(Reservation::getId).toList())) {
            paid.put((Long) row[0], Money.of((BigDecimal) row[1]));
        }
        return paid;
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

    /** Payments and history are for the ones managing the booking: its samsar and the owner of the house. */
    public List<ReservationPayment> findPayments(Long id, Long userId) {
        accessService.requireReservationAccess(getReservation(id), userId);
        return paymentRepository.findByReservationIdOrderByPaidOnAscIdAsc(id);
    }

    public List<ReservationEvent> findEvents(Long id, Long userId) {
        accessService.requireReservationAccess(getReservation(id), userId);
        return eventService.findByReservation(id);
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

    /** Repairs old rows: statuses such as "in_progress" or "Pending", and amounts computed before their columns. */
    @Transactional
    public int normalizeLegacyData() {
        int fixed = 0;
        for (Reservation r : reservationRepository.findAll()) {
            String status = normalizeStatus(r.getStatus());
            boolean changed = !status.equals(r.getStatus());
            r.setStatus(status);
            if (r.getBaseAmount() == null || r.getSamsarGain() == null) {
                // Bookings older than these columns take the rates and the deal currently in force
                Property property = accessService.getProperty(r.getPropertyId());
                if (r.getBaseAmount() == null && property.getPricePerDay() != null) {
                    r.setBaseAmount(computeBaseAmount(property, r.getStartDate(), r.getEndDate()));
                    changed = true;
                }
                if (r.getSamsarGain() == null) {
                    freezeSamsarDeal(r, property, r.getSamsarId());
                    r.setSamsarGain(computeSamsarGain(r, property));
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

        freezeSamsarDeal(reservation, property, userId);
        validate(reservation, property, userId);
        reservation.setSamsarGain(computeSamsarGain(reservation, property));
        requireNotInPast(reservation.getStartDate());
        Reservation saved = reservationRepository.save(reservation);

        User actor = userRepository.findById(userId).orElse(null);
        syncAdvancePayment(saved, userId);
        eventService.record(saved, actor, "created", Map.of(
                "status", saved.getStatus(), "total", saved.getTotalAmount(), "advance", saved.getAdvanceAmount()));
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
        String status = normalizeStatus(holder.getStatus());
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

        String status = normalizeStatus(reservation.getStatus());
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
        reservation.setSamsarGain(computeSamsarGain(reservation, property));
        BigDecimal paidOutsideAdvance = Money.minus(paymentRepository.sumByReservationId(reservation.getId()), previousAdvance);
        if (Money.greaterThan(Money.of(reservation.getAdvanceAmount()).add(paidOutsideAdvance), reservation.getTotalAmount())) {
            throw new IllegalArgumentException("The total cannot go below what was already paid");
        }
        reservation = reservationRepository.save(reservation);
        syncAdvancePayment(reservation, userId);
        requireRefundsWithinReceived(reservation);

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
        if (!IN_PROGRESS.equals(normalizeStatus(reservation.getStatus()))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only a stay in progress can end early");
        }
        LocalDate newEnd = parseDate(dto.getEndDate(), "end date");
        if (newEnd.isBefore(reservation.getStartDate()) || !newEnd.isBefore(reservation.getEndDate())) {
            throw new IllegalArgumentException("The new end must be between the arrival and the planned end");
        }
        Property property = reservation.getProperty();
        User actor = userRepository.findById(userId).orElse(null);
        if (Money.isPositive(dto.getRefundAmount())) {
            applyRefund(reservation, property, dto.getRefundAmount(), userId, actor);
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

    /** Sets what the caller gave back to the client, out of his own part (0 removes it). */
    @Transactional
    public Reservation setRefund(Long id, BigDecimal amount, Long userId) {
        Reservation reservation = getReservation(id);
        User actor = userRepository.findById(userId).orElse(null);
        applyRefund(reservation, reservation.getProperty(), amount, userId, actor);
        return reservationRepository.save(reservation);
    }

    /**
     * Giving money back is always voluntary, and each one gives from what he has received: the owner from his
     * part of the payments, the samsar who booked from his gain. An advance is not returned on cancellation
     * unless the owner chooses to, in full or in part.
     */
    private void applyRefund(Reservation reservation, Property property, BigDecimal amount, Long userId, User actor) {
        boolean owner = accessService.isOwner(property, userId);
        if (!owner && !userId.equals(reservation.getSamsarId())) {
            throw new AccessDeniedException("You cannot give money back on this reservation");
        }
        String status = normalizeStatus(reservation.getStatus());
        if (PENDING.equals(status) || COMPLETED.equals(status)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Money cannot be given back at this stage of the reservation");
        }
        BigDecimal paid = paymentRepository.sumByReservationId(reservation.getId());
        BigDecimal limit = owner ? ReservationEarnings.ownerReceived(reservation, paid) : ReservationEarnings.samsarReceived(reservation, paid);
        if (amount == null || Money.isNegative(amount) || Money.greaterThan(amount, limit)) {
            throw new IllegalArgumentException(String.format(Locale.ROOT, "The amount given back must be between 0 and %.2f TND", limit));
        }
        if (owner) {
            reservation.setRefundAmount(Money.positiveOrNull(amount));
        } else {
            reservation.setSamsarRefundAmount(Money.positiveOrNull(amount));
        }
        eventService.record(reservation, actor, owner ? "refund_owner" : "refund_samsar", Map.of("amount", Money.of(amount)));
    }

    /** Money received from the client after the advance (the advance itself follows the booking's advance). */
    @Transactional
    public ReservationPayment addPayment(Long id, ReservationPaymentDto dto, Long userId) {
        Reservation reservation = getReservation(id);
        accessService.requireReservationAccess(reservation, userId);
        if (PENDING.equals(normalizeStatus(reservation.getStatus()))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Payments cannot be recorded on a pending reservation: add an advance instead");
        }
        if (!Money.isPositive(dto.getAmount())) {
            throw new IllegalArgumentException("Payments must be above zero");
        }
        LocalDate paidOn = dto.getPaidOn() == null || dto.getPaidOn().isBlank() ? LocalDate.now() : parseDate(dto.getPaidOn(), "payment date");
        if (paidOn.isAfter(LocalDate.now())) {
            throw new IllegalArgumentException("A payment cannot be dated in the future");
        }
        BigDecimal paid = paymentRepository.sumByReservationId(reservation.getId());
        if (Money.greaterThan(Money.of(paid).add(Money.of(dto.getAmount())), reservation.getTotalAmount())) {
            throw new IllegalArgumentException("Payments cannot exceed the total of the reservation");
        }
        ReservationPayment payment = paymentRepository.save(ReservationPayment.builder()
                .reservationId(reservation.getId())
                .amount(Money.of(dto.getAmount()))
                .paidOn(paidOn)
                .kind(ReservationPayment.PAYMENT)
                .note(dto.getNote() != null && !dto.getNote().isBlank() ? dto.getNote().trim() : null)
                .recordedBy(userId)
                .build());
        User actor = userRepository.findById(userId).orElse(null);
        eventService.record(reservation, actor, "payment_added", Map.of("amount", payment.getAmount(), "paidOn", paidOn.toString()));
        return payment;
    }

    @Transactional
    public void removePayment(Long id, Long paymentId, Long userId) {
        Reservation reservation = getReservation(id);
        accessService.requireReservationAccess(reservation, userId);
        ReservationPayment payment = paymentRepository.findById(paymentId)
                .filter(p -> p.getReservationId().equals(reservation.getId()))
                .orElseThrow(() -> new RuntimeException("Payment not found"));
        if (ReservationPayment.ADVANCE.equals(payment.getKind())) {
            throw new IllegalArgumentException("The advance is changed by editing the reservation");
        }
        paymentRepository.delete(payment);
        paymentRepository.flush();
        requireRefundsWithinReceived(reservation);
        User actor = userRepository.findById(userId).orElse(null);
        eventService.record(reservation, actor, "payment_removed", Map.of("amount", payment.getAmount(), "paidOn", payment.getPaidOn().toString()));
    }

    /** What was given back can never exceed what was received, after a payment is removed or the advance lowered. */
    private void requireRefundsWithinReceived(Reservation reservation) {
        BigDecimal paid = paymentRepository.sumByReservationId(reservation.getId());
        if (Money.greaterThan(reservation.getRefundAmount(), ReservationEarnings.ownerReceived(reservation, paid))
                || Money.greaterThan(reservation.getSamsarRefundAmount(), ReservationEarnings.samsarReceived(reservation, paid))) {
            throw new IllegalArgumentException("Lower the money given back first: it would exceed what was received");
        }
    }

    /** The advance has its own payment row, kept equal to the advance of the booking. */
    private void syncAdvancePayment(Reservation reservation, Long userId) {
        Optional<ReservationPayment> existing = paymentRepository.findFirstByReservationIdAndKind(reservation.getId(), ReservationPayment.ADVANCE);
        if (!Money.isPositive(reservation.getAdvanceAmount())) {
            existing.ifPresent(paymentRepository::delete);
            return;
        }
        ReservationPayment advance = existing.orElseGet(() -> ReservationPayment.builder()
                .reservationId(reservation.getId())
                .kind(ReservationPayment.ADVANCE)
                .paidOn(LocalDate.now())
                .recordedBy(userId)
                .build());
        advance.setAmount(Money.of(reservation.getAdvanceAmount()));
        paymentRepository.save(advance);
    }

    @Transactional
    public void delete(Long id, Long userId) {
        Reservation reservation = getReservation(id);
        accessService.requireReservationAccess(reservation, userId);
        Property property = reservation.getProperty();
        User actor = userRepository.findById(userId).orElse(null);

        eventService.record(reservation, actor, "deleted", Map.of("client", reservation.getClientName()));
        notificationRepository.deleteByReservationId(reservation.getId());
        paymentRepository.deleteByReservationId(reservation.getId());
        reservationRepository.delete(reservation);

        if (actor != null) {
            notificationService.notifyReservationDeleted(reservation, property, actor);
        }
    }

    // ------------------------------------------------------------------------------------------ pricing

    /** Copies the deal granted by the owner onto the booking. A booking by the owner has no samsar deal. */
    private void freezeSamsarDeal(Reservation reservation, Property property, Long bookerId) {
        if (accessService.isOwner(property, bookerId)) {
            return;
        }
        propertySamsarRepository.findByPropertyIdAndSamsarId(property.getId(), bookerId).ifPresent(deal -> {
            reservation.setSamsarMarginTnd(deal.getPriceIncreaseTnd());
            reservation.setSamsarCommissionPercent(deal.getCommissionPercent());
        });
    }

    /**
     * Price of a stay day by day, last day included: the price of the period covering each day, else the
     * main price (7 days at 100 then 3 days at 200 = 1300). Null when the house has no price at all.
     */
    private BigDecimal computeBaseAmount(Property property, LocalDate start, LocalDate end) {
        if (property.getPricePerDay() == null) {
            return null;
        }
        List<PropertySeasonalPrice> periods = seasonalPriceRepository.findByPropertyIdOrderByStartDateAsc(property.getId());
        BigDecimal amount = Money.ZERO;
        for (LocalDate day = start; !day.isAfter(end); day = day.plusDays(1)) {
            String monthDay = day.toString().substring(5);
            amount = amount.add(periods.stream()
                    .filter(period -> period.covers(monthDay))
                    .map(PropertySeasonalPrice::getPricePerDay)
                    .findFirst()
                    .orElse(property.getPricePerDay()));
        }
        return Money.of(amount);
    }

    /**
     * Commission: its percentage of the total (300 TND at 10% = 30 for the samsar, 270 for the owner).
     * Fixed margin: what was charged above the house price; on a negotiated price, which already is what the
     * client pays, the margin per day still goes to him and comes out of the owner's part.
     * The owner's own bookings earn no samsar anything.
     */
    private BigDecimal computeSamsarGain(Reservation reservation, Property property) {
        if (accessService.isOwner(property, reservation.getSamsarId())) {
            return Money.ZERO;
        }
        BigDecimal total = Money.of(reservation.getTotalAmount());
        if (reservation.getSamsarCommissionPercent() != null) {
            return Money.percent(total, reservation.getSamsarCommissionPercent());
        }
        if (reservation.getNegotiatedPricePerDay() != null) {
            int margin = reservation.getSamsarMarginTnd() != null ? reservation.getSamsarMarginTnd() : 0;
            return Money.min(total, Money.times(Money.of(margin), days(reservation.getStartDate(), reservation.getEndDate())));
        }
        if (reservation.getBaseAmount() != null) {
            return Money.minus(total, reservation.getBaseAmount());
        }
        return Money.ZERO;
    }

    private static long days(LocalDate start, LocalDate end) {
        return ChronoUnit.DAYS.between(start, end) + 1;
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
        LocalDate start = reservation.getStartDate();
        LocalDate end = reservation.getEndDate();
        if (end.isBefore(start)) {
            throw new IllegalArgumentException("End date must be on or after start date");
        }
        if (!TIME_PATTERN.matcher(reservation.getCheckInTime()).matches()
                || !TIME_PATTERN.matcher(reservation.getCheckOutTime()).matches()) {
            throw new IllegalArgumentException("Times must use the HH:mm format");
        }

        BigDecimal total = reservation.getTotalAmount();
        if (total == null || Money.isNegative(total)) {
            throw new IllegalArgumentException("Total amount is required and must be positive");
        }
        if (Money.isNegative(reservation.getAdvanceAmount()) || Money.greaterThan(reservation.getAdvanceAmount(), total)) {
            throw new IllegalArgumentException("Advance must be between 0 and the total amount");
        }

        if (reservation.getBaseAmount() == null) {
            reservation.setBaseAmount(computeBaseAmount(property, start, end));
        }
        long days = days(start, end);
        BigDecimal negotiated = reservation.getNegotiatedPricePerDay();
        if (negotiated != null && reservation.getBaseAmount() != null
                && Money.times(negotiated, days).compareTo(reservation.getBaseAmount()) >= 0) {
            throw new IllegalArgumentException("A negotiated price must be below the usual price of the stay");
        }
        if ((negotiated != null || reservation.getBaseAmount() != null) && !accessService.isOwner(property, bookerId)) {
            int margin = reservation.getSamsarMarginTnd() != null ? reservation.getSamsarMarginTnd() : 0;
            BigDecimal max = negotiated != null
                    ? Money.times(negotiated, days)
                    : Money.of(reservation.getBaseAmount()).add(Money.times(Money.of(margin), days));
            if (Money.greaterThan(total, max)) {
                throw new IllegalArgumentException(String.format(Locale.ROOT, "Total exceeds the allowed maximum of %.0f TND", max));
            }
        }

        Long excludeId = reservation.getId() != null ? reservation.getId() : -1L;
        if (!reservationRepository.findOverlapping(property.getId(), start, end, excludeId).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "These dates overlap an existing reservation");
        }
        if (availabilityRepository.existsBlockedBetween(property.getId(), start, end)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Some of these dates are marked unavailable by the owner");
        }
    }

    private void requireNotInPast(LocalDate startDate) {
        if (startDate.isBefore(LocalDate.now())) {
            throw new IllegalArgumentException("A reservation cannot start in the past");
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
