package com.samsara.service;

import com.samsara.entity.PropertyImage;
import com.samsara.repository.PropertyImageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PropertyImageService {

    private final PropertyImageRepository propertyImageRepository;

    public List<PropertyImage> findByProperty(Long propertyId) {
        return propertyImageRepository.findByPropertyId(propertyId);
    }

    public PropertyImage upload(Long propertyId, String imagePath, Boolean isMain, Integer position) {
        PropertyImage image = PropertyImage.builder()
                .propertyId(propertyId)
                .imagePath(imagePath)
                .isMain(isMain != null ? isMain : false)
                .position(position != null ? position : 0)
                .build();
        return propertyImageRepository.save(image);
    }

    public void delete(Long id) {
        propertyImageRepository.deleteById(id);
    }
}
