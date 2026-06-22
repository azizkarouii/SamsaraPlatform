package com.samsara.service;

import com.samsara.dto.PropertyDto;
import com.samsara.entity.Property;
import com.samsara.repository.PropertyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import org.springframework.data.domain.Sort;

@Service
@RequiredArgsConstructor
public class PropertyService {

    private final PropertyRepository propertyRepository;

    public List<Property> findAll() {
        return propertyRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
    }

    public List<Property> findAvailableOnDate(String date) {
        return propertyRepository.findAvailableOnDate(date);
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

    public Property create(PropertyDto dto, Long userId) {
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
        return propertyRepository.save(property);
    }

    public Property update(Long id, PropertyDto dto) {
        Property property = findById(id);
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
        return propertyRepository.save(property);
    }

    public void delete(Long id) {
        Property property = findById(id);
        propertyRepository.delete(property);
    }
}
