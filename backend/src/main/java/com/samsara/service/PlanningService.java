package com.samsara.service;

import com.samsara.dto.PlanningDto;
import com.samsara.dto.PlanningOverviewDto;
import com.samsara.entity.Property;
import com.samsara.entity.PropertySamsar;
import com.samsara.entity.Reservation;
import com.samsara.repository.PropertyAvailabilityRepository;
import com.samsara.repository.PropertyRepository;
import com.samsara.repository.PropertySamsarRepository;
import com.samsara.repository.ReservationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.*;

import static com.samsara.service.ReservationStatus.*;

/** Planning of every house the user works on: his own houses and the ones shared with him. */
@Service
@RequiredArgsConstructor
public class PlanningService {

    /** A week across two months, or a few weeks of Gantt: never more than this per request. */
    private static final int MAX_DAYS = 62;
    private static final int OVERVIEW_MONTHS = 12;
    private static final int TO_CONFIRM_SHOWN = 5;
    /** Statuses that hold the dates: they count as booked nights. */
    private static final Set<String> HOLDING = Set.of(CONFIRMED, IN_PROGRESS, COMPLETED);

    private final PropertyRepository propertyRepository;
    private final PropertySamsarRepository propertySamsarRepository;
    private final ReservationRepository reservationRepository;
    private final PropertyAvailabilityRepository availabilityRepository;
    private final Clock clock;

    /**
     * @param month yyyy-MM, the current month when nothing is given
     * @param from  with {@code to}, any period of {@value #MAX_DAYS} days at most (yyyy-MM-dd)
     */
    public PlanningDto period(Long userId, String month, String from, String to) {
        LocalDate start;
        LocalDate end;
        if (from != null && !from.isBlank() && to != null && !to.isBlank()) {
            start = ReservationStatus.parseDate(from, "start date");
            end = ReservationStatus.parseDate(to, "end date");
            if (end.isBefore(start) || ChronoUnit.DAYS.between(start, end) >= MAX_DAYS) {
                throw new IllegalArgumentException("The planning covers 62 days at most");
            }
        } else {
            YearMonth period;
            try {
                period = month == null || month.isBlank() ? YearMonth.now(clock) : YearMonth.parse(month);
            } catch (DateTimeParseException e) {
                throw new IllegalArgumentException("Invalid month (expected yyyy-MM)");
            }
            start = period.atDay(1);
            end = period.atEndOfMonth();
        }

        Map<Long, Property> houses = housesOf(userId);
        if (houses.isEmpty()) {
            return new PlanningDto(start.toString(), end.toString(), List.of(), List.of(), List.of());
        }
        List<Long> ids = new ArrayList<>(houses.keySet());
        return new PlanningDto(start.toString(), end.toString(),
                houses.values().stream().map(p -> new PlanningDto.House(p.getId(), p.getTitle())).toList(),
                reservationRepository.findForPlanning(ids, start, end).stream()
                        .map(r -> new PlanningDto.Stay(r.getId(), r.getPropertyId(), r.getStartDate().toString(),
                                r.getEndDate().toString(), normalize(r.getStatus()), r.getClientName(),
                                r.getCheckInTime(), r.getCheckOutTime()))
                        .toList(),
                availabilityRepository.findBlockedForPlanning(ids, start, end).stream()
                        .map(a -> new PlanningDto.Blocked(a.getPropertyId(), a.getDate().toString()))
                        .toList());
    }

    /** The twelve months from the current one, and what needs attention today. */
    public PlanningOverviewDto overview(Long userId) {
        LocalDate today = LocalDate.now(clock);
        YearMonth first = YearMonth.from(today);
        LocalDate start = first.atDay(1);
        LocalDate end = first.plusMonths(OVERVIEW_MONTHS - 1).atEndOfMonth();

        Map<Long, Property> houses = housesOf(userId);
        List<Reservation> stays = houses.isEmpty() ? List.of()
                : reservationRepository.findForPlanning(new ArrayList<>(houses.keySet()), start, end);

        Map<String, Integer> bookedByDay = new TreeMap<>();
        Map<YearMonth, int[]> perMonth = new LinkedHashMap<>();
        for (int i = 0; i < OVERVIEW_MONTHS; i++) {
            perMonth.put(first.plusMonths(i), new int[3]);
        }
        for (Reservation r : stays) {
            String status = normalize(r.getStatus());
            int[] arrivalMonth = perMonth.get(YearMonth.from(r.getStartDate()));
            if (PENDING.equals(status)) {
                if (arrivalMonth != null) arrivalMonth[2]++;
                continue;
            }
            if (!HOLDING.contains(status)) continue;
            if (arrivalMonth != null) arrivalMonth[1]++;
            for (LocalDate day = max(r.getStartDate(), start); !day.isAfter(min(r.getEndDate(), end)); day = day.plusDays(1)) {
                perMonth.get(YearMonth.from(day))[0]++;
                bookedByDay.merge(day.toString(), 1, Integer::sum);
            }
        }
        List<PlanningOverviewDto.Month> months = perMonth.entrySet().stream()
                .map(e -> new PlanningOverviewDto.Month(e.getKey().toString(), e.getValue()[0],
                        houses.size() * e.getKey().lengthOfMonth(), e.getValue()[1], e.getValue()[2]))
                .toList();

        List<Reservation> toConfirm = stays.stream()
                .filter(r -> PENDING.equals(normalize(r.getStatus())) && !r.getStartDate().isBefore(today))
                .sorted(Comparator.comparing(Reservation::getStartDate))
                .toList();
        return new PlanningOverviewDto(houses.size(), months, bookedByDay, toConfirm.size(),
                toConfirm.stream().limit(TO_CONFIRM_SHOWN).map(r -> item(r, houses, null)).toList(),
                stays.stream().filter(r -> HOLDING.contains(normalize(r.getStatus())) && r.getStartDate().equals(today))
                        .map(r -> item(r, houses, r.getCheckInTime())).toList(),
                stays.stream().filter(r -> IN_PROGRESS.equals(normalize(r.getStatus())) && r.getEndDate().equals(today))
                        .map(r -> item(r, houses, r.getCheckOutTime())).toList());
    }

    private Map<Long, Property> housesOf(Long userId) {
        Map<Long, Property> houses = new LinkedHashMap<>();
        propertyRepository.findByCreatedBy(userId, Sort.by("title")).forEach(p -> houses.put(p.getId(), p));
        propertySamsarRepository.findBySamsarId(userId).stream()
                .map(PropertySamsar::getProperty)
                .filter(Objects::nonNull)
                .sorted(Comparator.comparing(Property::getTitle, String.CASE_INSENSITIVE_ORDER))
                .forEach(p -> houses.putIfAbsent(p.getId(), p));
        return houses;
    }

    private static PlanningOverviewDto.Item item(Reservation r, Map<Long, Property> houses, String time) {
        Property house = houses.get(r.getPropertyId());
        return new PlanningOverviewDto.Item(r.getId(), r.getClientName(), house != null ? house.getTitle() : null,
                r.getStartDate().toString(), r.getEndDate().toString(), time);
    }

    private static LocalDate max(LocalDate a, LocalDate b) {
        return a.isAfter(b) ? a : b;
    }

    private static LocalDate min(LocalDate a, LocalDate b) {
        return a.isBefore(b) ? a : b;
    }
}
