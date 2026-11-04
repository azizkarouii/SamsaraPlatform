package com.samsara.dto;

import java.util.List;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import java.time.LocalDateTime;

@Data
public class PropertyDto {
    private Long id;

    @NotBlank
    private String title;
    private String configuration;
    private Boolean hautStanding;
    private Boolean appartientResidence;
    private Double pricePerDay;
    private Double pricePerWeek;
    private Double pricePerMonth;
    private Double distanceBeach;
    private Integer maxCapacity;
    private String address;
    private String ownerContact;
    private Boolean airCondition;
    private Boolean wifi;
    private Boolean garage;
    private Boolean pool;
    private Boolean kitchen;
    private Boolean seaView;
    private Boolean terrace;
    private Integer bathrooms;
    private String photos;
    private String description;
    /** Full list of prices by period; null leaves the existing ones untouched. */
    private List<PropertySeasonalPriceDto> seasonalPrices;
    /** Full list of external links; null leaves the existing ones untouched. */
    private List<String> links;
    private Long createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
