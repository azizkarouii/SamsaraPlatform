package com.samsara.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "revenue_history")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RevenueHistory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "reservation_id", nullable = false)
    private Long reservationId;

    @Column(nullable = false)
    private Double amount;

    @Column(nullable = false)
    private String type;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", insertable = false, updatable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reservation_id", insertable = false, updatable = false)
    private Reservation reservation;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
