package com.samsara.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "property_images")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PropertyImage {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "property_id", nullable = false)
    private Long propertyId;

    @Column(name = "image_path", nullable = false)
    private String imagePath;

    @Column(name = "is_main")
    private Boolean isMain;

    private Integer position;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "property_id", insertable = false, updatable = false)
    private Property property;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (isMain == null) isMain = false;
        if (position == null) position = 0;
    }
}
