-- Language of each user, for the emails the app sends on its own (reminders). Taken at sign-up, at sign-in
-- and when the user switches language in the app.
ALTER TABLE users ADD COLUMN language varchar(5) NOT NULL DEFAULT 'fr';

-- The first test notifications were written in English ("Reservation for Jean on property 1 ... has been
-- created"): they get a translation key like the others, from their reservation.
UPDATE notifications n
SET message_key = CASE WHEN n.message LIKE '% has been created' THEN 'reservation_created' ELSE 'reservation_confirmed' END,
    type = CASE WHEN n.message LIKE '% has been created' THEN 'reservation_created' ELSE 'reservation_confirmed' END,
    message_params = CASE WHEN n.message LIKE '% has been created'
        THEN json_build_object('actor', COALESCE(u.name, ''), 'property', p.title, 'client', r.client_name,
                               'start', r.start_date::text, 'end', r.end_date::text)::text
        ELSE json_build_object('property', p.title, 'client', r.client_name,
                               'start', r.start_date::text, 'end', r.end_date::text)::text
    END
FROM reservations r
JOIN properties p ON p.id = r.property_id
LEFT JOIN users u ON u.id = r.samsar_id
WHERE n.reservation_id = r.id
  AND n.message_key IS NULL
  AND n.type = 'reservation'
  AND (n.message LIKE 'Reservation for % has been created' OR n.message LIKE 'Reservation for % has been confirmed');
