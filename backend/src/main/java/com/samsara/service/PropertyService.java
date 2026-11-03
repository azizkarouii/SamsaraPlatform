package com.samsara.service;

import com.samsara.dto.PropertyDto;
import com.samsara.dto.PropertySeasonalPriceDto;
import com.samsara.entity.Property;
import com.samsara.entity.PropertySeasonalPrice;
import com.samsara.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.Comparator;
import java.util.List;
import org.springframework.data.domain.Sort;

@Service
@RequiredArgsConstructor
public class PropertyService {

    private final PropertyRepository propertyRepository;
    private final UserRepository userRepository;
    private final ReservationRepository reservationRepository;
    private final RevenueHistoryRepository revenueHistoryRepository;
    private final NotificationRepository notificationRepository;
    private final PropertyAvailabilityRepository availabilityRepository;
    private final PropertyImageService propertyImageService;
    private final PropertySamsarRepository propertySamsarRepository;
    private final PropertySeasonalPriceRepository seasonalPriceRepository;
    private final AccessService accessService;

    public List<Property> findAll() {
        return propertyRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
    }

    public List<Property> findAvailableOnDate(String date) {
        return propertyRepository.findAvailableOnDate(date);
    }

    public List<Property> findAvailableBetween(String startDate, String endDate) {
        if (startDate == null || startDate.isBlank() || endDate == null || endDate.isBlank()) {
            throw new IllegalArgumentException("Start date and end date are required");
        }
        if (startDate.compareTo(endDate) > 0) {
            throw new IllegalArgumentException("Start date must be before or equal to end date");
        }
        return propertyRepository.findAvailableBetween(startDate, endDate, Sort.by(Sort.Direction.DESC, "createdAt"));
    }

    public List<Property> findAvailableBetweenForUser(Long userId, String startDate, String endDate, String configuration) {
        if (startDate == null || startDate.isBlank() || endDate == null || endDate.isBlank()) {
            throw new IllegalArgumentException("Start date and end date are required");
        }
        if (startDate.compareTo(endDate) > 0) {
            throw new IllegalArgumentException("Start date must be before or equal to end date");
        }
        List<Property> available = propertyRepository.findAvailableBetweenForUser(startDate, endDate, userId, Sort.by(Sort.Direction.DESC, "createdAt"));
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
        return propertyRepository.findAvailableOnDateByCreatedBy(date, userId, Sort.by(Sort.Direction.DESC, "createdAt"));
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
            revenueHistoryRepository.deleteByReservationId(reservationId);
            notificationRepository.deleteByReservationId(reservationId);
            reservationRepository.deleteById(reservationId);
        }
        notificationRepository.deleteByPropertyId(id);
        availabilityRepository.deleteByPropertyId(id);
        propertyImageService.deleteAllOfProperty(id);
        seasonalPriceRepository.deleteByPropertyId(id);
        propertySamsarRepository.deleteByPropertyId(id);
        propertyRepository.delete(property);
    }

    /** Replaces the prices by period of a house; they complete the main price, which must exist. */
    private void saveSeasonalPrices(Property property, List<PropertySeasonalPriceDto> requested) {
        if (requested == null) {
            return;
        }
        if (!requested.isEmpty() && property.getPricePerDay() == null) {
            throw new IllegalArgumentException("Set the main price before adding prices by period");
        }
        List<PropertySeasonalPriceDto> sorted = requested.stream()
                .peek(this::validateSeasonalPrice)
                .sorted(Comparator.comparing(PropertySeasonalPriceDto::getStartDate))
                .toList();
        for (int i = 1; i < sorted.size(); i++) {
            if (sorted.get(i).getStartDate().compareTo(sorted.get(i - 1).getEndDate()) <= 0) {
                throw new IllegalArgumentException("Periods with different prices cannot overlap");
            }
        }
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
        LocalDate start;
        LocalDate end;
        try {
            start = LocalDate.parse(String.valueOf(price.getStartDate()));
            end = LocalDate.parse(String.valueOf(price.getEndDate()));
        } catch (DateTimeParseException e) {
            throw new IllegalArgumentException("Each price by period needs valid start and end dates");
        }
        if (end.isBefore(start)) {
            throw new IllegalArgumentException("The end of a period cannot be before its start");
        }
        if (price.getPricePerDay() == null || price.getPricePerDay() <= 0) {
            throw new IllegalArgumentException("Each period needs a price above zero");
        }
    }

    private void validatePrices(PropertyDto dto) {
        for (Double value : new Double[]{dto.getPricePerDay(), dto.getPricePerWeek(), dto.getPricePerMonth(), dto.getDistanceBeach()}) {
            if (value != null && value < 0) {
                throw new IllegalArgumentException("Prices and distances cannot be negative");
            }
        }
        if ((dto.getMaxCapacity() != null && dto.getMaxCapacity() < 0) || (dto.getBathrooms() != null && dto.getBathrooms() < 0)) {
            throw new IllegalArgumentException("Capacity and bathrooms cannot be negative");
        }
    }
}
