CREATE SEQUENCE IF NOT EXISTS public.set_price_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE public."set_price" (
    id integer NOT NULL DEFAULT nextval('public.set_price_id_seq'::regclass),
    set_code varchar NOT NULL,
    base_price numeric,
    total_price numeric,
    base_price_all numeric,
    total_price_all numeric,
    date date NOT NULL,
    CONSTRAINT PK_set_price PRIMARY KEY (id),
    CONSTRAINT UQ_set_price_setcode_date UNIQUE (set_code, date),
    CONSTRAINT FK_set_price_set FOREIGN KEY (set_code) REFERENCES public."set"(code) ON DELETE CASCADE
);

ALTER SEQUENCE public.set_price_id_seq OWNED BY public."set_price".id;