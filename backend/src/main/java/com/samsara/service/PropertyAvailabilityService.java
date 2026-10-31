package com.samsara.service;

import com.samsara.entity.PropertyAvailability;
import com.samsara.repository.PropertyAvailabilityRepository;
import com.samsara.repository.ReservationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class PropertyAvailabilityService {

    /** Manual statuses of the spec: available, pending (option held), unavailable. */
    private static final Set<String> STATUSES = Set.of("available", "pending", "unavailable");
    private static final int MAX_RANGE_DAYS = 366;

    private final PropertyAvailabilityRepository availabilityRepository;
    private final ReservationRepository reservationRepository;
    private final AccessService accessService;

    public List<PropertyAvailability> findByProperty(Long propertyId, Long userId) {
        accessService.requireWorkOn(propertyId, userId);
        return availabilityRepository.findByPropertyIdOrderByDateAsc(propertyId);
    }

    public List<String> findBlockedDates(Long propertyId) {
        return availabilityRepository.findByPropertyIdOrderByDateAsc(propertyId).stream()
                .filter(pa -> !"available".equals(pa.getStatus()))
                .map(PropertyAvailability::getDate)
                .toList();
    }

    @Transactional
    public PropertyAvailability setAvailability(Long propertyId, String date, String status, String notes, Long userId) {
        List<PropertyAvailability> saved = setRange(propertyId, date, date, status, notes, userId);
        return saved.isEmpty() ? null : saved.get(0);
    }

    /**
     * Sets the manual status of every day of a period (upsert). Marking days "available" simply
     * removes the manual entries. Days held by a reservation cannot be blocked again.
     */
    @Transactional
    public List<PropertyAvailability> setRange(Long propertyId, String startDate, String endDate,
                                               String status, String notes, Long userId) {
        accessService.requireOwner(propertyId, userId);
        String normalized = status == null ? "available" : status.trim().toLowerCase();
        if ("blocked".equals(normalized)) normalized = "unavailable";
        if (!STATUSES.contains(normalized)) {
            throw new IllegalArgumentException("Status must be available, pending or unavailable");
        }

        LocalDate start;
        LocalDate end;
        try {
            start = LocalDate.parse(startDate);
            end = LocalDate.parse(endDate);
        } catch (DateTimeParseException | NullPointerException e) {
            throw new IllegalArgumentException("Invalid dates (expected yyyy-MM-dd)");
        }
        if (end.isBefore(start)) {
            throw new IllegalArgumentException("End date must be on or after start date");
        }
        if (start.plusDays(MAX_RANGE_DAYS).isBefore(end)) {
            throw new IllegalArgumentException("Period too long");
        }

        if ("available".equals(normalized)) {
            availabilityRepository.deleteByPropertyIdAndDateBetween(propertyId, startDate, endDate);
            return List.of();
        }
        if (!reservationRepository.findOverlapping(propertyId, startDate, endDate, -1L).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Some of these dates are already reserved");
        }
        // Blocking dates under a pending request would leave it impossible to honour: cancel it first
        if (!reservationRepository.findPendingOverlapping(propertyId, startDate, endDate, -1L).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A pending reservation uses some of these dates: cancel it first");
        }

        List<PropertyAvailability> result = new ArrayList<>();
        for (LocalDate day = start; !day.isAfter(end); day = day.plusDays(1)) {
            String iso = day.toString();
            PropertyAvailability pa = availabilityRepository.findByPropertyIdAndDate(propertyId, iso)
                    .orElseGet(() -> PropertyAvailability.builder().propertyId(propertyId).date(iso).build());
            pa.setStatus(normalized);
            pa.setNotes(notes);
            result.add(availabilityRepository.save(pa));
        }
        return result;
    }

    public void delete(Long id, Long userId) {
        PropertyAvailability pa = availabilityRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Availability not found"));
        if (!accessService.isOwner(accessService.getProperty(pa.getPropertyId()), userId)) {
            throw new AccessDeniedException("Only the property owner can do this");
        }
        availabilityRepository.delete(pa);
    }
}
