-- Set price history table for tracking set prices over time
CREATE TABLE IF NOT EXISTS public.set_price_history (
    id integer NOT NULL GENERATED ALWAYS AS IDENTITY,
    set_code varchar NOT NULL,
    base_price numeric,
    total_price numeric,
    base_price_all numeric,
    total_price_all numeric,
    date date NOT NULL,
    CONSTRAINT set_price_history_pkey PRIMARY KEY (id),
    CONSTRAINT uq_set_price_history_set_code_date UNIQUE (set_code, date),
    CONSTRAINT fk_set_price_history_set FOREIGN KEY (set_code)
        REFERENCES public."set"(code) ON DELETE CASCADE
);
