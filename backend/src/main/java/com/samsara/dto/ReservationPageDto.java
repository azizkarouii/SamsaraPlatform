package com.samsara.dto;

import com.samsara.entity.Reservation;

import java.util.List;
import java.util.Map;

/** One page of reservations, with the number of reservations per status for the tabs. */
public record ReservationPageDto(List<Reservation> content, long totalElements, Map<String, Long> counts) {}
