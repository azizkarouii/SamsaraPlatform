package com.samsara.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class ReservationPaymentDto {
    private BigDecimal amount;
    /** yyyy-MM-dd; today when empty. */
    private String paidOn;
    private String note;
}
