package com.samsara.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "reservations")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Reservation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "property_id", nullable = false)
    private Long propertyId;

    @Column(name = "samsar_id", nullable = false)
    private Long samsarId;

    @Column(name = "start_date", nullable = false)
    private String startDate;

    @Column(name = "end_date", nullable = false)
    private String endDate;

    @Column(name = "check_in_time")
    private String checkInTime;

    @Column(name = "check_out_time")
    private String checkOutTime;

    @Column(nullable = false)
    private String status;

    @Column(name = "client_name", nullable = false)
    private String clientName;

    @Column(name = "client_phone")
    private String clientPhone;

    @Column(name = "advance_amount")
    private Double advanceAmount;

    @Column(name = "total_amount", nullable = false)
    private Double totalAmount;

    private String notes;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "property_id", insertable = false, updatable = false)
    private Property property;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "samsar_id", insertable = false, updatable = false)
    private User samsar;

    @OneToMany(mappedBy = "reservation")
    private List<RevenueHistory> revenueHistories;

    @OneToMany(mappedBy = "reservation")
    private List<Notification> notifications;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (status == null) status = "pending";
        if (checkInTime == null) checkInTime = "14:00";
        if (checkOutTime == null) checkOutTime = "12:00";
        if (advanceAmount == null) advanceAmount = 0.0;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
