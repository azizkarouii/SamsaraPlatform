package com.samsara.service;

import com.samsara.dto.ReservationPaymentDto;
import com.samsara.entity.Property;
import com.samsara.entity.Reservation;
import com.samsara.entity.ReservationPayment;
import com.samsara.entity.User;
import com.samsara.repository.ReservationPaymentRepository;
import com.samsara.repository.ReservationRepository;
import com.samsara.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

import static com.samsara.service.ReservationStatus.*;

/**
 * Money of a booking: the advance, the balance taken as paid at arrival, the other payments received,
 * and what the owner or the samsar chose to give back.
 */
@Service
@RequiredArgsConstructor
public class ReservationPaymentService {

    private final ReservationRepository reservationRepository;
    private final ReservationPaymentRepository paymentRepository;
    private final UserRepository userRepository;
    private final ReservationEventService eventService;
    private final AccessService accessService;

    /** Payments are for the ones managing the booking: its samsar and the owner of the house. */
    public List<ReservationPayment> findPayments(Long id, Long userId) {
        accessService.requireReservationAccess(getReservation(id), userId);
        return paymentRepository.findByReservationIdOrderByPaidOnAscIdAsc(id);
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

    /** Money received from the client after the advance (the advance itself follows the booking's advance). */
    @Transactional
    public ReservationPayment addPayment(Long id, ReservationPaymentDto dto, Long userId) {
        Reservation reservation = getReservation(id);
        accessService.requireReservationAccess(reservation, userId);
        if (PENDING.equals(normalize(reservation.getStatus()))) {
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
    void applyRefund(Reservation reservation, Property property, BigDecimal amount, Long userId, User actor) {
        boolean owner = accessService.isOwner(property, userId);
        if (!owner && !userId.equals(reservation.getSamsarId())) {
            throw new AccessDeniedException("You cannot give money back on this reservation");
        }
        String status = normalize(reservation.getStatus());
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

    /** What was given back can never exceed what was received, after a payment is removed or the advance lowered. */
    void requireRefundsWithinReceived(Reservation reservation) {
        BigDecimal paid = paymentRepository.sumByReservationId(reservation.getId());
        if (Money.greaterThan(reservation.getRefundAmount(), ReservationEarnings.ownerReceived(reservation, paid))
                || Money.greaterThan(reservation.getSamsarRefundAmount(), ReservationEarnings.samsarReceived(reservation, paid))) {
            throw new IllegalArgumentException("Lower the money given back first: it would exceed what was received");
        }
    }

    /** What was received besides the advance, to check a new total or advance against it. */
    BigDecimal paidOutsideAdvance(Reservation reservation, BigDecimal advance) {
        return Money.minus(paymentRepository.sumByReservationId(reservation.getId()), advance);
    }

    /** The advance has its own payment row, kept equal to the advance of the booking. */
    void syncAdvancePayment(Reservation reservation, Long userId) {
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
        // A balance taken at arrival is what remained then: it shrinks when the advance grows
        paymentRepository.findFirstByReservationIdAndKind(reservation.getId(), ReservationPayment.BALANCE).ifPresent(balance -> {
            BigDecimal others = Money.of(paymentRepository.sumByReservationId(reservation.getId())).subtract(balance.getAmount());
            BigDecimal remaining = Money.minus(reservation.getTotalAmount(), others);
            if (Money.isPositive(remaining)) {
                balance.setAmount(Money.min(balance.getAmount(), remaining));
                paymentRepository.save(balance);
            } else {
                paymentRepository.delete(balance);
            }
        });
    }

    /**
     * The client pays what remains when he arrives: it is recorded on its own, so the owner's part and the
     * samsar's gain count from the start of the stay. It can be deleted if the client did not pay it.
     */
    void recordBalanceOnArrival(Reservation reservation) {
        BigDecimal remaining = Money.minus(reservation.getTotalAmount(), paymentRepository.sumByReservationId(reservation.getId()));
        if (!Money.isPositive(remaining)) {
            return;
        }
        paymentRepository.save(ReservationPayment.builder()
                .reservationId(reservation.getId())
                .amount(remaining)
                .paidOn(LocalDate.now())
                .kind(ReservationPayment.BALANCE)
                .build());
        eventService.record(reservation, null, "balance_recorded", Map.of("amount", remaining));
    }

    /** A deleted booking takes its payments with it. */
    void deleteAll(Reservation reservation) {
        paymentRepository.deleteByReservationId(reservation.getId());
    }

    private Reservation getReservation(Long id) {
        return reservationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Reservation not found"));
    }
}
