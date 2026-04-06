BEGIN;

ALTER TABLE price_alert
    ADD CONSTRAINT chk_price_alert_threshold
    CHECK (increase_pct IS NOT NULL OR decrease_pct IS NOT NULL);

COMMIT;
