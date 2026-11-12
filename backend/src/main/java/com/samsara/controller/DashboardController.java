package com.samsara.controller;

import com.samsara.dto.DashboardSummaryDto;
import com.samsara.dto.DashboardSummaryDto.RentalEarning;
import com.samsara.dto.PlanningDto;
import com.samsara.dto.PlanningOverviewDto;
import com.samsara.entity.Reservation;
import com.samsara.service.DashboardService;
import com.samsara.service.DashboardService.Line;
import com.samsara.service.Money;
import com.samsara.service.PlanningService;
import com.samsara.service.XlsxWriter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class DashboardController {

    private static final Map<String, List<String>> HEADERS = Map.of(
            "fr", List.of("Maison", "Client", "Arrivée", "Départ", "Statut", "Total", "Payé", "Mes revenus"),
            "en", List.of("House", "Client", "Arrival", "Departure", "Status", "Total", "Paid", "My earnings"),
            "ar", List.of("المنزل", "العميل", "الوصول", "المغادرة", "الحالة", "الإجمالي", "المدفوع", "أرباحي"));
    private static final Map<String, String> TOTAL = Map.of("fr", "Total", "en", "Total", "ar", "الإجمالي");
    private static final Map<String, Map<String, String>> STATUSES = Map.of(
            "fr", Map.of("confirmed", "Confirmée", "in-progress", "En cours", "completed", "Terminée", "cancelled", "Annulée"),
            "en", Map.of("confirmed", "Confirmed", "in-progress", "In progress", "completed", "Completed", "cancelled", "Cancelled"),
            "ar", Map.of("confirmed", "مؤكد", "in-progress", "جارٍ", "completed", "مكتمل", "cancelled", "ملغى"));

    private final DashboardService dashboardService;
    private final PlanningService planningService;

    @GetMapping("/dashboard/summary")
    public ResponseEntity<DashboardSummaryDto> summary(@RequestParam(required = false) String from,
                                                       @RequestParam(required = false) String to,
                                                       Authentication authentication) {
        return ResponseEntity.ok(dashboardService.summary((Long) authentication.getPrincipal(), date(from), date(to)));
    }

    /** Every house of the user over one month (yyyy-MM, the current one by default) or from/to (62 days at most). */
    @GetMapping("/dashboard/planning")
    public ResponseEntity<PlanningDto> planning(@RequestParam(required = false) String month,
                                                @RequestParam(required = false) String from,
                                                @RequestParam(required = false) String to,
                                                Authentication authentication) {
        return ResponseEntity.ok(planningService.period((Long) authentication.getPrincipal(), month, from, to));
    }

    /** The twelve months ahead, the requests to confirm and today's arrivals and departures. */
    @GetMapping("/dashboard/planning/overview")
    public ResponseEntity<PlanningOverviewDto> planningOverview(Authentication authentication) {
        return ResponseEntity.ok(planningService.overview((Long) authentication.getPrincipal()));
    }

    /** Rows of the earnings report (stays overlapping the period, pending requests excluded). */
    @GetMapping("/reports/earnings")
    public ResponseEntity<List<RentalEarning>> report(@RequestParam(required = false) String from,
                                                      @RequestParam(required = false) String to,
                                                      Authentication authentication) {
        return ResponseEntity.ok(dashboardService.reportLines((Long) authentication.getPrincipal(), date(from), date(to)).stream()
                .map(DashboardController::row)
                .toList());
    }

    @GetMapping("/reports/earnings.xlsx")
    public ResponseEntity<byte[]> reportXlsx(@RequestParam(required = false) String from,
                                             @RequestParam(required = false) String to,
                                             @RequestParam(defaultValue = "fr") String lang,
                                             Authentication authentication) {
        String language = HEADERS.containsKey(lang) ? lang : "fr";
        List<Line> lines = dashboardService.reportLines((Long) authentication.getPrincipal(), date(from), date(to));
        List<List<Object>> rows = new ArrayList<>();
        rows.add(new ArrayList<>(HEADERS.get(language)));
        BigDecimal total = Money.ZERO;
        BigDecimal paid = Money.ZERO;
        BigDecimal earned = Money.ZERO;
        for (Line line : lines) {
            Reservation r = line.reservation();
            rows.add(List.of(r.getProperty() != null ? r.getProperty().getTitle() : "#" + r.getPropertyId(), r.getClientName(),
                    r.getStartDate().toString(), r.getEndDate().toString(), STATUSES.get(language).getOrDefault(r.getStatus(), r.getStatus()),
                    Money.of(r.getTotalAmount()), line.paid(), line.earned()));
            total = total.add(Money.of(r.getTotalAmount()));
            paid = paid.add(line.paid());
            earned = earned.add(line.earned());
        }
        List<Object> totals = new ArrayList<>(List.of(TOTAL.get(language), "", "", "", "", total, paid, earned));
        rows.add(totals);

        String name = "samsara-" + (from != null ? from : "debut") + "-" + (to != null ? to : "fin") + ".xlsx";
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(name, StandardCharsets.UTF_8).build().toString())
                .body(XlsxWriter.write("Samsara", rows, "ar".equals(language)));
    }

    private static RentalEarning row(Line line) {
        Reservation r = line.reservation();
        return new RentalEarning(r.getId(), r.getProperty() != null ? r.getProperty().getTitle() : "#" + r.getPropertyId(),
                r.getClientName(), r.getStartDate(), r.getEndDate(), r.getStatus(), Money.of(r.getTotalAmount()),
                line.paid(), line.earned(), line.upcoming());
    }

    private static LocalDate date(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return LocalDate.parse(value);
        } catch (DateTimeParseException e) {
            throw new IllegalArgumentException("Invalid dates (expected yyyy-MM-dd)");
        }
    }
}
