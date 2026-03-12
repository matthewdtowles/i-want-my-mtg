-- Rename *_change_7d columns to *_change_weekly (idempotent)
-- If both _7d and _weekly exist (from a prior buggy migration run), drop the duplicate _7d column

DO $$
BEGIN
    -- price table
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'price' AND column_name = 'normal_change_7d') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'price' AND column_name = 'normal_change_weekly') THEN
            ALTER TABLE public.price DROP COLUMN normal_change_7d;
        ELSE
            ALTER TABLE public.price RENAME COLUMN normal_change_7d TO normal_change_weekly;
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'price' AND column_name = 'foil_change_7d') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'price' AND column_name = 'foil_change_weekly') THEN
            ALTER TABLE public.price DROP COLUMN foil_change_7d;
        ELSE
            ALTER TABLE public.price RENAME COLUMN foil_change_7d TO foil_change_weekly;
        END IF;
    END IF;

    -- set_price table
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'set_price' AND column_name = 'base_price_change_7d') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'set_price' AND column_name = 'base_price_change_weekly') THEN
            ALTER TABLE public.set_price DROP COLUMN base_price_change_7d;
        ELSE
            ALTER TABLE public.set_price RENAME COLUMN base_price_change_7d TO base_price_change_weekly;
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'set_price' AND column_name = 'total_price_change_7d') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'set_price' AND column_name = 'total_price_change_weekly') THEN
            ALTER TABLE public.set_price DROP COLUMN total_price_change_7d;
        ELSE
            ALTER TABLE public.set_price RENAME COLUMN total_price_change_7d TO total_price_change_weekly;
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'set_price' AND column_name = 'base_price_all_change_7d') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'set_price' AND column_name = 'base_price_all_change_weekly') THEN
            ALTER TABLE public.set_price DROP COLUMN base_price_all_change_7d;
        ELSE
            ALTER TABLE public.set_price RENAME COLUMN base_price_all_change_7d TO base_price_all_change_weekly;
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'set_price' AND column_name = 'total_price_all_change_7d') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'set_price' AND column_name = 'total_price_all_change_weekly') THEN
            ALTER TABLE public.set_price DROP COLUMN total_price_all_change_7d;
        ELSE
            ALTER TABLE public.set_price RENAME COLUMN total_price_all_change_7d TO total_price_all_change_weekly;
        END IF;
    END IF;
END $$;
