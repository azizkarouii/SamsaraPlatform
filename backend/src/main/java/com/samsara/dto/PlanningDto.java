package com.samsara.dto;

import java.util.List;

/** A period of every house of the user: its bookings and the days its owner blocked. */
public record PlanningDto(String from, String to, List<House> houses, List<Stay> stays, List<Blocked> blocked) {

    public record House(Long id, String title) {}

    public record Stay(Long id, Long propertyId, String startDate, String endDate, String status, String clientName,
                       String checkInTime, String checkOutTime) {}

    public record Blocked(Long propertyId, String date) {}
}
