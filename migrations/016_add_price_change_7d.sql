-- Add 7-day price change columns to price and set_price tables (idempotent)
-- Skips if the final _change_weekly columns already exist (from init script)

DO $$
BEGIN
    -- price table: add _change_7d only if neither _7d nor _weekly exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'price' AND column_name IN ('normal_change_7d', 'normal_change_weekly')) THEN
        ALTER TABLE public.price ADD COLUMN normal_change_7d numeric;
        ALTER TABLE public.price ADD COLUMN foil_change_7d numeric;
    END IF;

    -- set_price table: add _change_7d only if neither _7d nor _weekly exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'set_price' AND column_name IN ('base_price_change_7d', 'base_price_change_weekly')) THEN
        ALTER TABLE public.set_price ADD COLUMN base_price_change_7d numeric;
        ALTER TABLE public.set_price ADD COLUMN total_price_change_7d numeric;
        ALTER TABLE public.set_price ADD COLUMN base_price_all_change_7d numeric;
        ALTER TABLE public.set_price ADD COLUMN total_price_all_change_7d numeric;
    END IF;
END $$;
