package com.samsara.dto;

import lombok.Data;

@Data
public class ReservationEarlyEndDto {
    private String endDate;
    /** Optional money given back to the client; only the owner of the house can set it. */
    private Double refundAmount;
}
