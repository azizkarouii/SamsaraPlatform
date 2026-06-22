package com.samsara.service;

import com.samsara.entity.PropertyAvailability;
import com.samsara.repository.PropertyAvailabilityRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PropertyAvailabilityService {

    private final PropertyAvailabilityRepository availabilityRepository;

    public List<PropertyAvailability> findByProperty(Long propertyId) {
        return availabilityRepository.findByPropertyId(propertyId);
    }

    public PropertyAvailability setAvailability(Long propertyId, String date, String status, String notes) {
        PropertyAvailability pa = PropertyAvailability.builder()
                .propertyId(propertyId)
                .date(date)
                .status(status)
                .notes(notes)
                .build();
        return availabilityRepository.save(pa);
    }

    public void delete(Long id) {
        availabilityRepository.deleteById(id);
    }
}
