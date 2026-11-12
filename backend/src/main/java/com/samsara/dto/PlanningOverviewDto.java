package com.samsara.dto;

import java.util.List;
import java.util.Map;

/**
 * The year ahead of the planning page: booked nights month by month and day by day, the requests still
 * waiting for a confirmation, and who arrives or leaves today.
 */
public record PlanningOverviewDto(int houseCount, List<Month> months, Map<String, Integer> bookedHousesByDay,
                                  int toConfirmCount, List<Item> toConfirm, List<Item> arrivingToday, List<Item> leavingToday) {

    /** nights: nights booked in the month over all houses; capacity: houses × days. */
    public record Month(String month, int nights, int capacity, int arrivals, int pending) {}

    public record Item(Long id, String clientName, String propertyTitle, String startDate, String endDate, String time) {}
}
