CREATE TABLE IF NOT EXISTS public."set_price" (
    set_code varchar NOT NULL PRIMARY KEY,
    -- base_price = in main
    base_price numeric,
    -- total_price = in_main + !in_main
    total_price numeric,
    -- in_mail normal + foil
    base_price_all numeric,
    -- normal + foil
    total_price_all numeric,
    date date NOT NULL,
    CONSTRAINT FK_set_price_set FOREIGN KEY (set_code) REFERENCES public."set"(code) ON DELETE CASCADE
);