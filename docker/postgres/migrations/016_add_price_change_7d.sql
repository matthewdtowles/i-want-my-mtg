-- Add 7-day price change columns to price and set_price tables

ALTER TABLE public.price
    ADD COLUMN IF NOT EXISTS normal_change_7d numeric,
    ADD COLUMN IF NOT EXISTS foil_change_7d numeric;

ALTER TABLE public.set_price
    ADD COLUMN IF NOT EXISTS base_price_change_7d numeric,
    ADD COLUMN IF NOT EXISTS total_price_change_7d numeric,
    ADD COLUMN IF NOT EXISTS base_price_all_change_7d numeric,
    ADD COLUMN IF NOT EXISTS total_price_all_change_7d numeric;
