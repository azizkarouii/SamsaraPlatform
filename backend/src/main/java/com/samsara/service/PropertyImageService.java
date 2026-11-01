package com.samsara.service;

import com.samsara.entity.PropertyImage;
import com.samsara.repository.PropertyImageRepository;
import com.samsara.service.ImageFileValidator.CheckedImage;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;

/**
 * Photos of a property: at most {@value #MAX_IMAGES}, JPEG / PNG / WebP only, ordered (position 0 = cover).
 * Only the owner of the property can change them; anyone who can see the property can see them.
 */
@Service
@RequiredArgsConstructor
public class PropertyImageService {

    public static final int MAX_IMAGES = 10;
    private final PropertyImageRepository propertyImageRepository;
    private final ImageStorage imageStorage;
    private final ImageFileValidator imageFileValidator;
    private final AccessService accessService;

    @Transactional(readOnly = true)
    public List<PropertyImage> findByProperty(Long propertyId) {
        accessService.getProperty(propertyId);
        return propertyImageRepository.findByPropertyIdOrderByPositionAscIdAsc(propertyId);
    }

    @Transactional
    public List<PropertyImage> upload(Long propertyId, List<MultipartFile> files, Long userId) {
        accessService.requireOwner(propertyId, userId);
        if (files == null || files.isEmpty()) {
            throw new IllegalArgumentException("No image received");
        }
        long existing = propertyImageRepository.countByPropertyId(propertyId);
        if (existing + files.size() > MAX_IMAGES) {
            throw new IllegalArgumentException("A house can have at most " + MAX_IMAGES + " images ("
                    + existing + " already)");
        }
        // Validate everything before writing anything, so a bad file does not leave half an upload behind
        List<CheckedImage> checked = files.stream().map(imageFileValidator::check).toList();

        List<String> written = new ArrayList<>();
        try {
            int position = (int) existing;
            for (CheckedImage image : checked) {
                String key = imageStorage.save(folder(propertyId), image.extension(), image.bytes());
                written.add(key);
                propertyImageRepository.save(PropertyImage.builder()
                        .propertyId(propertyId)
                        .imagePath(key)
                        .contentType(image.contentType())
                        .sizeBytes((long) image.bytes().length)
                        .position(position)
                        .isMain(position == 0)
                        .build());
                position++;
            }
        } catch (RuntimeException e) {
            written.forEach(imageStorage::delete);
            throw e;
        }
        deleteFilesIfRolledBack(written);
        return propertyImageRepository.findByPropertyIdOrderByPositionAscIdAsc(propertyId);
    }

    /** Replaces the file of a photo, keeping its place in the gallery. */
    @Transactional
    public PropertyImage replace(Long propertyId, Long imageId, MultipartFile file, Long userId) {
        accessService.requireOwner(propertyId, userId);
        PropertyImage image = getImageOf(propertyId, imageId);
        CheckedImage checked = imageFileValidator.check(file);

        String oldKey = image.getImagePath();
        String newKey = imageStorage.save(folder(propertyId), checked.extension(), checked.bytes());
        image.setImagePath(newKey);
        image.setContentType(checked.contentType());
        image.setSizeBytes((long) checked.bytes().length);
        PropertyImage saved = propertyImageRepository.save(image);
        deleteFilesIfRolledBack(List.of(newKey));
        deleteFilesAfterCommit(List.of(oldKey));
        return saved;
    }

    /** New order of the gallery: the first id becomes the cover. Every photo of the property must be listed once. */
    @Transactional
    public List<PropertyImage> reorder(Long propertyId, List<Long> orderedIds, Long userId) {
        accessService.requireOwner(propertyId, userId);
        List<PropertyImage> images = propertyImageRepository.findByPropertyIdOrderByPositionAscIdAsc(propertyId);
        if (orderedIds == null || orderedIds.size() != images.size()
                || !new HashSet<>(orderedIds).equals(new HashSet<>(images.stream().map(PropertyImage::getId).toList()))) {
            throw new IllegalArgumentException("The new order must list every image of the house exactly once");
        }
        for (PropertyImage image : images) {
            int position = orderedIds.indexOf(image.getId());
            image.setPosition(position);
            image.setIsMain(position == 0);
        }
        propertyImageRepository.saveAll(images);
        return propertyImageRepository.findByPropertyIdOrderByPositionAscIdAsc(propertyId);
    }

    @Transactional
    public List<PropertyImage> delete(Long propertyId, Long imageId, Long userId) {
        accessService.requireOwner(propertyId, userId);
        PropertyImage image = getImageOf(propertyId, imageId);
        propertyImageRepository.delete(image);
        propertyImageRepository.flush();

        // Close the gap so positions stay 0..n-1 and the next photo becomes the cover if needed
        List<PropertyImage> remaining = propertyImageRepository.findByPropertyIdOrderByPositionAscIdAsc(propertyId);
        for (int i = 0; i < remaining.size(); i++) {
            remaining.get(i).setPosition(i);
            remaining.get(i).setIsMain(i == 0);
        }
        propertyImageRepository.saveAll(remaining);
        deleteFilesAfterCommit(List.of(image.getImagePath()));
        return remaining;
    }

    /** Called when the property itself is deleted: rows go now, files once the deletion is committed. */
    @Transactional
    public void deleteAllOfProperty(Long propertyId) {
        List<String> keys = propertyImageRepository.findByPropertyIdOrderByPositionAscIdAsc(propertyId).stream()
                .map(PropertyImage::getImagePath)
                .toList();
        propertyImageRepository.deleteByPropertyId(propertyId);
        deleteFilesAfterCommit(keys);
    }

    private PropertyImage getImageOf(Long propertyId, Long imageId) {
        PropertyImage image = propertyImageRepository.findById(imageId)
                .orElseThrow(() -> new RuntimeException("Image not found"));
        if (!propertyId.equals(image.getPropertyId())) {
            throw new RuntimeException("Image not found");
        }
        return image;
    }

    private static String folder(Long propertyId) {
        return "properties/" + propertyId;
    }

    private void deleteFilesAfterCommit(List<String> keys) {
        if (keys.isEmpty()) return;
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            keys.forEach(imageStorage::delete);
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                keys.forEach(imageStorage::delete);
            }
        });
    }

    /** Files written during a transaction that finally rolls back must not stay orphaned on disk. */
    private void deleteFilesIfRolledBack(List<String> keys) {
        if (keys.isEmpty() || !TransactionSynchronizationManager.isSynchronizationActive()) return;
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status == STATUS_ROLLED_BACK) {
                    keys.forEach(imageStorage::delete);
                }
            }
        });
    }
}
