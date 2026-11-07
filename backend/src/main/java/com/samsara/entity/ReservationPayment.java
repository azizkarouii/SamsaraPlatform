package com.samsara.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Money received from the client for a booking. The advance has its own row (kind "advance"), kept in line
 * with the advance of the booking; every other amount is recorded as it is received (kind "payment").
 */
@Entity
@Table(name = "reservation_payments")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReservationPayment {
    public static final String ADVANCE = "advance";
    public static final String PAYMENT = "payment";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "reservation_id", nullable = false)
    private Long reservationId;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(name = "paid_on", nullable = false)
    private LocalDate paidOn;

    @Column(nullable = false, length = 20)
    private String kind;

    @Column(length = 500)
    private String note;

    @Column(name = "recorded_by")
    private Long recordedBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
