package com.samsara.service;

import com.samsara.dto.DashboardSummaryDto;
import com.samsara.dto.DashboardSummaryDto.MonthTotal;
import com.samsara.dto.DashboardSummaryDto.PropertyTotal;
import com.samsara.dto.DashboardSummaryDto.RentalEarning;
import com.samsara.entity.Reservation;
import com.samsara.entity.User;
import com.samsara.entity.UserRole;
import com.samsara.repository.PropertyRepository;
import com.samsara.repository.PropertySamsarRepository;
import com.samsara.repository.ReservationRepository;
import com.samsara.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Figures of the dashboard, the profile and the reports. An owner sees every booking of his houses and his
 * part of them; a samsar only his own bookings and his gain.
 */
@Service
@RequiredArgsConstructor
public class DashboardService {

    private static final Set<String> ONGOING = Set.of(ReservationStatus.PENDING, ReservationStatus.CONFIRMED, ReservationStatus.IN_PROGRESS);

    private final ReservationRepository reservationRepository;
    private final PropertyRepository propertyRepository;
    private final PropertySamsarRepository propertySamsarRepository;
    private final UserRepository userRepository;
    private final ReservationPaymentService paymentService;

    /** One booking seen by the user asking, with the money it brings him. */
    public record Line(Reservation reservation, BigDecimal paid, BigDecimal earned, BigDecimal upcoming, BigDecimal toCollect) {}

    @Transactional(readOnly = true)
    public DashboardSummaryDto summary(Long userId, LocalDate from, LocalDate to) {
        boolean owner = isOwner(userId);
        List<Line> all = lines(userId, owner);
        List<Line> period = all.stream().filter(line -> overlaps(line.reservation(), from, to)).toList();

        Map<String, Long> counts = period.stream()
                .collect(Collectors.groupingBy(line -> line.reservation().getStatus(), TreeMap::new, Collectors.counting()));

        Map<String, BigDecimal[]> byMonth = new TreeMap<>();
        for (Line line : period) {
            String key = line.reservation().getStartDate().toString().substring(0, 7);
            BigDecimal[] bucket = byMonth.computeIfAbsent(key, k -> new BigDecimal[]{Money.ZERO, BigDecimal.ZERO});
            bucket[0] = bucket[0].add(line.earned());
            bucket[1] = bucket[1].add(BigDecimal.ONE);
        }
        List<MonthTotal> months = byMonth.entrySet().stream()
                .map(e -> new MonthTotal(e.getKey(), e.getValue()[0], e.getValue()[1].longValue()))
                .toList();
        months = months.subList(Math.max(0, months.size() - 12), months.size());

        Map<String, BigDecimal> perProperty = new HashMap<>();
        for (Line line : period) {
            if (line.earned().signum() > 0) {
                perProperty.merge(title(line.reservation()), line.earned(), BigDecimal::add);
            }
        }
        List<PropertyTotal> byProperty = perProperty.entrySet().stream()
                .sorted(Map.Entry.<String, BigDecimal>comparingByValue().reversed())
                .limit(8)
                .map(e -> new PropertyTotal(e.getKey(), e.getValue()))
                .toList();

        LocalDate today = LocalDate.now();
        List<Reservation> arrivals = all.stream()
                .map(Line::reservation)
                .filter(r -> !r.getEndDate().isBefore(today) && ONGOING.contains(r.getStatus()))
                .sorted(Comparator.comparing(Reservation::getStartDate))
                .limit(5)
                .toList();

        List<RentalEarning> rentals = period.stream()
                .filter(line -> line.earned().signum() > 0 || line.upcoming().signum() > 0)
                .sorted(Comparator.comparing((Line line) -> line.reservation().getStartDate()).reversed())
                .limit(100)
                .map(DashboardService::rental)
                .toList();

        long propertyCount = owner ? propertyRepository.countByCreatedBy(userId) : propertySamsarRepository.countBySamsarId(userId);
        return new DashboardSummaryDto(
                sum(period, Line::earned), sum(period, Line::upcoming), sum(period, Line::toCollect),
                period.size(), counts, months, byProperty, arrivals, rentals, propertyCount);
    }

    /** Every booking with money in the period, for the reports. */
    @Transactional(readOnly = true)
    public List<Line> reportLines(Long userId, LocalDate from, LocalDate to) {
        return lines(userId, isOwner(userId)).stream()
                .filter(line -> overlaps(line.reservation(), from, to))
                .filter(line -> !ReservationStatus.PENDING.equals(line.reservation().getStatus()))
                .sorted(Comparator.comparing((Line line) -> line.reservation().getStartDate()))
                .toList();
    }

    private List<Line> lines(Long userId, boolean owner) {
        List<Reservation> reservations = owner
                ? reservationRepository.findByPropertyCreatedBy(userId)
                : reservationRepository.findBySamsarId(userId).stream().filter(r -> userId.equals(r.getSamsarId())).toList();
        Map<Long, BigDecimal> paid = paymentService.paidByReservation(reservations);
        return reservations.stream().map(r -> {
            BigDecimal received = paid.getOrDefault(r.getId(), Money.ZERO);
            BigDecimal earned = owner ? ReservationEarnings.owner(r, received) : ReservationEarnings.samsar(r, received);
            BigDecimal upcoming = owner ? Money.ZERO : ReservationEarnings.samsarUpcoming(r, received);
            return new Line(r, received, earned, upcoming, ReservationEarnings.toCollect(r, received));
        }).toList();
    }

    private boolean isOwner(Long userId) {
        return userRepository.findById(userId).map(User::getRole).orElse(UserRole.SAMSAR) == UserRole.PROPRIETAIRE;
    }

    private static boolean overlaps(Reservation r, LocalDate from, LocalDate to) {
        return (from == null || !r.getEndDate().isBefore(from)) && (to == null || !r.getStartDate().isAfter(to));
    }

    private static String title(Reservation r) {
        return r.getProperty() != null ? r.getProperty().getTitle() : "#" + r.getPropertyId();
    }

    private static BigDecimal sum(List<Line> lines, java.util.function.Function<Line, BigDecimal> amount) {
        return lines.stream().map(amount).reduce(Money.ZERO, BigDecimal::add);
    }

    private static RentalEarning rental(Line line) {
        Reservation r = line.reservation();
        return new RentalEarning(r.getId(), title(r), r.getClientName(), r.getStartDate(), r.getEndDate(), r.getStatus(),
                Money.of(r.getTotalAmount()), line.paid(), line.earned(), line.upcoming());
    }
}
