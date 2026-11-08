package com.samsara;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.time.Clock;

@SpringBootApplication
@EnableScheduling
public class SamsaraApplication {
    public static void main(String[] args) {
        SpringApplication.run(SamsaraApplication.class, args);
    }

    /** The current time, replaced by a fixed one in the tests. */
    @Bean
    public Clock clock() {
        return Clock.systemDefaultZone();
    }
}
