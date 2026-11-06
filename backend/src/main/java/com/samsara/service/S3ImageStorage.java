package com.samsara.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.exception.SdkException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.net.URI;
import java.util.Map;
import java.util.UUID;

/** Production storage: any S3-compatible service (AWS S3, Cloudflare R2, Supabase Storage, MinIO...). */
@Service
@ConditionalOnProperty(name = "application.storage.type", havingValue = "s3")
public class S3ImageStorage implements ImageStorage {

    private static final Map<String, String> CONTENT_TYPES = Map.of("jpg", "image/jpeg", "png", "image/png", "webp", "image/webp");

    private final S3Client client;
    private final String bucket;

    public S3ImageStorage(@Value("${application.storage.s3.endpoint}") String endpoint,
                          @Value("${application.storage.s3.region}") String region,
                          @Value("${application.storage.s3.bucket}") String bucket,
                          @Value("${application.storage.s3.access-key}") String accessKey,
                          @Value("${application.storage.s3.secret-key}") String secretKey) {
        this.bucket = bucket;
        this.client = S3Client.builder()
                .endpointOverride(URI.create(endpoint))
                .region(Region.of(region))
                .credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create(accessKey, secretKey)))
                .serviceConfiguration(S3Configuration.builder().pathStyleAccessEnabled(true).build())
                .build();
    }

    @Override
    public String save(String folder, String extension, byte[] content) {
        String key = folder + "/" + UUID.randomUUID() + "." + extension;
        client.putObject(PutObjectRequest.builder()
                        .bucket(bucket)
                        .key(key)
                        .contentType(CONTENT_TYPES.getOrDefault(extension, "application/octet-stream"))
                        .cacheControl("public, max-age=2592000")
                        .build(),
                RequestBody.fromBytes(content));
        return key;
    }

    @Override
    public void delete(String key) {
        try {
            client.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(key).build());
        } catch (SdkException e) {
            // A leftover file is harmless; it must not make the user action fail
        }
    }
}
