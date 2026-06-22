package com.samsara.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class ReservationDto {
    private Long id;
    private Long propertyId;
    private Long samsarId;
    private String startDate;
    private String endDate;
    private String checkInTime;
    private String checkOutTime;
    private String status;
    private String clientName;
    private String clientPhone;
    private Double advanceAmount;
    private Double totalAmount;
    private String notes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
