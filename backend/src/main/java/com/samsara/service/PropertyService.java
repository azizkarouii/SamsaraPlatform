package com.samsara.service;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Page;
import java.util.Map;
import java.math.BigDecimal;
import com.samsara.dto.PageDto;
import com.samsara.dto.PropertyDto;
import com.samsara.dto.PropertySeasonalPriceDto;
import com.samsara.entity.Property;
import com.samsara.entity.PropertyLink;
import com.samsara.entity.PropertySeasonalPrice;
import com.samsara.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.net.URISyntaxException;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.springframework.data.domain.Sort;

@Service
@RequiredArgsConstructor
public class PropertyService {

    private static final int REFERENCE_LEAP_YEAR = 2024;
    private static final int MAX_LINKS = 10;

    private final PropertyRepository propertyRepository;
    private final UserRepository userRepository;
    private final ReservationRepository reservationRepository;
    private final ReservationPaymentRepository paymentRepository;
    private final NotificationRepository notificationRepository;
    private final PropertyAvailabilityRepository availabilityRepository;
    private final PropertyImageService propertyImageService;
    private final PropertySamsarRepository propertySamsarRepository;
    private final PropertySeasonalPriceRepository seasonalPriceRepository;
    private final PropertyLinkRepository propertyLinkRepository;
    private final AccessService accessService;

    public List<Property> findAll() {
        return propertyRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
    }

    public List<Property> findAvailableBetweenForUser(Long userId, String startDate, String endDate, String configuration) {
        if (startDate == null || startDate.isBlank() || endDate == null || endDate.isBlank()) {
            throw new IllegalArgumentException("Start date and end date are required");
        }
        LocalDate start = parseDate(startDate);
        LocalDate end = parseDate(endDate);
        if (start.isAfter(end)) {
            throw new IllegalArgumentException("Start date must be before or equal to end date");
        }
        List<Property> available = propertyRepository.findAvailableBetweenForUser(start, end, userId, Sort.by(Sort.Direction.DESC, "createdAt"));
        if (configuration == null || configuration.isBlank()) {
            return available;
        }
        String wanted = normalizeConfiguration(configuration);
        return available.stream()
                .filter(p -> p.getConfiguration() != null && wanted.equals(normalizeConfiguration(p.getConfiguration())))
                .toList();
    }

    /** The house type is typed freely by owners: "S+2", "s+2", "s + 2" and "S2" are the same type. */
    private static String normalizeConfiguration(String configuration) {
        return configuration.replaceAll("[\\s+]", "").toLowerCase();
    }

    public Property findById(Long id) {
        return propertyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Property not found"));
    }

    public List<Property> findByCreator(Long userId) {
        return propertyRepository.findByCreatedBy(userId, Sort.by(Sort.Direction.DESC, "createdAt"));
    }

    public List<Property> findByCreatorAndDate(Long userId, String date) {
        return propertyRepository.findAvailableOnDateByCreatedBy(parseDate(date), userId, Sort.by(Sort.Direction.DESC, "createdAt"));
    }

    private static final Map<String, String> SORTABLE = Map.of(
            "title", "title", "address", "address", "pricePerDay", "pricePerDay", "maxCapacity", "maxCapacity", "createdAt", "createdAt");

    /** "My houses": searched, sorted and paged by the database; with a date, only the houses free that day. */
    public PageDto<Property> findOwnedPage(Long userId, String search, String date, int page, int size, String sort, String direction) {
        String pattern = "%" + (search == null ? "" : search.trim().toLowerCase()) + "%";
        Sort order = Sort.by("asc".equalsIgnoreCase(direction) ? Sort.Direction.ASC : Sort.Direction.DESC,
                SORTABLE.getOrDefault(sort, "createdAt"));
        PageRequest request = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100), order);
        Page<Property> result = date == null || date.isBlank()
                ? propertyRepository.findOwnedPage(userId, pattern, request)
                : propertyRepository.findOwnedFreeOnPage(userId, pattern, parseDate(date), request);
        return new PageDto<>(result.getContent(), result.getTotalElements());
    }

    private static LocalDate parseDate(String value) {
        try {
            return LocalDate.parse(value);
        } catch (DateTimeParseException | NullPointerException e) {
            throw new IllegalArgumentException("Invalid dates (expected yyyy-MM-dd)");
        }
    }

    @Transactional
    public Property create(PropertyDto dto, Long userId) {
        if (!userRepository.existsById(userId)) {
            throw new RuntimeException("Owner not found");
        }
        validatePrices(dto);

        Property property = Property.builder()
                .title(dto.getTitle())
                .configuration(dto.getConfiguration())
                .hautStanding(dto.getHautStanding())
                .appartientResidence(dto.getAppartientResidence())
                .pricePerDay(dto.getPricePerDay())
                .pricePerWeek(dto.getPricePerWeek())
                .pricePerMonth(dto.getPricePerMonth())
                .distanceBeach(dto.getDistanceBeach())
                .maxCapacity(dto.getMaxCapacity())
                .address(dto.getAddress())
                .ownerContact(dto.getOwnerContact())
                .airCondition(dto.getAirCondition())
                .wifi(dto.getWifi())
                .garage(dto.getGarage())
                .pool(dto.getPool())
                .kitchen(dto.getKitchen())
                .seaView(dto.getSeaView())
                .terrace(dto.getTerrace())
                .bathrooms(dto.getBathrooms())
                .photos(dto.getPhotos())
                .description(dto.getDescription())
                .createdBy(userId)
                .build();
        Property saved = propertyRepository.save(property);
        saveSeasonalPrices(saved, dto.getSeasonalPrices());
        saveLinks(saved, dto.getLinks());
        return saved;
    }

    @Transactional
    public Property update(Long id, PropertyDto dto, Long userId) {
        Property property = accessService.requireOwner(id, userId);
        validatePrices(dto);
        if (dto.getTitle() != null && dto.getTitle().isBlank()) {
            throw new IllegalArgumentException("Title is required");
        }
        if (dto.getTitle() != null) property.setTitle(dto.getTitle());
        if (dto.getConfiguration() != null) property.setConfiguration(dto.getConfiguration());
        if (dto.getHautStanding() != null) property.setHautStanding(dto.getHautStanding());
        if (dto.getAppartientResidence() != null) property.setAppartientResidence(dto.getAppartientResidence());
        if (dto.getPricePerDay() != null) property.setPricePerDay(dto.getPricePerDay());
        if (dto.getPricePerWeek() != null) property.setPricePerWeek(dto.getPricePerWeek());
        if (dto.getPricePerMonth() != null) property.setPricePerMonth(dto.getPricePerMonth());
        if (dto.getDistanceBeach() != null) property.setDistanceBeach(dto.getDistanceBeach());
        if (dto.getMaxCapacity() != null) property.setMaxCapacity(dto.getMaxCapacity());
        if (dto.getAddress() != null) property.setAddress(dto.getAddress());
        if (dto.getOwnerContact() != null) property.setOwnerContact(dto.getOwnerContact());
        if (dto.getAirCondition() != null) property.setAirCondition(dto.getAirCondition());
        if (dto.getWifi() != null) property.setWifi(dto.getWifi());
        if (dto.getGarage() != null) property.setGarage(dto.getGarage());
        if (dto.getPool() != null) property.setPool(dto.getPool());
        if (dto.getKitchen() != null) property.setKitchen(dto.getKitchen());
        if (dto.getSeaView() != null) property.setSeaView(dto.getSeaView());
        if (dto.getTerrace() != null) property.setTerrace(dto.getTerrace());
        if (dto.getBathrooms() != null) property.setBathrooms(dto.getBathrooms());
        if (dto.getPhotos() != null) property.setPhotos(dto.getPhotos());
        if (dto.getDescription() != null) property.setDescription(dto.getDescription());
        Property saved = propertyRepository.save(property);
        saveSeasonalPrices(saved, dto.getSeasonalPrices());
        saveLinks(saved, dto.getLinks());
        return saved;
    }

    /**
     * Deletes a property and its history. Refused while a reservation still holds it so that
     * no client booking silently disappears.
     */
    @Transactional
    public void delete(Long id, Long userId) {
        Property property = accessService.requireOwner(id, userId);
        if (reservationRepository.existsActiveByPropertyId(id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "This property still has pending, confirmed or in-progress reservations");
        }
        for (Long reservationId : reservationRepository.findIdsByPropertyId(id)) {
            paymentRepository.deleteByReservationId(reservationId);
            notificationRepository.deleteByReservationId(reservationId);
            reservationRepository.deleteById(reservationId);
        }
        notificationRepository.deleteByPropertyId(id);
        availabilityRepository.deleteByPropertyId(id);
        propertyImageService.deleteAllOfProperty(id);
        seasonalPriceRepository.deleteByPropertyId(id);
        propertyLinkRepository.deleteByPropertyId(id);
        propertySamsarRepository.deleteByPropertyId(id);
        propertyRepository.delete(property);
    }

    /** Replaces the external links of a house. Only http(s): these end up as clickable links for everyone. */
    private void saveLinks(Property property, List<String> requested) {
        if (requested == null) {
            return;
        }
        if (requested.size() > MAX_LINKS) {
            throw new IllegalArgumentException("A house can have at most " + MAX_LINKS + " links");
        }
        List<PropertyLink> links = requested.stream()
                .map(url -> PropertyLink.builder().propertyId(property.getId()).url(validLink(url)).build())
                .toList();
        propertyLinkRepository.deleteByPropertyId(property.getId());
        property.setLinks(propertyLinkRepository.saveAll(links));
    }

    private String validLink(String url) {
        String trimmed = url == null ? "" : url.trim();
        try {
            URI uri = new URI(trimmed);
            boolean web = "http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme());
            if (web && uri.getHost() != null && trimmed.length() <= 1000) {
                return trimmed;
            }
        } catch (URISyntaxException e) {
            // Reported below with the same message
        }
        throw new IllegalArgumentException("Links must be valid web addresses (http or https)");
    }

    /** Replaces the prices by period of a house; they complete the main price, which must exist. */
    private void saveSeasonalPrices(Property property, List<PropertySeasonalPriceDto> requested) {
        if (requested == null) {
            return;
        }
        if (!requested.isEmpty() && property.getPricePerDay() == null) {
            throw new IllegalArgumentException("Set the main price before adding prices by period");
        }
        requested.forEach(this::validateSeasonalPrice);
        requireNoOverlap(requested);
        List<PropertySeasonalPriceDto> sorted = requested.stream()
                .sorted(Comparator.comparing(PropertySeasonalPriceDto::getStartDate))
                .toList();
        seasonalPriceRepository.deleteByPropertyId(property.getId());
        property.setSeasonalPrices(seasonalPriceRepository.saveAll(sorted.stream()
                .map(price -> PropertySeasonalPrice.builder()
                        .propertyId(property.getId())
                        .startDate(price.getStartDate())
                        .endDate(price.getEndDate())
                        .pricePerDay(price.getPricePerDay())
                        .build())
                .toList()));
    }

    private void validateSeasonalPrice(PropertySeasonalPriceDto price) {
        monthDayInLeapYear(price.getStartDate());
        monthDayInLeapYear(price.getEndDate());
        if (!Money.isPositive(price.getPricePerDay())) {
            throw new IllegalArgumentException("Each period needs a price above zero");
        }
    }

    /** One night cannot have two prices. Walks each period day by day, crossing the new year if needed. */
    private void requireNoOverlap(List<PropertySeasonalPriceDto> periods) {
        Set<LocalDate> taken = new HashSet<>();
        for (PropertySeasonalPriceDto period : periods) {
            LocalDate day = monthDayInLeapYear(period.getStartDate());
            LocalDate last = monthDayInLeapYear(period.getEndDate());
            while (true) {
                if (!taken.add(day)) {
                    throw new IllegalArgumentException("Periods with different prices cannot overlap");
                }
                if (day.equals(last)) {
                    break;
                }
                day = day.plusDays(1).withYear(REFERENCE_LEAP_YEAR);
            }
        }
    }

    /** Periods have no year: a leap year accepts every day, 29 February included. */
    private LocalDate monthDayInLeapYear(String monthDay) {
        if (monthDay == null || !monthDay.matches("\\d{2}-\\d{2}")) {
            throw new IllegalArgumentException("Each period needs a valid start and end (day and month)");
        }
        try {
            return LocalDate.parse(REFERENCE_LEAP_YEAR + "-" + monthDay);
        } catch (DateTimeParseException e) {
            throw new IllegalArgumentException("Each period needs a valid start and end (day and month)");
        }
    }

    /** Periods first saved with a year ("2026-06-01") become yearly ones ("06-01"). */
    @Transactional
    public int normalizeLegacySeasonalPrices() {
        int fixed = 0;
        for (PropertySeasonalPrice period : seasonalPriceRepository.findAll()) {
            if (period.getStartDate().length() > 5 || period.getEndDate().length() > 5) {
                period.setStartDate(period.getStartDate().substring(period.getStartDate().length() - 5));
                period.setEndDate(period.getEndDate().substring(period.getEndDate().length() - 5));
                fixed++;
            }
        }
        return fixed;
    }

    private void validatePrices(PropertyDto dto) {
        for (BigDecimal price : new BigDecimal[]{dto.getPricePerDay(), dto.getPricePerWeek(), dto.getPricePerMonth()}) {
            if (Money.isNegative(price)) {
                throw new IllegalArgumentException("Prices and distances cannot be negative");
            }
        }
        if (dto.getDistanceBeach() != null && dto.getDistanceBeach() < 0) {
            throw new IllegalArgumentException("Prices and distances cannot be negative");
        }
        if ((dto.getMaxCapacity() != null && dto.getMaxCapacity() < 0) || (dto.getBathrooms() != null && dto.getBathrooms() < 0)) {
            throw new IllegalArgumentException("Capacity and bathrooms cannot be negative");
        }
    }
}
