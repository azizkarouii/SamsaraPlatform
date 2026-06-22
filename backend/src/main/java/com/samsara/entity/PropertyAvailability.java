package com.samsara.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "property_availability", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"property_id", "date"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PropertyAvailability {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "property_id", nullable = false)
    private Long propertyId;

    @Column(nullable = false)
    private String date;

    @Column(nullable = false)
    private String status;

    private String notes;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "property_id", insertable = false, updatable = false)
    private Property property;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (status == null) status = "available";
    }
}
