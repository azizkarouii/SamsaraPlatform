package com.samsara.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Formula;
import java.time.LocalDateTime;
import java.util.List;

// Lazy proxies carry Hibernate internals that Jackson cannot serialize
@com.fasterxml.jackson.annotation.JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Entity
@Table(name = "properties")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Property {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    private String configuration;

    @Column(name = "haut_standing")
    private Boolean hautStanding;

    @Column(name = "appartient_residence")
    private Boolean appartientResidence;

    @Column(name = "price_per_day")
    private Double pricePerDay;

    @Column(name = "price_per_week")
    private Double pricePerWeek;

    @Column(name = "price_per_month")
    private Double pricePerMonth;

    @Column(name = "distance_beach")
    private Double distanceBeach;

    @Column(name = "max_capacity")
    private Integer maxCapacity;

    private String address;

    @Column(name = "owner_contact")
    private String ownerContact;

    @Column(name = "air_condition")
    private Boolean airCondition;

    private Boolean wifi;
    private Boolean garage;
    private Boolean pool;
    private Boolean kitchen;

    @Column(name = "sea_view")
    private Boolean seaView;

    private Boolean terrace;
    private Integer bathrooms;
    private String photos;
    private String description;

    @Column(name = "created_by")
    private Long createdBy;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", insertable = false, updatable = false)
    @JsonIgnore
    private User creator;

    @OneToMany(mappedBy = "property")
    @JsonIgnore
    private List<Reservation> reservations;

    @OneToMany(mappedBy = "property")
    @JsonIgnore
    private List<PropertyAvailability> availabilities;

    @OneToMany(mappedBy = "property")
    @JsonIgnore
    private List<PropertyImage> images;

    /** Storage key of the cover photo (position 0), loaded with the property so lists need no extra request. */
    @Formula("(SELECT pi.image_path FROM property_images pi WHERE pi.property_id = id ORDER BY pi.position, pi.id LIMIT 1)")
    private String coverImage;

    @OneToMany(mappedBy = "property")
    @JsonIgnore
    private List<Notification> notifications;

    @OneToMany(mappedBy = "property")
    @JsonIgnore
    private List<PropertySamsar> propertySamsars;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
