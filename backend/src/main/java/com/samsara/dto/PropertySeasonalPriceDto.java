package com.samsara.dto;

import lombok.Data;

@Data
public class PropertySeasonalPriceDto {
    private String startDate;
    private String endDate;
    private Double pricePerDay;
}
