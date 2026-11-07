package com.samsara;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.samsara.entity.Notification;
import com.samsara.repository.NotificationRepository;
import com.samsara.service.NotificationService;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.ActiveProfiles;

import java.io.ByteArrayInputStream;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.zip.ZipInputStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;

/** Business rules through the real HTTP API, on an in-memory database (or PostgreSQL in the CI). */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class ReservationFlowTest {

    private static final AtomicInteger SEQUENCE = new AtomicInteger();
    private static final List<SimpleMailMessage> MAILBOX = new CopyOnWriteArrayList<>();
    private final HttpClient http = HttpClient.newHttpClient();

    @Autowired
    private ObjectMapper json;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private NotificationService notificationService;

    @MockBean
    private JavaMailSender mailSender;

    @LocalServerPort
    private int port;

    private Account owner;
    private String commissionSamsar;
    private String marginSamsar;
    private long house;

    private record Reply(int status, JsonNode body, HttpHeaders headers) {}

    private record HttpHeaders(Map<String, List<String>> map) {
        String cookie() {
            return map.getOrDefault("set-cookie", List.of()).stream().findFirst().orElse("");
        }
    }

    private Reply send(String method, String path, Map<String, String> headers, Object body) throws Exception {
        HttpRequest.Builder request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api" + path))
                .header("Content-Type", "application/json")
                .method(method, body == null ? HttpRequest.BodyPublishers.noBody()
                        : HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)));
        headers.forEach(request::header);
        HttpResponse<byte[]> response = http.send(request.build(), HttpResponse.BodyHandlers.ofByteArray());
        String type = response.headers().firstValue("Content-Type").orElse("");
        JsonNode parsed = type.contains("json") && response.body().length > 0 ? json.readTree(response.body()) : json.nullNode();
        Map<String, List<String>> lower = new HashMap<>();
        response.headers().map().forEach((k, v) -> lower.put(k.toLowerCase(), v));
        lastBytes = response.body();
        return new Reply(response.statusCode(), parsed, new HttpHeaders(lower));
    }

    private byte[] lastBytes;

    private Reply call(String method, String path, String token, Object body, String language) throws Exception {
        Map<String, String> headers = new HashMap<>();
        if (token != null) headers.put("Authorization", "Bearer " + token);
        if (language != null) headers.put("Accept-Language", language);
        return send(method, path, headers, body);
    }

    private Reply call(String method, String path, String token, Object body) throws Exception {
        return call(method, path, token, body, null);
    }

    private record Account(String token, String email, String phone, String password) {}

    private String lastLinkTo(String email, String marker) {
        for (int i = MAILBOX.size() - 1; i >= 0; i--) {
            SimpleMailMessage mail = MAILBOX.get(i);
            if (mail.getTo() != null && mail.getTo()[0].equals(email) && mail.getText().contains(marker)) {
                String text = mail.getText();
                return text.substring(text.indexOf("token=") + 6).split("\\s")[0];
            }
        }
        throw new AssertionError("No email with " + marker + " sent to " + email);
    }

    /** Signs up, opens the confirmation link received by email, then signs in. */
    private Account account(String role) throws Exception {
        int n = SEQUENCE.incrementAndGet();
        String email = "user" + n + "@test.tn";
        String phone = String.format("2%07d", n);
        Reply registered = call("POST", "/auth/register", null, Map.of("name", "User " + n, "email", email,
                "password", "secret123", "phone", phone, "role", role, "language", "fr"));
        assertThat(registered.status()).isEqualTo(200);
        assertThat(registered.body().get("verificationRequired").asBoolean()).isTrue();
        assertThat(registered.body().has("access_token")).isFalse();
        String link = lastLinkTo(email, "verify-email");
        assertThat(call("POST", "/auth/verify-email", null, Map.of("token", link)).status()).isEqualTo(204);
        Reply login = call("POST", "/auth/login", null, Map.of("email", email, "password", "secret123"));
        assertThat(login.status()).isEqualTo(200);
        return new Account(login.body().get("access_token").asText(), email, phone, "secret123");
    }

    private String invited(long property, Map<String, Object> deal) throws Exception {
        Account samsar = account("SAMSAR");
        Map<String, Object> body = new HashMap<>(deal);
        body.putAll(Map.of("propertyId", property, "email", samsar.email(), "phone", samsar.phone()));
        assertThat(call("POST", "/property-samsars", owner.token(), body).status()).isEqualTo(200);
        return samsar.token();
    }

    @BeforeEach
    void houseWithTwoSamsars() throws Exception {
        doAnswer(invocation -> {
            MAILBOX.add(invocation.getArgument(0));
            return null;
        }).when(mailSender).send(any(SimpleMailMessage.class));
        owner = account("PROPRIETAIRE");
        house = call("POST", "/properties", owner.token(), Map.of("title", "Dar", "pricePerDay", 150)).body().get("id").asLong();
        commissionSamsar = invited(house, Map.of("commissionPercent", 10));
        marginSamsar = invited(house, Map.of("priceIncreaseTnd", 20));
    }

    private static String day(int fromToday) {
        return LocalDate.now().plusDays(fromToday).toString();
    }

    private Reply book(String token, int start, int end, double total, Double negotiated, double advance) throws Exception {
        Map<String, Object> body = new HashMap<>(Map.of("propertyId", house, "startDate", day(start), "endDate", day(end),
                "clientName", "Client", "totalAmount", total, "advanceAmount", advance));
        if (negotiated != null) body.put("negotiatedPricePerDay", negotiated);
        return call("POST", "/reservations", token, body);
    }

    private JsonNode booked(String token, int start, int end, double total, Double negotiated, double advance) throws Exception {
        Reply reply = book(token, start, end, total, negotiated, advance);
        assertThat(reply.status()).as(reply.body().toString()).isEqualTo(200);
        return reply.body();
    }

    private void setStatus(String token, long id, String status) throws Exception {
        Reply reply = call("PATCH", "/reservations/" + id + "/status", token, Map.of("status", status));
        assertThat(reply.status()).as(reply.body().toString()).isEqualTo(200);
    }

    private Reply pay(String token, long id, double amount) throws Exception {
        return call("POST", "/reservations/" + id + "/payments", token, Map.of("amount", amount));
    }

    /** {earned, upcoming} of one booking for the user asking. */
    private double[] earnings(String token, long reservation) throws Exception {
        for (JsonNode item : call("GET", "/reservations/earnings", token, null).body()) {
            if (item.get("reservationId").asLong() == reservation) {
                return new double[]{item.get("earned").asDouble(), item.get("upcoming").asDouble()};
            }
        }
        throw new AssertionError("Booking not in the earnings of this user");
    }

    // ------------------------------------------------------------------------------------------ prices

    @Test
    void commissionIsAPercentageOfTheTotal() throws Exception {
        assertThat(booked(commissionSamsar, 10, 10, 150, null, 0).get("samsarGain").asDouble()).isEqualTo(15.0);
        assertThat(book(commissionSamsar, 11, 11, 151, null, 0).status()).isEqualTo(400);
    }

    @Test
    void fixedMarginIsWhatIsChargedAboveTheHousePrice() throws Exception {
        assertThat(booked(marginSamsar, 10, 11, 340, null, 0).get("samsarGain").asDouble()).isEqualTo(40.0);
        assertThat(book(marginSamsar, 12, 12, 171, null, 0).status()).isEqualTo(400);
    }

    @Test
    void amountsAreExactDecimals() throws Exception {
        JsonNode r = booked(commissionSamsar, 10, 10, 149.99, null, 0);
        assertThat(r.get("samsarGain").decimalValue()).isEqualByComparingTo("15.00");
        assertThat(r.get("totalAmount").decimalValue()).isEqualByComparingTo("149.99");
    }

    @Test
    void pricesByPeriodAreCalculatedDayByDayEveryYear() throws Exception {
        int year = LocalDate.now().getYear() + 1;
        Reply saved = call("PATCH", "/properties/" + house, owner.token(), Map.of("seasonalPrices", List.of(
                Map.of("startDate", "07-01", "endDate", "07-07", "pricePerDay", 100),
                Map.of("startDate", "07-08", "endDate", "07-31", "pricePerDay", 200),
                Map.of("startDate", "12-20", "endDate", "01-10", "pricePerDay", 30))));
        assertThat(saved.status()).isEqualTo(200);
        for (int y : new int[]{year, year + 2}) {
            Reply reply = call("POST", "/reservations", owner.token(), Map.of("propertyId", house, "clientName", "C", "totalAmount", 1,
                    "startDate", y + "-07-05", "endDate", y + "-07-14"));
            assertThat(reply.body().get("baseAmount").asDouble()).isEqualTo(3 * 100 + 7 * 200);
        }
        Reply acrossNewYear = call("POST", "/reservations", owner.token(), Map.of("propertyId", house, "clientName", "C", "totalAmount", 1,
                "startDate", year + "-12-30", "endDate", (year + 1) + "-01-02"));
        assertThat(acrossNewYear.body().get("baseAmount").asDouble()).isEqualTo(4 * 30);
    }

    @Test
    void overlappingPeriodsAreRefused() throws Exception {
        assertThat(call("PATCH", "/properties/" + house, owner.token(), Map.of("seasonalPrices", List.of(
                Map.of("startDate", "12-20", "endDate", "01-10", "pricePerDay", 30),
                Map.of("startDate", "01-05", "endDate", "01-20", "pricePerDay", 30)))).status()).isEqualTo(400);
    }

    @Test
    void negotiatedPriceKeepsTheSamsarDealAndComesOutOfTheOwnerPart() throws Exception {
        assertThat(booked(commissionSamsar, 10, 10, 130, 130.0, 0).get("samsarGain").asDouble()).isEqualTo(13.0);
        assertThat(booked(marginSamsar, 11, 12, 260, 130.0, 0).get("samsarGain").asDouble()).isEqualTo(40.0);
        assertThat(book(marginSamsar, 13, 13, 131, 130.0, 0).status()).as("no margin added on top").isEqualTo(400);
        assertThat(book(commissionSamsar, 14, 14, 150, 150.0, 0).status()).as("must be below the usual price").isEqualTo(400);
    }

    // ------------------------------------------------------------------------------------------ money received

    @Test
    void earningsFollowTheRecordedPayments() throws Exception {
        long id = booked(commissionSamsar, 0, 19, 3000, null, 1000).get("id").asLong();
        assertThat(earnings(owner.token(), id)).containsExactly(1000.0, 0.0);
        assertThat(earnings(commissionSamsar, id)).containsExactly(0.0, 300.0);

        setStatus(commissionSamsar, id, "in-progress");
        assertThat(earnings(owner.token(), id)).as("the balance is not assumed paid").containsExactly(1000.0, 0.0);

        assertThat(pay(commissionSamsar, id, 100).status()).isEqualTo(200);
        assertThat(earnings(commissionSamsar, id)).as("gain taken from what is paid after the advance").containsExactly(100.0, 200.0);
        assertThat(earnings(owner.token(), id)).containsExactly(1000.0, 0.0);

        assertThat(pay(owner.token(), id, 1900).status()).isEqualTo(200);
        assertThat(earnings(commissionSamsar, id)).containsExactly(300.0, 0.0);
        assertThat(earnings(owner.token(), id)).containsExactly(2700.0, 0.0);

        JsonNode payments = call("GET", "/reservations/" + id + "/payments", owner.token(), null).body();
        assertThat(payments).hasSize(3);
        assertThat(payments.get(0).get("kind").asText()).isEqualTo("advance");
        assertThat(call("GET", "/reservations/" + id + "/payments", marginSamsar, null).status()).isEqualTo(403);
    }

    @Test
    void paymentsAreValidated() throws Exception {
        long pending = booked(commissionSamsar, 30, 31, 300, null, 0).get("id").asLong();
        assertThat(pay(commissionSamsar, pending, 50).status()).as("pending: use an advance").isEqualTo(409);

        long id = booked(commissionSamsar, 40, 41, 300, null, 100).get("id").asLong();
        assertThat(pay(commissionSamsar, id, 0).status()).isEqualTo(400);
        assertThat(pay(commissionSamsar, id, 201).status()).as("above the total").isEqualTo(400);
        assertThat(call("POST", "/reservations/" + id + "/payments", commissionSamsar, Map.of("amount", 10, "paidOn", day(3))).status())
                .as("dated in the future").isEqualTo(400);
        assertThat(pay(marginSamsar, id, 10).status()).as("another samsar").isEqualTo(403);

        JsonNode payment = pay(commissionSamsar, id, 150).body();
        assertThat(call("PATCH", "/reservations/" + id, commissionSamsar, Map.of("totalAmount", 200)).status())
                .as("total below what was paid").isEqualTo(400);
        long advanceId = call("GET", "/reservations/" + id + "/payments", owner.token(), null).body().get(0).get("id").asLong();
        assertThat(call("DELETE", "/reservations/" + id + "/payments/" + advanceId, owner.token(), null).status()).isEqualTo(400);
        assertThat(call("DELETE", "/reservations/" + id + "/payments/" + payment.get("id").asLong(), owner.token(), null).status()).isEqualTo(204);
    }

    @Test
    void editingTheAdvanceUpdatesItsPayment() throws Exception {
        long id = booked(commissionSamsar, 50, 51, 300, null, 100).get("id").asLong();
        call("PATCH", "/reservations/" + id, commissionSamsar, Map.of("advanceAmount", 150));
        JsonNode payments = call("GET", "/reservations/" + id + "/payments", owner.token(), null).body();
        assertThat(payments).hasSize(1);
        assertThat(payments.get(0).get("amount").asDouble()).isEqualTo(150.0);
    }

    @Test
    void cancellationBeforeTheStayLeavesTheAdvanceToTheOwner() throws Exception {
        long id = booked(commissionSamsar, 10, 29, 3000, null, 1000).get("id").asLong();
        setStatus(owner.token(), id, "cancelled");
        assertThat(earnings(owner.token(), id)[0]).isEqualTo(1000.0);
        assertThat(earnings(commissionSamsar, id)[0]).isEqualTo(0.0);

        assertThat(call("PUT", "/reservations/" + id + "/refund", commissionSamsar, Map.of("amount", 5)).status()).isEqualTo(400);
        assertThat(call("PUT", "/reservations/" + id + "/refund", owner.token(), Map.of("amount", 1001)).status()).isEqualTo(400);
        assertThat(call("PUT", "/reservations/" + id + "/refund", owner.token(), Map.of("amount", 400)).status()).isEqualTo(200);
        assertThat(earnings(owner.token(), id)[0]).isEqualTo(600.0);
    }

    @Test
    void cancellationDuringTheStayKeepsWhatWasReceived() throws Exception {
        long enough = booked(commissionSamsar, 0, 19, 3000, null, 1000).get("id").asLong();
        setStatus(commissionSamsar, enough, "in-progress");
        pay(owner.token(), enough, 2000);
        setStatus(owner.token(), enough, "cancelled");
        assertThat(earnings(commissionSamsar, enough)[0]).isEqualTo(300.0);
        assertThat(earnings(owner.token(), enough)[0]).isEqualTo(2700.0);

        long partly = booked(commissionSamsar, 20, 39, 3000, null, 1000).get("id").asLong();
        call("PATCH", "/reservations/" + partly, owner.token(), Map.of("startDate", day(0), "endDate", day(19)));
        jdbc.update("UPDATE reservations SET start_date = ?, end_date = ? WHERE id = ?", LocalDate.now(), LocalDate.now().plusDays(19), partly);
        setStatus(commissionSamsar, partly, "in-progress");
        pay(owner.token(), partly, 100);
        setStatus(owner.token(), partly, "cancelled");
        assertThat(earnings(commissionSamsar, partly)[0]).as("limited to what was paid").isEqualTo(100.0);
        assertThat(earnings(owner.token(), partly)[0]).isEqualTo(1000.0);
    }

    @Test
    void earlyEndFreesTheFollowingDaysAndKeepsThePriceAndTheGain() throws Exception {
        long id = booked(commissionSamsar, 0, 6, 1050, null, 100).get("id").asLong();
        setStatus(commissionSamsar, id, "in-progress");
        assertThat(book(owner.token(), 3, 4, 300, null, 10).status()).isEqualTo(409);

        Reply ended = call("POST", "/reservations/" + id + "/early-end", commissionSamsar, Map.of("endDate", day(0)));
        assertThat(ended.body().get("status").asText()).isEqualTo("completed");
        assertThat(ended.body().get("originalEndDate").asText()).isEqualTo(day(6));
        assertThat(ended.body().get("totalAmount").asDouble()).isEqualTo(1050.0);
        assertThat(ended.body().get("samsarGain").asDouble()).isEqualTo(105.0);
        assertThat(book(owner.token(), 3, 4, 300, null, 10).status()).isEqualTo(200);
        assertThat(call("PUT", "/reservations/" + id + "/refund", owner.token(), Map.of("amount", 10)).status())
                .as("no money given back once the stay is completed").isEqualTo(409);
    }

    @Test
    void eachOneGivesMoneyBackFromWhatHeReceived() throws Exception {
        long id = booked(commissionSamsar, 0, 6, 1050, null, 100).get("id").asLong();
        setStatus(commissionSamsar, id, "in-progress");
        assertThat(call("PUT", "/reservations/" + id + "/refund", commissionSamsar, Map.of("amount", 1)).status())
                .as("nothing received after the advance yet").isEqualTo(400);
        pay(owner.token(), id, 950);

        assertThat(call("PUT", "/reservations/" + id + "/refund", commissionSamsar, Map.of("amount", 106)).status()).isEqualTo(400);
        assertThat(call("PUT", "/reservations/" + id + "/refund", commissionSamsar, Map.of("amount", 25)).status()).isEqualTo(200);
        assertThat(call("PUT", "/reservations/" + id + "/refund", owner.token(), Map.of("amount", 200)).status()).isEqualTo(200);
        assertThat(call("PUT", "/reservations/" + id + "/refund", marginSamsar, Map.of("amount", 1)).status()).isEqualTo(403);

        assertThat(earnings(commissionSamsar, id)[0]).isEqualTo(80.0);
        assertThat(earnings(owner.token(), id)[0]).isEqualTo(745.0);

        long balance = call("GET", "/reservations/" + id + "/payments", owner.token(), null).body().get(1).get("id").asLong();
        assertThat(call("DELETE", "/reservations/" + id + "/payments/" + balance, owner.token(), null).status())
                .as("refunds would exceed what was received").isEqualTo(400);
    }

    @Test
    void anotherSamsarSeesNeitherGainNorRefund() throws Exception {
        long id = booked(commissionSamsar, 0, 1, 300, null, 10).get("id").asLong();
        setStatus(commissionSamsar, id, "in-progress");
        assertThat(call("PUT", "/reservations/" + id + "/refund", owner.token(), Map.of("amount", 10)).status()).isEqualTo(200);

        JsonNode seen = call("GET", "/reservations/" + id, marginSamsar, null).body();
        assertThat(seen.get("samsarGain").isNull()).isTrue();
        assertThat(seen.get("refundAmount").isNull()).isTrue();
        assertThat(call("GET", "/reservations/" + id, owner.token(), null).body().get("samsarGain").asDouble()).isEqualTo(30.0);
    }

    @Test
    void historyRecordsWhoDidWhat() throws Exception {
        long id = booked(commissionSamsar, 0, 2, 450, null, 50).get("id").asLong();
        setStatus(commissionSamsar, id, "in-progress");
        pay(owner.token(), id, 100);
        call("PUT", "/reservations/" + id + "/refund", owner.token(), Map.of("amount", 20));

        JsonNode history = call("GET", "/reservations/" + id + "/history", owner.token(), null).body();
        List<String> actions = new ArrayList<>();
        history.forEach(event -> actions.add(event.get("action").asText()));
        assertThat(actions).containsExactly("created", "status_changed", "payment_added", "refund_owner");
        assertThat(history.get(2).get("actorName").asText()).startsWith("User ");
        assertThat(json.readTree(history.get(1).get("details").asText()).get("to").asText()).isEqualTo("in-progress");
        assertThat(call("GET", "/reservations/" + id + "/history", marginSamsar, null).status()).isEqualTo(403);

        call("PATCH", "/reservations/" + id + "/status", owner.token(), Map.of("status", "cancelled"));
        call("DELETE", "/reservations/" + id, owner.token(), null);
        Integer kept = jdbc.queryForObject("SELECT COUNT(*) FROM reservation_events WHERE reservation_id = ?", Integer.class, id);
        assertThat(kept).as("the history survives the deletion").isEqualTo(6);
    }

    // ------------------------------------------------------------------------------------------ calendar

    @Test
    void simultaneousBookingsOfTheSameDatesCannotBothBeConfirmed() throws Exception {
        List<Callable<Integer>> attempts = new ArrayList<>();
        for (int i = 0; i < 6; i++) {
            attempts.add(() -> book(owner.token(), 50, 55, 900, null, 100).status());
        }
        ExecutorService pool = Executors.newFixedThreadPool(6);
        try {
            int succeeded = 0;
            for (Future<Integer> attempt : pool.invokeAll(attempts)) {
                if (attempt.get() == 200) succeeded++;
                else assertThat(attempt.get()).isEqualTo(409);
            }
            assertThat(succeeded).isEqualTo(1);
        } finally {
            pool.shutdown();
        }
    }

    @Test
    void theDatabaseItselfRefusesOverlappingStays() throws Exception {
        String product = jdbc.execute((java.sql.Connection c) -> c.getMetaData().getDatabaseProductName());
        Assumptions.assumeTrue("PostgreSQL".equals(product), "only on PostgreSQL, where the migrations add the constraint");
        long id = booked(owner.token(), 60, 65, 900, null, 100).get("id").asLong();
        long other = booked(owner.token(), 70, 72, 450, null, 0).get("id").asLong();
        try {
            jdbc.update("UPDATE reservations SET start_date = ?, end_date = ?, status = 'confirmed' WHERE id = ?",
                    LocalDate.now().plusDays(64), LocalDate.now().plusDays(66), other);
            throw new AssertionError("The overlap was accepted");
        } catch (org.springframework.dao.DataIntegrityViolationException expected) {
            assertThat(expected.getMostSpecificCause().getMessage()).contains("reservations_no_overlap");
        }
        assertThat(id).isPositive();
    }

    // ------------------------------------------------------------------------------------------ lists and figures

    @Test
    void reservationsCanBePagedFilteredAndSorted() throws Exception {
        for (int i = 0; i < 5; i++) {
            call("POST", "/reservations", commissionSamsar, Map.of("propertyId", house, "startDate", day(60 + i), "endDate", day(60 + i),
                    "clientName", "Client " + i, "totalAmount", 100 + i));
        }
        booked(commissionSamsar, 70, 70, 150, null, 10);

        JsonNode first = call("GET", "/reservations/page?size=2&sort=startDate&direction=asc", commissionSamsar, null).body();
        assertThat(first.get("content")).hasSize(2);
        assertThat(first.get("totalElements").asInt()).isEqualTo(6);
        assertThat(first.get("content").get(0).get("clientName").asText()).isEqualTo("Client 0");
        assertThat(first.get("counts").get("pending").asInt()).isEqualTo(5);
        assertThat(first.get("counts").get("confirmed").asInt()).isEqualTo(1);
        assertThat(call("GET", "/reservations/page?status=confirmed", commissionSamsar, null).body().get("totalElements").asInt()).isEqualTo(1);
        String search = URLEncoder.encode("client 3", StandardCharsets.UTF_8);
        assertThat(call("GET", "/reservations/page?search=" + search, commissionSamsar, null).body().get("totalElements").asInt()).isEqualTo(1);
        for (String sort : List.of("clientName", "propertyTitle", "status", "totalAmount")) {
            assertThat(call("GET", "/reservations/page?sort=" + sort, owner.token(), null).status()).as(sort).isEqualTo(200);
        }
    }

    @Test
    void housesArePagedSearchedAndFilteredByFreeDay() throws Exception {
        call("POST", "/properties", owner.token(), Map.of("title", "Villa Jasmin", "pricePerDay", 300, "configuration", "S+3"));
        call("POST", "/properties", owner.token(), Map.of("title", "Studio", "pricePerDay", 80, "configuration", "S+1"));
        booked(owner.token(), 5, 6, 300, null, 50);

        JsonNode all = call("GET", "/properties/mine/page?size=2&sort=title&direction=asc", owner.token(), null).body();
        assertThat(all.get("totalElements").asInt()).isEqualTo(3);
        assertThat(all.get("content")).hasSize(2);
        assertThat(all.get("content").get(0).get("title").asText()).isEqualTo("Dar");
        assertThat(call("GET", "/properties/mine/page?search=jasmin", owner.token(), null).body().get("totalElements").asInt()).isEqualTo(1);
        assertThat(call("GET", "/properties/mine/page?search=s%2B1", owner.token(), null).body().get("totalElements").asInt()).isEqualTo(1);
        assertThat(call("GET", "/properties/mine/page?date=" + day(5), owner.token(), null).body().get("totalElements").asInt())
                .as("Dar is booked that day").isEqualTo(2);
    }

    @Test
    void dashboardSummaryIsComputedByTheServer() throws Exception {
        long id = booked(commissionSamsar, 0, 19, 3000, null, 1000).get("id").asLong();
        setStatus(commissionSamsar, id, "in-progress");
        pay(owner.token(), id, 500);
        booked(commissionSamsar, 40, 40, 150, null, 0);

        JsonNode samsar = call("GET", "/dashboard/summary", commissionSamsar, null).body();
        assertThat(samsar.get("earned").asDouble()).isEqualTo(300.0);
        assertThat(samsar.get("reservationCount").asInt()).isEqualTo(2);
        assertThat(samsar.get("counts").get("pending").asInt()).isEqualTo(1);
        assertThat(samsar.get("rentals").get(0).get("earned").asDouble()).isEqualTo(300.0);
        assertThat(samsar.get("propertyCount").asInt()).isEqualTo(1);

        JsonNode ownerView = call("GET", "/dashboard/summary", owner.token(), null).body();
        assertThat(ownerView.get("earned").asDouble()).isEqualTo(1200.0);
        assertThat(ownerView.get("toCollect").asDouble()).isEqualTo(1500.0);
        assertThat(ownerView.get("byProperty").get(0).get("amount").asDouble()).isEqualTo(1200.0);
        assertThat(ownerView.get("arrivals")).hasSize(2);

        JsonNode later = call("GET", "/dashboard/summary?from=" + day(30) + "&to=" + day(60), owner.token(), null).body();
        assertThat(later.get("reservationCount").asInt()).isEqualTo(1);
        assertThat(later.get("earned").asDouble()).isEqualTo(0.0);
    }

    @Test
    void earningsReportCanBeDownloadedAsExcel() throws Exception {
        long id = booked(commissionSamsar, 0, 2, 450, null, 100).get("id").asLong();
        setStatus(commissionSamsar, id, "in-progress");
        pay(owner.token(), id, 350);

        JsonNode rows = call("GET", "/reports/earnings", commissionSamsar, null).body();
        assertThat(rows).hasSize(1);
        assertThat(rows.get(0).get("earned").asDouble()).isEqualTo(45.0);

        Reply file = call("GET", "/reports/earnings.xlsx?lang=ar", owner.token(), null);
        assertThat(file.status()).isEqualTo(200);
        Map<String, String> parts = new HashMap<>();
        try (ZipInputStream zip = new ZipInputStream(new ByteArrayInputStream(lastBytes))) {
            for (var entry = zip.getNextEntry(); entry != null; entry = zip.getNextEntry()) {
                parts.put(entry.getName(), new String(zip.readAllBytes(), StandardCharsets.UTF_8));
            }
        }
        assertThat(parts).containsKeys("[Content_Types].xml", "xl/workbook.xml", "xl/worksheets/sheet1.xml");
        String sheet = parts.get("xl/worksheets/sheet1.xml");
        assertThat(sheet).contains("rightToLeft=\"1\"", "المنزل", "Dar", "<v>405.00</v>", "<v>450.00</v>");
    }

    @Test
    void notificationsAreTranslatableAndPaged() throws Exception {
        booked(commissionSamsar, 80, 80, 150, null, 0);
        JsonNode page = call("GET", "/notifications/page?size=1", owner.token(), null).body();
        assertThat(page.get("content")).hasSize(1);
        JsonNode notification = page.get("content").get(0);
        assertThat(notification.get("messageKey").asText()).isEqualTo("reservation_created");
        assertThat(json.readTree(notification.get("messageParams").asText()).get("property").asText()).isEqualTo("Dar");
    }

    @Test
    void olderFrenchNotificationsReceiveATranslationKey() throws Exception {
        long userId = call("GET", "/auth/profile", owner.token(), null).body().get("id").asLong();
        Notification old = notificationRepository.save(Notification.builder().userId(userId).propertyId(house)
                .type("reservation_confirmed").title("Réservation confirmée")
                .message("La réservation de dar aymen (2026-10-31 au 2026-11-03) pour cedric a été confirmée par aymenghaoui")
                .isRead(false).build());
        notificationService.translateLegacyNotifications();
        Notification converted = notificationRepository.findById(old.getId()).orElseThrow();
        assertThat(converted.getMessageKey()).isEqualTo("reservation_confirmed");
        JsonNode params = json.readTree(converted.getMessageParams());
        assertThat(params.get("property").asText()).isEqualTo("dar aymen");
        assertThat(params.get("client").asText()).isEqualTo("cedric");
        assertThat(params.get("actor").asText()).isEqualTo("aymenghaoui");
    }

    @Test
    void externalLinksMustBeWebAddresses() throws Exception {
        assertThat(call("PATCH", "/properties/" + house, owner.token(), Map.of("links", List.of("javascript:alert(1)"))).status()).isEqualTo(400);
        assertThat(call("PATCH", "/properties/" + house, owner.token(), Map.of("links", List.of("https://www.tiktok.com/@x/video/1"))).status()).isEqualTo(200);
        assertThat(call("GET", "/properties/" + house, null, null).body().get("links")).hasSize(1);
    }

    @Test
    void errorsFollowTheLanguageOfTheRequest() throws Exception {
        assertThat(call("GET", "/reservations/999999", owner.token(), null, "fr").body().get("message").asText()).isEqualTo("Réservation introuvable");
        assertThat(call("GET", "/reservations/999999", owner.token(), null, "ar").body().get("message").asText()).isEqualTo("الحجز غير موجود");
        assertThat(call("GET", "/reservations/999999", owner.token(), null, "en").body().get("message").asText()).isEqualTo("Reservation not found");
    }

    // ------------------------------------------------------------------------------------------ accounts and sessions

    @Test
    void anUnconfirmedEmailCannotSignIn() throws Exception {
        Reply registered = call("POST", "/auth/register", null, Map.of("name", "Someone", "email", "notyet@test.tn",
                "password", "secret123", "phone", "29999999", "role", "SAMSAR"));
        assertThat(registered.body().path("verificationRequired").asBoolean()).as(registered.status() + " " + registered.body()).isTrue();
        assertThat(call("POST", "/auth/login", null, Map.of("email", "notyet@test.tn", "password", "wrong-pass")).status()).isEqualTo(401);
        assertThat(call("POST", "/auth/login", null, Map.of("email", "notyet@test.tn", "password", "secret123")).status()).isEqualTo(403);

        String first = lastLinkTo("notyet@test.tn", "verify-email");
        assertThat(call("POST", "/auth/resend-verification", null, Map.of("email", "notyet@test.tn")).status()).isEqualTo(204);
        String second = lastLinkTo("notyet@test.tn", "verify-email");
        assertThat(second).isNotEqualTo(first);
        assertThat(call("POST", "/auth/verify-email", null, Map.of("token", first)).status()).as("replaced by the new link").isEqualTo(400);
        assertThat(call("POST", "/auth/verify-email", null, Map.of("token", second)).status()).isEqualTo(204);
        assertThat(call("POST", "/auth/verify-email", null, Map.of("token", second)).status()).as("used once").isEqualTo(400);
        assertThat(call("POST", "/auth/login", null, Map.of("email", "notyet@test.tn", "password", "secret123")).status()).isEqualTo(200);
    }

    @Test
    void theSessionCookieWorksAndNeedsTheAppHeaderToChangeThings() throws Exception {
        Account account = account("SAMSAR");
        Reply login = call("POST", "/auth/login", null, Map.of("email", account.email(), "password", account.password()));
        String setCookie = login.headers().cookie();
        assertThat(setCookie).contains("samsara_token=", "HttpOnly", "SameSite=Lax");
        String cookie = setCookie.substring(0, setCookie.indexOf(';'));

        assertThat(send("GET", "/auth/profile", Map.of("Cookie", cookie), null).status()).isEqualTo(200);
        Map<String, Object> profile = Map.of("name", "Renamed", "phone", account.phone());
        assertThat(send("PUT", "/auth/profile", Map.of("Cookie", cookie), profile).status()).as("no app header").isEqualTo(403);
        assertThat(send("PUT", "/auth/profile", Map.of("Cookie", cookie, "X-Requested-With", "XMLHttpRequest"), profile).status()).isEqualTo(200);

        Reply logout = send("POST", "/auth/logout", Map.of("Cookie", cookie, "X-Requested-With", "XMLHttpRequest"), null);
        assertThat(logout.headers().cookie()).contains("Max-Age=0");
    }

    @Test
    void changingThePasswordSignsOutTheOtherDevices() throws Exception {
        Account account = account("SAMSAR");
        String otherDevice = call("POST", "/auth/login", null, Map.of("email", account.email(), "password", account.password()))
                .body().get("access_token").asText();
        Reply changed = call("PUT", "/auth/password", account.token(), Map.of("currentPassword", "secret123", "newPassword", "newsecret1"));
        assertThat(changed.status()).isEqualTo(200);
        String thisDevice = changed.body().get("access_token").asText();

        assertThat(call("GET", "/auth/profile", otherDevice, null).status()).isEqualTo(401);
        assertThat(call("GET", "/auth/profile", account.token(), null).status()).isEqualTo(401);
        assertThat(call("GET", "/auth/profile", thisDevice, null).status()).isEqualTo(200);

        assertThat(call("POST", "/auth/logout-all", thisDevice, null).status()).isEqualTo(204);
        assertThat(call("GET", "/auth/profile", thisDevice, null).status()).isEqualTo(401);
    }

    @Test
    void loginIsBlockedAfterTooManyFailures() throws Exception {
        Account account = account("SAMSAR");
        Map<String, String> wrong = Map.of("email", account.email(), "password", "wrong-password");
        for (int i = 0; i < 5; i++) {
            assertThat(call("POST", "/auth/login", null, wrong).status()).isEqualTo(401);
        }
        assertThat(call("POST", "/auth/login", null, wrong).status()).isEqualTo(429);
        assertThat(call("POST", "/auth/login", null, Map.of("email", account.email(), "password", "secret123")).status())
                .as("even the right password waits").isEqualTo(429);
    }

    @Test
    void forgottenPasswordCanBeResetOnceThroughTheEmailedLink() throws Exception {
        Account account = account("SAMSAR");
        assertThat(call("POST", "/auth/forgot-password", null, Map.of("email", "nobody@test.tn")).status()).isEqualTo(204);
        assertThat(call("POST", "/auth/forgot-password", null, Map.of("email", account.email(), "language", "fr")).status()).isEqualTo(204);
        String token = lastLinkTo(account.email(), "reset-password");

        assertThat(call("POST", "/auth/reset-password", null, Map.of("token", "bad-token", "newPassword", "newsecret1")).status()).isEqualTo(400);
        assertThat(call("POST", "/auth/reset-password", null, Map.of("token", token, "newPassword", "newsecret1")).status()).isEqualTo(204);
        assertThat(call("GET", "/auth/profile", account.token(), null).status()).as("old sessions end").isEqualTo(401);
        assertThat(call("POST", "/auth/login", null, Map.of("email", account.email(), "password", "secret123")).status()).isEqualTo(401);
        assertThat(call("POST", "/auth/login", null, Map.of("email", account.email(), "password", "newsecret1")).status()).isEqualTo(200);
        assertThat(call("POST", "/auth/reset-password", null, Map.of("token", token, "newPassword", "another1")).status())
                .as("the link works only once").isEqualTo(400);
    }
}
