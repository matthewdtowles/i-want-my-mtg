-- Rename *_change_7d columns to *_change_weekly

ALTER TABLE public.price
    RENAME COLUMN normal_change_7d TO normal_change_weekly;

ALTER TABLE public.price
    RENAME COLUMN foil_change_7d TO foil_change_weekly;

ALTER TABLE public.set_price
    RENAME COLUMN base_price_change_7d TO base_price_change_weekly;

ALTER TABLE public.set_price
    RENAME COLUMN total_price_change_7d TO total_price_change_weekly;

ALTER TABLE public.set_price
    RENAME COLUMN base_price_all_change_7d TO base_price_all_change_weekly;

ALTER TABLE public.set_price
    RENAME COLUMN total_price_all_change_7d TO total_price_all_change_weekly;
