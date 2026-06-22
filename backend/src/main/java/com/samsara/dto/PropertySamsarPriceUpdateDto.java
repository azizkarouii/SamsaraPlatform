package com.samsara.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PropertySamsarPriceUpdateDto {
    @NotNull
    private Integer priceIncreaseTnd;
}