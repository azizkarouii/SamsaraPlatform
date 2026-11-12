package com.samsara;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.time.Clock;
import java.util.TimeZone;

@SpringBootApplication
@EnableScheduling
public class SamsaraApplication {

    /** Where the houses are: "today" for a stay or a payment is the day there, whatever the server's own clock. */
    static final String DEFAULT_TIMEZONE = "Africa/Tunis";

    public static void main(String[] args) {
        String zone = System.getenv().getOrDefault("APP_TIMEZONE", DEFAULT_TIMEZONE);
        TimeZone.setDefault(TimeZone.getTimeZone(zone));
        SpringApplication.run(SamsaraApplication.class, args);
    }

    /** The current time, replaced by a fixed one in the tests. */
    @Bean
    public Clock clock() {
        return Clock.systemDefaultZone();
    }
}
