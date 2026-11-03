package com.samsara.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

/**
 * Nightly price of a property on a period coming back every year (both days included), stored as "MM-dd".
 * A start after the end crosses the new year (12-20 to 01-10). Outside any period, the main price applies.
 */
@Entity
@Table(name = "property_seasonal_prices")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PropertySeasonalPrice {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "property_id", nullable = false)
    private Long propertyId;

    @Column(name = "start_date", nullable = false)
    private String startDate;

    @Column(name = "end_date", nullable = false)
    private String endDate;

    @Column(name = "price_per_day", nullable = false)
    private Double pricePerDay;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "property_id", insertable = false, updatable = false)
    @JsonIgnore
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Property property;

    /** @param monthDay a day as "MM-dd" */
    public boolean covers(String monthDay) {
        return startDate.compareTo(endDate) <= 0
                ? startDate.compareTo(monthDay) <= 0 && endDate.compareTo(monthDay) >= 0
                : startDate.compareTo(monthDay) <= 0 || endDate.compareTo(monthDay) >= 0;
    }
}
