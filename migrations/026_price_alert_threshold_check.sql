DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_price_alert_threshold'
    ) THEN
        ALTER TABLE price_alert
            ADD CONSTRAINT chk_price_alert_threshold
            CHECK (increase_pct IS NOT NULL OR decrease_pct IS NOT NULL);
    END IF;
END;
$$;
