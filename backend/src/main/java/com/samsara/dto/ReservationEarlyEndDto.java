package com.samsara.dto;

import java.math.BigDecimal;
import lombok.Data;

@Data
public class ReservationEarlyEndDto {
    private String endDate;
    /** Optional money given back to the client by the caller, out of his own part. */
    private BigDecimal refundAmount;
}
