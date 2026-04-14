--
-- PostgreSQL database dump
--

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: card_rarity_enum; Type: TYPE; Schema: public
--

CREATE TYPE public.card_rarity_enum AS ENUM (
    'common',
    'uncommon',
    'rare',
    'mythic',
    'bonus',
    'special'
);



--
-- Name: format_enum; Type: TYPE; Schema: public
--

CREATE TYPE public.format_enum AS ENUM (
    'standard',
    'commander',
    'modern',
    'legacy',
    'vintage',
    'brawl',
    'explorer',
    'historic',
    'oathbreaker',
    'pauper',
    'pioneer'
);



--
-- Name: legality_status_enum; Type: TYPE; Schema: public
--

CREATE TYPE public.legality_status_enum AS ENUM (
    'legal',
    'banned',
    'restricted'
);



--
-- Name: status_enum; Type: TYPE; Schema: public
--

CREATE TYPE public.status_enum AS ENUM (
    'legal',
    'banned',
    'restricted'
);



--
-- Name: user_role_enum; Type: TYPE; Schema: public
--

CREATE TYPE public.user_role_enum AS ENUM (
    'admin',
    'user'
);



SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: card; Type: TABLE; Schema: public
--

CREATE TABLE public.card (
    id character varying NOT NULL,
    artist character varying,
    flavor_name character varying,
    has_foil boolean NOT NULL,
    has_non_foil boolean NOT NULL,
    img_src character varying NOT NULL,
    is_reserved boolean DEFAULT false NOT NULL,
    mana_cost character varying,
    name character varying NOT NULL,
    number character varying NOT NULL,
    oracle_text text,
    "order" integer NOT NULL,
    rarity public.card_rarity_enum NOT NULL,
    set_code character varying NOT NULL,
    type character varying NOT NULL,
    tcgplayer_product_id character varying,
    tcgplayer_etched_product_id character varying
);



--
-- Name: card_order_seq; Type: SEQUENCE; Schema: public
--

CREATE SEQUENCE public.card_order_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: card_order_seq; Type: SEQUENCE OWNED BY; Schema: public
--

ALTER SEQUENCE public.card_order_seq OWNED BY public.card."order";



--
-- Name: inventory; Type: TABLE; Schema: public
--

CREATE TABLE public.inventory (
    card_id character varying NOT NULL,
    user_id integer NOT NULL,
    foil boolean NOT NULL,
    quantity integer DEFAULT 1 NOT NULL
);



--
-- Name: legality; Type: TABLE; Schema: public
--

CREATE TABLE public.legality (
    format public.format_enum NOT NULL,
    status public.legality_status_enum NOT NULL,
    card_id character varying NOT NULL
);



--
-- Name: price; Type: TABLE; Schema: public
--

CREATE TABLE public.price (
    id integer NOT NULL,
    foil numeric,
    normal numeric,
    date date NOT NULL,
    card_id character varying,
    normal_change_weekly numeric,
    foil_change_weekly numeric
);



--
-- Name: price_history; Type: TABLE; Schema: public
--

CREATE TABLE public.price_history (
    id integer NOT NULL,
    foil numeric,
    normal numeric,
    date date NOT NULL,
    card_id character varying
);



--
-- Name: price_history_id_seq; Type: SEQUENCE; Schema: public
--

ALTER TABLE public.price_history ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.price_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: price_id_seq; Type: SEQUENCE; Schema: public
--

CREATE SEQUENCE public.price_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: price_id_seq; Type: SEQUENCE OWNED BY; Schema: public
--

ALTER SEQUENCE public.price_id_seq OWNED BY public.price.id;


--
-- Name: set; Type: TABLE; Schema: public
--

CREATE TABLE public.set (
    code character varying NOT NULL,
    base_size integer NOT NULL,
    block character varying,
    keyrune_code character varying NOT NULL,
    name character varying NOT NULL,
    parent_code character varying,
    release_date date NOT NULL,
    type character varying NOT NULL,
    is_main boolean NOT NULL DEFAULT true
);



--
-- Name: users; Type: TABLE; Schema: public
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email character varying NOT NULL,
    name character varying NOT NULL,
    password character varying NOT NULL,
    role public.user_role_enum DEFAULT 'user'::public.user_role_enum NOT NULL
);



--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: card order; Type: DEFAULT; Schema: public
--

ALTER TABLE ONLY public.card ALTER COLUMN "order" SET DEFAULT nextval('public.card_order_seq'::regclass);


--
-- Name: price id; Type: DEFAULT; Schema: public
--

ALTER TABLE ONLY public.price ALTER COLUMN id SET DEFAULT nextval('public.price_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: legality PK_5d47fb12ee9f5adc5bb8e36a842; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.legality
    ADD CONSTRAINT "PK_5d47fb12ee9f5adc5bb8e36a842" PRIMARY KEY (card_id, format);


--
-- Name: inventory PK_83dd749dbfec0574295a68f3e0f; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT "PK_83dd749dbfec0574295a68f3e0f" PRIMARY KEY (card_id, user_id, foil);


--
-- Name: card PK_9451069b6f1199730791a7f4ae4; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.card
    ADD CONSTRAINT "PK_9451069b6f1199730791a7f4ae4" PRIMARY KEY (id);


--
-- Name: users PK_a3ffb1c0c8416b9fc6f907b7433; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY (id);


--
-- Name: price PK_d163e55e8cce6908b2e0f27cea4; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.price
    ADD CONSTRAINT "PK_d163e55e8cce6908b2e0f27cea4" PRIMARY KEY (id);


--
-- Name: set PK_e7149fddfa204f00c1113ac5b1b; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.set
    ADD CONSTRAINT "PK_e7149fddfa204f00c1113ac5b1b" PRIMARY KEY (code);


--
-- Name: price UQ_182035bb64a5e455b91e9a4d24e; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.price
    ADD CONSTRAINT "UQ_182035bb64a5e455b91e9a4d24e" UNIQUE (card_id, date);


--
-- Name: users UQ_97672ac88f789774dd47f7c8be3; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE (email);


--
-- Name: price_history price_history_pkey; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.price_history
    ADD CONSTRAINT price_history_pkey PRIMARY KEY (id);


--
-- Name: price_history uq_card_date_history; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.price_history
    ADD CONSTRAINT uq_card_date_history UNIQUE (card_id, date);


--
-- Name: inventory FK_Inventory_Card; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT "FK_Inventory_Card" FOREIGN KEY (card_id) REFERENCES public.card(id) ON DELETE CASCADE;


--
-- Name: inventory FK_Inventory_User; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT "FK_Inventory_User" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: price FK_b8288d2373b2e06555bfeca6139; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.price
    ADD CONSTRAINT "FK_b8288d2373b2e06555bfeca6139" FOREIGN KEY (card_id) REFERENCES public.card(id) ON DELETE CASCADE;


--
-- Name: card FK_e53fc463a7a6cc91ddc4f3a6c58; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.card
    ADD CONSTRAINT "FK_e53fc463a7a6cc91ddc4f3a6c58" FOREIGN KEY (set_code) REFERENCES public.set(code);


--
-- Name: legality FK_f224925d2e2d1811a75d09bef70; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.legality
    ADD CONSTRAINT "FK_f224925d2e2d1811a75d09bef70" FOREIGN KEY (card_id) REFERENCES public.card(id) ON DELETE CASCADE;


--
-- Name: price_history fk_card_history; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.price_history
    ADD CONSTRAINT fk_card_history FOREIGN KEY (card_id) REFERENCES public.card(id) ON DELETE CASCADE;


--
-- Name: set_price_history; Type: TABLE; Schema: public
--

CREATE TABLE public.set_price_history (
    id integer NOT NULL GENERATED ALWAYS AS IDENTITY,
    set_code varchar NOT NULL,
    base_price numeric,
    total_price numeric,
    base_price_all numeric,
    total_price_all numeric,
    date date NOT NULL
);



--
-- Name: set_price_history set_price_history_pkey; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.set_price_history
    ADD CONSTRAINT set_price_history_pkey PRIMARY KEY (id);


--
-- Name: set_price_history uq_set_price_history_set_code_date; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.set_price_history
    ADD CONSTRAINT uq_set_price_history_set_code_date UNIQUE (set_code, date);


--
-- Name: set_price_history fk_set_price_history_set; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.set_price_history
    ADD CONSTRAINT fk_set_price_history_set FOREIGN KEY (set_code)
        REFERENCES public."set"(code) ON DELETE CASCADE;


--
-- Name: password_reset; Type: TABLE; Schema: public
--

CREATE TABLE public.password_reset (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    reset_token character varying(255) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);



--
-- Name: password_reset_id_seq; Type: SEQUENCE; Schema: public
--

CREATE SEQUENCE public.password_reset_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: password_reset_id_seq; Type: SEQUENCE OWNED BY; Schema: public
--

ALTER SEQUENCE public.password_reset_id_seq OWNED BY public.password_reset.id;


--
-- Name: password_reset id; Type: DEFAULT; Schema: public
--

ALTER TABLE ONLY public.password_reset ALTER COLUMN id SET DEFAULT nextval('public.password_reset_id_seq'::regclass);


--
-- Name: password_reset password_reset_pkey; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.password_reset
    ADD CONSTRAINT password_reset_pkey PRIMARY KEY (id);


--
-- Name: password_reset UQ_password_reset_token; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.password_reset
    ADD CONSTRAINT "UQ_password_reset_token" UNIQUE (reset_token);


--
-- Name: idx_password_reset_token; Type: INDEX; Schema: public
--

CREATE INDEX idx_password_reset_token ON public.password_reset(reset_token);


--
-- Name: idx_password_reset_expires; Type: INDEX; Schema: public
--

CREATE INDEX idx_password_reset_expires ON public.password_reset(expires_at);


--
-- Name: transaction; Type: TABLE; Schema: public
--

CREATE TABLE public."transaction" (
    id integer NOT NULL,
    user_id integer NOT NULL,
    card_id character varying NOT NULL,
    type character varying NOT NULL,
    quantity integer NOT NULL,
    price_per_unit numeric(10,2) NOT NULL,
    is_foil boolean NOT NULL,
    date date DEFAULT CURRENT_DATE NOT NULL,
    source character varying,
    fees numeric(10,2),
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);



--
-- Name: transaction_id_seq; Type: SEQUENCE; Schema: public
--

CREATE SEQUENCE public.transaction_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: transaction_id_seq; Type: SEQUENCE OWNED BY; Schema: public
--

ALTER SEQUENCE public.transaction_id_seq OWNED BY public."transaction".id;


--
-- Name: transaction id; Type: DEFAULT; Schema: public
--

ALTER TABLE ONLY public."transaction" ALTER COLUMN id SET DEFAULT nextval('public.transaction_id_seq'::regclass);


--
-- Name: transaction transaction_pkey; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public."transaction"
    ADD CONSTRAINT transaction_pkey PRIMARY KEY (id);


--
-- Name: transaction CHK_transaction_type; Type: CHECK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public."transaction"
    ADD CONSTRAINT "CHK_transaction_type" CHECK (type IN ('BUY', 'SELL'));


--
-- Name: transaction CHK_transaction_quantity; Type: CHECK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public."transaction"
    ADD CONSTRAINT "CHK_transaction_quantity" CHECK (quantity > 0);


--
-- Name: transaction FK_transaction_user; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public."transaction"
    ADD CONSTRAINT "FK_transaction_user" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: transaction FK_transaction_card; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public."transaction"
    ADD CONSTRAINT "FK_transaction_card" FOREIGN KEY (card_id) REFERENCES public.card(id) ON DELETE CASCADE;


--
-- Name: idx_transaction_unique; Type: INDEX; Schema: public
--

CREATE UNIQUE INDEX idx_transaction_unique ON public."transaction" (user_id, card_id, is_foil, type, date, price_per_unit);


--
-- Name: idx_transaction_fifo; Type: INDEX; Schema: public
--

CREATE INDEX idx_transaction_fifo ON public."transaction" (user_id, card_id, is_foil, date);


--
-- Name: idx_transaction_user_date; Type: INDEX; Schema: public
--

CREATE INDEX idx_transaction_user_date ON public."transaction" (user_id, date);


--
-- Name: portfolio_value_history; Type: TABLE; Schema: public
--

CREATE TABLE public.portfolio_value_history (
    id integer NOT NULL GENERATED ALWAYS AS IDENTITY,
    user_id integer NOT NULL,
    total_value numeric(12,2) NOT NULL,
    total_cost numeric(12,2),
    total_cards integer NOT NULL,
    date date NOT NULL,
    CONSTRAINT portfolio_value_history_pkey PRIMARY KEY (id),
    CONSTRAINT uq_portfolio_value_history_user_date UNIQUE (user_id, date),
    CONSTRAINT fk_portfolio_value_history_user FOREIGN KEY (user_id)
        REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE INDEX idx_portfolio_value_history_user_date
    ON public.portfolio_value_history (user_id, date);


--
-- Name: portfolio_summary; Type: TABLE; Schema: public
--

CREATE TABLE public.portfolio_summary (
    user_id integer NOT NULL,
    total_value numeric(12,2) NOT NULL,
    total_cost numeric(12,2),
    total_realized_gain numeric(12,2),
    total_cards integer NOT NULL,
    total_quantity integer NOT NULL,
    computed_at timestamptz NOT NULL DEFAULT NOW(),
    refreshes_today integer NOT NULL DEFAULT 0,
    last_refresh_date date NOT NULL DEFAULT CURRENT_DATE,
    computation_method varchar(10) NOT NULL DEFAULT 'average',
    CONSTRAINT portfolio_summary_pkey PRIMARY KEY (user_id),
    CONSTRAINT fk_portfolio_summary_user FOREIGN KEY (user_id)
        REFERENCES public.users(id) ON DELETE CASCADE
);


--
-- Name: portfolio_card_performance; Type: TABLE; Schema: public
--

CREATE TABLE public.portfolio_card_performance (
    id integer NOT NULL GENERATED ALWAYS AS IDENTITY,
    user_id integer NOT NULL,
    card_id varchar NOT NULL,
    is_foil boolean NOT NULL,
    quantity integer NOT NULL,
    total_cost numeric(10,2) NOT NULL,
    average_cost numeric(10,2) NOT NULL,
    current_value numeric(10,2) NOT NULL,
    unrealized_gain numeric(10,2) NOT NULL,
    realized_gain numeric(10,2) NOT NULL,
    roi_percent numeric(8,2),
    computed_at timestamptz NOT NULL DEFAULT NOW(),
    CONSTRAINT portfolio_card_performance_pkey PRIMARY KEY (id),
    CONSTRAINT uq_portfolio_card_performance UNIQUE (user_id, card_id, is_foil),
    CONSTRAINT fk_portfolio_card_performance_user FOREIGN KEY (user_id)
        REFERENCES public.users(id) ON DELETE CASCADE,
    CONSTRAINT fk_portfolio_card_performance_card FOREIGN KEY (card_id)
        REFERENCES public.card(id) ON DELETE CASCADE
);

CREATE INDEX idx_portfolio_card_performance_user
    ON public.portfolio_card_performance (user_id);

CREATE INDEX idx_portfolio_card_performance_gain
    ON public.portfolio_card_performance (user_id, (unrealized_gain + realized_gain) DESC);


--
-- Name: price_alert; Type: TABLE; Schema: public
--

CREATE TABLE public.price_alert (
    id integer NOT NULL GENERATED ALWAYS AS IDENTITY,
    user_id integer NOT NULL,
    card_id character varying NOT NULL,
    increase_pct numeric(5,2),
    decrease_pct numeric(5,2),
    is_active boolean NOT NULL DEFAULT true,
    last_notified_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT NOW(),
    updated_at timestamp with time zone NOT NULL DEFAULT NOW(),
    CONSTRAINT price_alert_pkey PRIMARY KEY (id),
    CONSTRAINT uq_price_alert_user_card UNIQUE (user_id, card_id),
    CONSTRAINT fk_price_alert_user FOREIGN KEY (user_id)
        REFERENCES public.users(id) ON DELETE CASCADE,
    CONSTRAINT fk_price_alert_card FOREIGN KEY (card_id)
        REFERENCES public.card(id) ON DELETE CASCADE,
    CONSTRAINT chk_price_alert_threshold CHECK (increase_pct IS NOT NULL OR decrease_pct IS NOT NULL)
);

CREATE INDEX idx_price_alert_user_id ON public.price_alert (user_id);
CREATE INDEX idx_price_alert_card_id ON public.price_alert (card_id);
CREATE INDEX idx_price_alert_active ON public.price_alert (is_active) WHERE is_active = true;


--
-- Name: price_notification; Type: TABLE; Schema: public
--

CREATE TABLE public.price_notification (
    id integer NOT NULL GENERATED ALWAYS AS IDENTITY,
    user_id integer NOT NULL,
    card_id character varying NOT NULL,
    alert_id integer,
    direction character varying(8) NOT NULL CHECK (direction IN ('increase', 'decrease')),
    old_price numeric(10,2) NOT NULL,
    new_price numeric(10,2) NOT NULL,
    change_pct numeric(5,2) NOT NULL,
    is_read boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT NOW(),
    CONSTRAINT price_notification_pkey PRIMARY KEY (id),
    CONSTRAINT fk_price_notification_user FOREIGN KEY (user_id)
        REFERENCES public.users(id) ON DELETE CASCADE,
    CONSTRAINT fk_price_notification_card FOREIGN KEY (card_id)
        REFERENCES public.card(id) ON DELETE CASCADE,
    CONSTRAINT fk_price_notification_alert FOREIGN KEY (alert_id)
        REFERENCES public.price_alert(id) ON DELETE SET NULL
);

CREATE INDEX idx_price_notification_user_id ON public.price_notification (user_id);
CREATE INDEX idx_price_notification_created_at ON public.price_notification (user_id, created_at DESC);
CREATE INDEX idx_price_notification_unread ON public.price_notification (user_id, is_read) WHERE is_read = false;


--
-- Name: sealed_product; Type: TABLE; Schema: public
--

CREATE TABLE public.sealed_product (
    uuid character varying NOT NULL,
    name character varying NOT NULL,
    set_code character varying NOT NULL,
    category character varying,
    subtype character varying,
    card_count integer,
    product_size integer,
    release_date date,
    contents_summary text,
    tcgplayer_product_id character varying,
    CONSTRAINT sealed_product_pkey PRIMARY KEY (uuid),
    CONSTRAINT fk_sealed_product_set FOREIGN KEY (set_code)
        REFERENCES public.set(code) ON DELETE CASCADE
);

CREATE INDEX idx_sealed_product_set_code ON public.sealed_product (set_code);
CREATE INDEX idx_sealed_product_category ON public.sealed_product (category);


--
-- Name: sealed_product_price; Type: TABLE; Schema: public
--

CREATE TABLE public.sealed_product_price (
    sealed_product_uuid character varying NOT NULL,
    price numeric,
    price_change_weekly numeric,
    date date NOT NULL,
    CONSTRAINT sealed_product_price_pkey PRIMARY KEY (sealed_product_uuid),
    CONSTRAINT fk_sealed_product_price FOREIGN KEY (sealed_product_uuid)
        REFERENCES public.sealed_product(uuid) ON DELETE CASCADE
);


--
-- Name: sealed_product_price_history; Type: TABLE; Schema: public
--

CREATE TABLE public.sealed_product_price_history (
    id integer NOT NULL GENERATED ALWAYS AS IDENTITY,
    sealed_product_uuid character varying NOT NULL,
    price numeric,
    date date NOT NULL,
    CONSTRAINT sealed_product_price_history_pkey PRIMARY KEY (id),
    CONSTRAINT uq_sealed_product_price_history UNIQUE (sealed_product_uuid, date),
    CONSTRAINT fk_sealed_product_price_history FOREIGN KEY (sealed_product_uuid)
        REFERENCES public.sealed_product(uuid) ON DELETE CASCADE
);


--
-- Name: sealed_product_inventory; Type: TABLE; Schema: public
--

CREATE TABLE public.sealed_product_inventory (
    sealed_product_uuid character varying NOT NULL,
    user_id integer NOT NULL,
    quantity integer NOT NULL DEFAULT 1,
    CONSTRAINT sealed_product_inventory_pkey PRIMARY KEY (sealed_product_uuid, user_id),
    CONSTRAINT fk_sealed_product_inventory_product FOREIGN KEY (sealed_product_uuid)
        REFERENCES public.sealed_product(uuid) ON DELETE CASCADE,
    CONSTRAINT fk_sealed_product_inventory_user FOREIGN KEY (user_id)
        REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sealed_product_inventory_user ON public.sealed_product_inventory (user_id);


--
-- PostgreSQL database dump complete
--

