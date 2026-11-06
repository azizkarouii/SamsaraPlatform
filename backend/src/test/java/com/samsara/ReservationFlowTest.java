package com.samsara;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.ActiveProfiles;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;

/** Business rules through the real HTTP API, on an in-memory database. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class ReservationFlowTest {

    private static final AtomicInteger SEQUENCE = new AtomicInteger();
    private final HttpClient http = HttpClient.newHttpClient();

    @Autowired
    private ObjectMapper json;

    @MockBean
    private JavaMailSender mailSender;

    @LocalServerPort
    private int port;

    private String owner;
    private String commissionSamsar;
    private String marginSamsar;
    private long house;

    private record Reply(int status, JsonNode body) {}

    private Reply call(String method, String path, String token, Object body, String language) throws Exception {
        HttpRequest.Builder request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api" + path))
                .header("Content-Type", "application/json")
                .method(method, body == null ? HttpRequest.BodyPublishers.noBody()
                        : HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)));
        if (token != null) request.header("Authorization", "Bearer " + token);
        if (language != null) request.header("Accept-Language", language);
        HttpResponse<String> response = http.send(request.build(), HttpResponse.BodyHandlers.ofString());
        return new Reply(response.statusCode(), response.body().isEmpty() ? json.nullNode() : json.readTree(response.body()));
    }

    private Reply call(String method, String path, String token, Object body) throws Exception {
        return call(method, path, token, body, null);
    }

    private record Account(String token, String email, String phone) {}

    private Account account(String role) throws Exception {
        int n = SEQUENCE.incrementAndGet();
        String email = "user" + n + "@test.tn";
        String phone = String.format("2%07d", n);
        Reply reply = call("POST", "/auth/register", null, Map.of("name", "User " + n, "email", email,
                "password", "secret123", "phone", phone, "role", role));
        assertThat(reply.status()).isEqualTo(200);
        return new Account(reply.body().get("access_token").asText(), email, phone);
    }

    private String invited(long property, Map<String, Object> deal) throws Exception {
        Account samsar = account("SAMSAR");
        Map<String, Object> body = new HashMap<>(deal);
        body.putAll(Map.of("propertyId", property, "email", samsar.email(), "phone", samsar.phone()));
        assertThat(call("POST", "/property-samsars", owner, body).status()).isEqualTo(200);
        return samsar.token();
    }

    @BeforeEach
    void houseWithTwoSamsars() throws Exception {
        owner = account("PROPRIETAIRE").token();
        house = call("POST", "/properties", owner, Map.of("title", "Dar", "pricePerDay", 150)).body().get("id").asLong();
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

    private void setStatus(String token, long id, String status, Double paidAfterAdvance) throws Exception {
        Map<String, Object> body = new HashMap<>(Map.of("status", status));
        if (paidAfterAdvance != null) body.put("paidAfterAdvance", paidAfterAdvance);
        Reply reply = call("PATCH", "/reservations/" + id + "/status", token, body);
        assertThat(reply.status()).as(reply.body().toString()).isEqualTo(200);
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

    @Test
    void commissionIsAPercentageOfTheTotal() throws Exception {
        assertThat(booked(commissionSamsar, 10, 10, 300 / 2.0, null, 0).get("samsarGain").asDouble()).isEqualTo(15.0);
        assertThat(book(commissionSamsar, 11, 11, 151, null, 0).status()).isEqualTo(400);
    }

    @Test
    void fixedMarginIsWhatIsChargedAboveTheHousePrice() throws Exception {
        assertThat(booked(marginSamsar, 10, 11, 340, null, 0).get("samsarGain").asDouble()).isEqualTo(40.0);
        assertThat(book(marginSamsar, 12, 12, 171, null, 0).status()).isEqualTo(400);
    }

    @Test
    void pricesByPeriodAreCalculatedDayByDayEveryYear() throws Exception {
        int year = LocalDate.now().getYear() + 1;
        Reply saved = call("PATCH", "/properties/" + house, owner, Map.of("seasonalPrices", List.of(
                Map.of("startDate", "07-01", "endDate", "07-07", "pricePerDay", 100),
                Map.of("startDate", "07-08", "endDate", "07-31", "pricePerDay", 200),
                Map.of("startDate", "12-20", "endDate", "01-10", "pricePerDay", 30))));
        assertThat(saved.status()).isEqualTo(200);
        for (int y : new int[]{year, year + 2}) {
            Reply reply = call("POST", "/reservations", owner, Map.of("propertyId", house, "clientName", "C", "totalAmount", 1,
                    "startDate", y + "-07-05", "endDate", y + "-07-14"));
            assertThat(reply.body().get("baseAmount").asDouble()).isEqualTo(3 * 100 + 7 * 200);
        }
        Reply acrossNewYear = call("POST", "/reservations", owner, Map.of("propertyId", house, "clientName", "C", "totalAmount", 1,
                "startDate", year + "-12-30", "endDate", (year + 1) + "-01-02"));
        assertThat(acrossNewYear.body().get("baseAmount").asDouble()).isEqualTo(4 * 30);
    }

    @Test
    void overlappingPeriodsAreRefused() throws Exception {
        assertThat(call("PATCH", "/properties/" + house, owner, Map.of("seasonalPrices", List.of(
                Map.of("startDate", "12-20", "endDate", "01-10", "pricePerDay", 30),
                Map.of("startDate", "01-05", "endDate", "01-20", "pricePerDay", 30)))).status()).isEqualTo(400);
    }

    @Test
    void negotiatedPriceKeepsTheSamsarDealAndComesOutOfTheOwnerPart() throws Exception {
        JsonNode commission = booked(commissionSamsar, 10, 10, 130, 130.0, 0);
        assertThat(commission.get("samsarGain").asDouble()).isEqualTo(13.0);

        JsonNode margin = booked(marginSamsar, 11, 12, 260, 130.0, 0);
        assertThat(margin.get("samsarGain").asDouble()).isEqualTo(40.0);

        assertThat(book(marginSamsar, 13, 13, 131, 130.0, 0).status()).as("no margin added on top").isEqualTo(400);
        assertThat(book(commissionSamsar, 14, 14, 150, 150.0, 0).status()).as("must be below the usual price").isEqualTo(400);
    }

    @Test
    void advanceGoesToTheOwnerAndTheSamsarGainComesOnceTheStayStarts() throws Exception {
        JsonNode reservation = booked(commissionSamsar, 0, 19, 3000, null, 1000);
        long id = reservation.get("id").asLong();
        assertThat(reservation.get("status").asText()).isEqualTo("confirmed");
        assertThat(earnings(owner, id)).containsExactly(1000.0, 0.0);
        assertThat(earnings(commissionSamsar, id)).containsExactly(0.0, 300.0);

        setStatus(commissionSamsar, id, "in-progress", null);
        assertThat(earnings(owner, id)).containsExactly(2700.0, 0.0);
        assertThat(earnings(commissionSamsar, id)).containsExactly(300.0, 0.0);
    }

    @Test
    void cancellationBeforeTheStayLeavesTheAdvanceToTheOwner() throws Exception {
        long id = booked(commissionSamsar, 10, 29, 3000, null, 1000).get("id").asLong();
        setStatus(owner, id, "cancelled", null);
        assertThat(earnings(owner, id)[0]).isEqualTo(1000.0);
        assertThat(earnings(commissionSamsar, id)[0]).isEqualTo(0.0);

        assertThat(call("PUT", "/reservations/" + id + "/refund", commissionSamsar, Map.of("amount", 5)).status()).isEqualTo(409);
        assertThat(call("PUT", "/reservations/" + id + "/refund", owner, Map.of("amount", 1001)).status()).isEqualTo(400);
        assertThat(call("PUT", "/reservations/" + id + "/refund", owner, Map.of("amount", 400)).status()).isEqualTo(200);
        assertThat(earnings(owner, id)[0]).isEqualTo(600.0);
    }

    @Test
    void cancellationDuringTheStayTakesTheSamsarGainFromWhatWasPaidAfterTheAdvance() throws Exception {
        long enough = booked(commissionSamsar, 0, 19, 3000, null, 1000).get("id").asLong();
        setStatus(commissionSamsar, enough, "in-progress", null);
        Reply tooMuch = call("PATCH", "/reservations/" + enough + "/status", owner, Map.of("status", "cancelled", "paidAfterAdvance", 2001));
        assertThat(tooMuch.status()).isEqualTo(400);
        setStatus(owner, enough, "cancelled", 2000.0);
        assertThat(earnings(commissionSamsar, enough)[0]).isEqualTo(300.0);
        assertThat(earnings(owner, enough)[0]).isEqualTo(2700.0);

        long partly = booked(commissionSamsar, 0, 19, 3000, null, 1000).get("id").asLong();
        setStatus(commissionSamsar, partly, "in-progress", null);
        setStatus(owner, partly, "cancelled", 100.0);
        assertThat(earnings(commissionSamsar, partly)[0]).as("limited to what was paid").isEqualTo(100.0);
        assertThat(earnings(owner, partly)[0]).isEqualTo(1000.0);

        long nothing = booked(commissionSamsar, 0, 19, 3000, null, 1000).get("id").asLong();
        setStatus(commissionSamsar, nothing, "in-progress", null);
        setStatus(owner, nothing, "cancelled", null);
        assertThat(earnings(commissionSamsar, nothing)[0]).isEqualTo(0.0);
        assertThat(earnings(owner, nothing)[0]).isEqualTo(1000.0);
    }

    @Test
    void earlyEndFreesTheFollowingDaysAndKeepsThePriceAndTheGain() throws Exception {
        JsonNode stay = booked(commissionSamsar, 0, 6, 1050, null, 100);
        long id = stay.get("id").asLong();
        setStatus(commissionSamsar, id, "in-progress", null);
        assertThat(book(owner, 3, 4, 300, null, 10).status()).isEqualTo(409);

        Reply ended = call("POST", "/reservations/" + id + "/early-end", commissionSamsar, Map.of("endDate", day(0)));
        assertThat(ended.body().get("status").asText()).isEqualTo("completed");
        assertThat(ended.body().get("originalEndDate").asText()).isEqualTo(day(6));
        assertThat(ended.body().get("totalAmount").asDouble()).isEqualTo(1050.0);
        assertThat(ended.body().get("samsarGain").asDouble()).isEqualTo(105.0);
        assertThat(book(owner, 3, 4, 300, null, 10).status()).isEqualTo(200);
    }

    @Test
    void eachOneGivesMoneyBackFromHisOwnPart() throws Exception {
        long id = booked(commissionSamsar, 0, 6, 1050, null, 100).get("id").asLong();
        setStatus(commissionSamsar, id, "in-progress", null);

        assertThat(call("PUT", "/reservations/" + id + "/refund", commissionSamsar, Map.of("amount", 106)).status()).isEqualTo(400);
        assertThat(call("PUT", "/reservations/" + id + "/refund", commissionSamsar, Map.of("amount", 25)).status()).isEqualTo(200);
        assertThat(call("PUT", "/reservations/" + id + "/refund", owner, Map.of("amount", 200)).status()).isEqualTo(200);
        assertThat(call("PUT", "/reservations/" + id + "/refund", marginSamsar, Map.of("amount", 1)).status()).isEqualTo(403);

        assertThat(earnings(commissionSamsar, id)[0]).isEqualTo(80.0);
        assertThat(earnings(owner, id)[0]).isEqualTo(745.0);
    }

    @Test
    void anotherSamsarSeesNeitherGainNorRefund() throws Exception {
        long id = booked(commissionSamsar, 0, 1, 300, null, 10).get("id").asLong();
        setStatus(commissionSamsar, id, "in-progress", null);
        call("PUT", "/reservations/" + id + "/refund", owner, Map.of("amount", 10));

        JsonNode seen = call("GET", "/reservations/" + id, marginSamsar, null).body();
        assertThat(seen.get("samsarGain").isNull()).isTrue();
        assertThat(seen.get("refundAmount").isNull()).isTrue();
        assertThat(call("GET", "/reservations/" + id, owner, null).body().get("samsarGain").asDouble()).isEqualTo(30.0);
    }

    @Test
    void simultaneousBookingsOfTheSameDatesCannotBothBeConfirmed() throws Exception {
        List<Callable<Integer>> attempts = new ArrayList<>();
        for (int i = 0; i < 6; i++) {
            attempts.add(() -> book(owner, 50, 55, 900, null, 100).status());
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

        JsonNode confirmed = call("GET", "/reservations/page?status=confirmed", commissionSamsar, null).body();
        assertThat(confirmed.get("totalElements").asInt()).isEqualTo(1);

        String search = URLEncoder.encode("client 3", StandardCharsets.UTF_8);
        assertThat(call("GET", "/reservations/page?search=" + search, commissionSamsar, null).body().get("totalElements").asInt()).isEqualTo(1);

        for (String sort : List.of("clientName", "propertyTitle", "status", "totalAmount")) {
            assertThat(call("GET", "/reservations/page?sort=" + sort, owner, null).status()).as(sort).isEqualTo(200);
        }
        assertThat(call("GET", "/reservations/page", marginSamsar, null).body().get("content").get(0).get("samsarGain").isNull()).isTrue();
    }

    @Test
    void notificationsAreTranslatableAndPaged() throws Exception {
        booked(commissionSamsar, 80, 80, 150, null, 0);
        JsonNode page = call("GET", "/notifications/page?size=1", owner, null).body();
        assertThat(page.get("content")).hasSize(1);
        JsonNode notification = page.get("content").get(0);
        assertThat(notification.get("messageKey").asText()).isEqualTo("reservation_created");
        assertThat(json.readTree(notification.get("messageParams").asText()).get("property").asText()).isEqualTo("Dar");
    }

    @Test
    void externalLinksMustBeWebAddresses() throws Exception {
        assertThat(call("PATCH", "/properties/" + house, owner, Map.of("links", List.of("javascript:alert(1)"))).status()).isEqualTo(400);
        assertThat(call("PATCH", "/properties/" + house, owner, Map.of("links", List.of("https://www.tiktok.com/@x/video/1"))).status()).isEqualTo(200);
        assertThat(call("GET", "/properties/" + house, null, null).body().get("links")).hasSize(1);
    }

    @Test
    void errorsFollowTheLanguageOfTheRequest() throws Exception {
        assertThat(call("GET", "/reservations/999999", owner, null, "fr").body().get("message").asText()).isEqualTo("Réservation introuvable");
        assertThat(call("GET", "/reservations/999999", owner, null, "ar").body().get("message").asText()).isEqualTo("الحجز غير موجود");
        assertThat(call("GET", "/reservations/999999", owner, null, "en").body().get("message").asText()).isEqualTo("Reservation not found");
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

        ArgumentCaptor<SimpleMailMessage> mail = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(mail.capture());
        assertThat(mail.getValue().getTo()).containsExactly(account.email());
        String text = mail.getValue().getText();
        String token = text.substring(text.indexOf("token=") + 6).split("\\s")[0];

        assertThat(call("POST", "/auth/reset-password", null, Map.of("token", "bad-token", "newPassword", "newsecret1")).status()).isEqualTo(400);
        assertThat(call("POST", "/auth/reset-password", null, Map.of("token", token, "newPassword", "newsecret1")).status()).isEqualTo(204);
        assertThat(call("POST", "/auth/login", null, Map.of("email", account.email(), "password", "secret123")).status()).isEqualTo(401);
        assertThat(call("POST", "/auth/login", null, Map.of("email", account.email(), "password", "newsecret1")).status()).isEqualTo(200);
        assertThat(call("POST", "/auth/reset-password", null, Map.of("token", token, "newPassword", "another1")).status())
                .as("the link works only once").isEqualTo(400);
    }
}
