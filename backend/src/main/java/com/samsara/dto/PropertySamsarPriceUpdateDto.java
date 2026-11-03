package com.samsara.dto;

import lombok.Data;

@Data
public class PropertySamsarPriceUpdateDto {
    private Integer priceIncreaseTnd;

    /** Set instead of priceIncreaseTnd for a percentage deal. */
    private Integer commissionPercent;
}