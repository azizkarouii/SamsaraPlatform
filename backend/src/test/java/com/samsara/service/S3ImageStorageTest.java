package com.samsara.service;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

import static org.assertj.core.api.Assertions.assertThat;

/** Checks the requests sent to an S3-compatible service, using a small local server in its place. */
class S3ImageStorageTest {

    private HttpServer server;
    private final List<String> requests = new CopyOnWriteArrayList<>();
    private S3ImageStorage storage;

    @BeforeEach
    void startServer() throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", exchange -> {
            String contentType = exchange.getRequestHeaders().getFirst("Content-Type");
            requests.add(exchange.getRequestMethod() + " " + exchange.getRequestURI().getPath() + " " + contentType);
            exchange.getRequestBody().readAllBytes();
            exchange.sendResponseHeaders(200, -1);
            exchange.close();
        });
        server.start();
        storage = new S3ImageStorage("http://127.0.0.1:" + server.getAddress().getPort(), "auto", "photos", "key", "secret");
    }

    @AfterEach
    void stopServer() {
        server.stop(0);
    }

    @Test
    void uploadsThenDeletesTheFile() {
        String key = storage.save("properties/12", "webp", new byte[]{1, 2, 3});

        assertThat(key).startsWith("properties/12/").endsWith(".webp");
        assertThat(requests).containsExactly("PUT /photos/" + key + " image/webp");

        storage.delete(key);
        assertThat(requests.get(1)).startsWith("DELETE /photos/" + key);
    }
}
