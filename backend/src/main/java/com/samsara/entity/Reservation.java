package com.samsara.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

// Lazy proxies carry Hibernate internals that Jackson cannot serialize
@com.fasterxml.jackson.annotation.JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
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

    /**
     * Price of the stay at the house rates when it was booked (main price and prices by period, day by day),
     * before any samsar margin. Kept so a later change of the rates does not touch this booking.
     */
    @Column(name = "base_amount")
    private Double baseAmount;

    /**
     * Nightly price agreed with the client below the house rates (optional). It replaces the rates for this
     * booking and carries no added margin: a samsar on commission still earns his percentage of the new total,
     * a samsar on a fixed margin earns nothing on it.
     */
    @Column(name = "negotiated_price_per_day")
    private Double negotiatedPricePerDay;

    /** End planned at booking, kept when the stay stops early. */
    @Column(name = "original_end_date")
    private String originalEndDate;

    /** Money the owner chose to give back to the client; it comes out of the owner's share. */
    @Column(name = "refund_amount")
    private Double refundAmount;

    /** Money the booking samsar chose to give back to the client; it comes out of his gain. */
    @Column(name = "samsar_refund_amount")
    private Double samsarRefundAmount;

    /** Deal in force when the samsar booked: later changes by the owner do not touch existing bookings. */
    @Column(name = "samsar_margin_tnd")
    private Integer samsarMarginTnd;

    @Column(name = "samsar_commission_percent")
    private Integer samsarCommissionPercent;

    /** What the samsar earns on this booking; the owner receives totalAmount - samsarGain. */
    @Column(name = "samsar_gain")
    private Double samsarGain;

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

    @JsonIgnore
    @OneToMany(mappedBy = "reservation")
    private List<RevenueHistory> revenueHistories;

    @JsonIgnore
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
