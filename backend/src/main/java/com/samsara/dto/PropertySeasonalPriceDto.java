package com.samsara.dto;

import java.math.BigDecimal;
import lombok.Data;

@Data
public class PropertySeasonalPriceDto {
    private String startDate;
    private String endDate;
    private BigDecimal pricePerDay;
}
