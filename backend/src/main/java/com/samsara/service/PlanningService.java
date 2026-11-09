package com.samsara.service;

import com.samsara.dto.PlanningDto;
import com.samsara.entity.Property;
import com.samsara.entity.PropertySamsar;
import com.samsara.repository.PropertyAvailabilityRepository;
import com.samsara.repository.PropertyRepository;
import com.samsara.repository.PropertySamsarRepository;
import com.samsara.repository.ReservationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.*;

/** Month view of every house the user works on: his own houses and the ones shared with him. */
@Service
@RequiredArgsConstructor
public class PlanningService {

    private final PropertyRepository propertyRepository;
    private final PropertySamsarRepository propertySamsarRepository;
    private final ReservationRepository reservationRepository;
    private final PropertyAvailabilityRepository availabilityRepository;

    /** @param month yyyy-MM, the current month when empty */
    public PlanningDto month(Long userId, String month) {
        YearMonth period;
        try {
            period = month == null || month.isBlank() ? YearMonth.now() : YearMonth.parse(month);
        } catch (DateTimeParseException e) {
            throw new IllegalArgumentException("Invalid month (expected yyyy-MM)");
        }
        LocalDate from = period.atDay(1);
        LocalDate to = period.atEndOfMonth();

        Map<Long, Property> houses = new LinkedHashMap<>();
        propertyRepository.findByCreatedBy(userId, Sort.by("title")).forEach(p -> houses.put(p.getId(), p));
        propertySamsarRepository.findBySamsarId(userId).stream()
                .map(PropertySamsar::getProperty)
                .filter(Objects::nonNull)
                .sorted(Comparator.comparing(Property::getTitle, String.CASE_INSENSITIVE_ORDER))
                .forEach(p -> houses.putIfAbsent(p.getId(), p));
        if (houses.isEmpty()) {
            return new PlanningDto(from.toString(), to.toString(), List.of(), List.of(), List.of());
        }
        List<Long> ids = new ArrayList<>(houses.keySet());

        return new PlanningDto(from.toString(), to.toString(),
                houses.values().stream().map(p -> new PlanningDto.House(p.getId(), p.getTitle())).toList(),
                reservationRepository.findForPlanning(ids, from, to).stream()
                        .map(r -> new PlanningDto.Stay(r.getId(), r.getPropertyId(), r.getStartDate().toString(),
                                r.getEndDate().toString(), ReservationStatus.normalize(r.getStatus()), r.getClientName()))
                        .toList(),
                availabilityRepository.findBlockedForPlanning(ids, from, to).stream()
                        .map(a -> new PlanningDto.Blocked(a.getPropertyId(), a.getDate().toString()))
                        .toList());
    }
}
