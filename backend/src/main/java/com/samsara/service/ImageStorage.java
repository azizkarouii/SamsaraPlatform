package com.samsara.service;

/**
 * Where image files are kept. The database only stores the returned key, so switching to a cloud
 * storage at deployment time means adding another implementation of this interface.
 */
public interface ImageStorage {

    /** Stores the bytes under a new unique key (e.g. "properties/12/uuid.webp") and returns that key. */
    String save(String folder, String extension, byte[] content);

    /** Removes the file behind a key; a missing file is ignored. */
    void delete(String key);
}
