package com.samsara.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * One thing done on a booking (created, confirmed, payment recorded, money given back...), with who did it.
 * Not linked to the booking row on purpose: the history stays even if the booking is deleted.
 */
@Entity
@Table(name = "reservation_events")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReservationEvent {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "reservation_id", nullable = false)
    private Long reservationId;

    @Column(name = "property_id", nullable = false)
    private Long propertyId;

    /** Null when the application did it on its own (start or end of a stay on its dates). */
    @Column(name = "actor_id")
    private Long actorId;

    /** Name at the time of the action, so the history still reads right if the account changes. */
    @Column(name = "actor_name")
    private String actorName;

    @Column(nullable = false, length = 40)
    private String action;

    /** JSON object with the values of the action (amounts, statuses, dates). */
    @Column(columnDefinition = "text")
    private String details;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
