package com.samsara.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * A photo of a property. The file itself lives in the image storage; the table keeps its storage key
 * (image_path), its display order (position 0 = cover, mirrored by is_main) and basic metadata.
 */
// Lazy proxies carry Hibernate internals that Jackson cannot serialize
@com.fasterxml.jackson.annotation.JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
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

    /** Storage key, e.g. "properties/12/3f9c...e1.webp" (never the name of the uploaded file). */
    @Column(name = "image_path", nullable = false)
    private String imagePath;

    @Column(name = "is_main")
    private Boolean isMain;

    private Integer position;

    @Column(name = "content_type", length = 50)
    private String contentType;

    @Column(name = "size_bytes")
    private Long sizeBytes;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "property_id", insertable = false, updatable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Property property;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (isMain == null) isMain = false;
        if (position == null) position = 0;
    }
}
