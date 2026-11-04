package com.samsara.dto;

import lombok.Data;

@Data
public class ReservationEarlyEndDto {
    private String endDate;
    /** Optional money given back to the client by the caller, out of his own part. */
    private Double refundAmount;
}
