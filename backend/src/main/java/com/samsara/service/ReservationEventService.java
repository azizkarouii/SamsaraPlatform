package com.samsara.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.samsara.entity.Reservation;
import com.samsara.entity.ReservationEvent;
import com.samsara.entity.User;
import com.samsara.repository.ReservationEventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

/** Writes the history of a booking: who did what, and when. */
@Service
@RequiredArgsConstructor
public class ReservationEventService {

    private final ReservationEventRepository eventRepository;
    private final ObjectMapper objectMapper;

    /** @param actor null when the application acted on its own */
    public void record(Reservation reservation, User actor, String action, Map<String, ?> details) {
        eventRepository.save(ReservationEvent.builder()
                .reservationId(reservation.getId())
                .propertyId(reservation.getPropertyId())
                .actorId(actor != null ? actor.getId() : null)
                .actorName(actor != null ? actor.getName() : null)
                .action(action)
                .details(json(details))
                .build());
    }

    public List<ReservationEvent> findByReservation(Long reservationId) {
        return eventRepository.findByReservationIdOrderByCreatedAtAscIdAsc(reservationId);
    }

    private String json(Map<String, ?> details) {
        if (details == null || details.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(details);
        } catch (JsonProcessingException e) {
            return null;
        }
    }
}
