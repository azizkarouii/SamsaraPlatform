-- The balance is now taken as paid when the stay starts (kind 'balance', deletable).
-- Stays already started with nothing recorded after the advance get it too.
INSERT INTO reservation_payments (reservation_id, amount, paid_on, kind, note, recorded_by, created_at)
SELECT r.id, r.total_amount - COALESCE(SUM(p.amount), 0), r.start_date, 'balance', NULL, NULL, CURRENT_TIMESTAMP
FROM reservations r
LEFT JOIN reservation_payments p ON p.reservation_id = r.id
WHERE r.status IN ('in-progress', 'completed')
  AND NOT EXISTS (SELECT 1 FROM reservation_payments m WHERE m.reservation_id = r.id AND m.kind <> 'advance')
GROUP BY r.id, r.total_amount, r.start_date
HAVING r.total_amount - COALESCE(SUM(p.amount), 0) > 0;
