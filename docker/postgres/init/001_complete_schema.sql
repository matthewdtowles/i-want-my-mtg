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
-- Name: card_rarity_enum; Type: TYPE; Schema: public; Owner: matthewtowles
--

CREATE TYPE public.card_rarity_enum AS ENUM (
    'common',
    'uncommon',
    'rare',
    'mythic',
    'bonus',
    'special'
);


ALTER TYPE public.card_rarity_enum OWNER TO matthewtowles;

--
-- Name: format_enum; Type: TYPE; Schema: public; Owner: matthewtowles
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


ALTER TYPE public.format_enum OWNER TO matthewtowles;

--
-- Name: legality_status_enum; Type: TYPE; Schema: public; Owner: matthewtowles
--

CREATE TYPE public.legality_status_enum AS ENUM (
    'legal',
    'banned',
    'restricted'
);


ALTER TYPE public.legality_status_enum OWNER TO matthewtowles;

--
-- Name: status_enum; Type: TYPE; Schema: public; Owner: matthewtowles
--

CREATE TYPE public.status_enum AS ENUM (
    'legal',
    'banned',
    'restricted'
);


ALTER TYPE public.status_enum OWNER TO matthewtowles;

--
-- Name: user_role_enum; Type: TYPE; Schema: public; Owner: matthewtowles
--

CREATE TYPE public.user_role_enum AS ENUM (
    'admin',
    'user'
);


ALTER TYPE public.user_role_enum OWNER TO matthewtowles;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: card; Type: TABLE; Schema: public; Owner: matthewtowles
--

CREATE TABLE public.card (
    id character varying NOT NULL,
    artist character varying,
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
    type character varying NOT NULL
);


ALTER TABLE public.card OWNER TO matthewtowles;

--
-- Name: card_order_seq; Type: SEQUENCE; Schema: public; Owner: matthewtowles
--

CREATE SEQUENCE public.card_order_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.card_order_seq OWNER TO matthewtowles;

--
-- Name: card_order_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: matthewtowles
--

ALTER SEQUENCE public.card_order_seq OWNED BY public.card."order";


--
-- Name: inventory; Type: TABLE; Schema: public; Owner: matthewtowles
--

CREATE TABLE public.inventory (
    card_id character varying NOT NULL,
    user_id integer NOT NULL,
    foil boolean NOT NULL,
    quantity integer DEFAULT 1 NOT NULL
);


ALTER TABLE public.inventory OWNER TO matthewtowles;

--
-- Name: legality; Type: TABLE; Schema: public; Owner: matthewtowles
--

CREATE TABLE public.legality (
    format public.format_enum NOT NULL,
    status public.legality_status_enum NOT NULL,
    card_id character varying NOT NULL
);


ALTER TABLE public.legality OWNER TO matthewtowles;

--
-- Name: price; Type: TABLE; Schema: public; Owner: matthewtowles
--

CREATE TABLE public.price (
    id integer NOT NULL,
    foil numeric,
    normal numeric,
    date date NOT NULL,
    card_id character varying
);


ALTER TABLE public.price OWNER TO matthewtowles;

--
-- Name: price_history; Type: TABLE; Schema: public; Owner: matthewtowles
--

CREATE TABLE public.price_history (
    id integer NOT NULL,
    foil numeric,
    normal numeric,
    date date NOT NULL,
    card_id character varying
);


ALTER TABLE public.price_history OWNER TO matthewtowles;

--
-- Name: price_history_id_seq; Type: SEQUENCE; Schema: public; Owner: matthewtowles
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
-- Name: price_id_seq; Type: SEQUENCE; Schema: public; Owner: matthewtowles
--

CREATE SEQUENCE public.price_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.price_id_seq OWNER TO matthewtowles;

--
-- Name: price_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: matthewtowles
--

ALTER SEQUENCE public.price_id_seq OWNED BY public.price.id;


--
-- Name: set; Type: TABLE; Schema: public; Owner: matthewtowles
--

CREATE TABLE public.set (
    code character varying NOT NULL,
    base_size integer NOT NULL,
    block character varying,
    keyrune_code character varying NOT NULL,
    name character varying NOT NULL,
    parent_code character varying,
    release_date date NOT NULL,
    type character varying NOT NULL
);


ALTER TABLE public.set OWNER TO matthewtowles;

--
-- Name: users; Type: TABLE; Schema: public; Owner: matthewtowles
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email character varying NOT NULL,
    name character varying NOT NULL,
    password character varying NOT NULL,
    role public.user_role_enum DEFAULT 'user'::public.user_role_enum NOT NULL
);


ALTER TABLE public.users OWNER TO matthewtowles;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: matthewtowles
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.users_id_seq OWNER TO matthewtowles;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: matthewtowles
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: card order; Type: DEFAULT; Schema: public; Owner: matthewtowles
--

ALTER TABLE ONLY public.card ALTER COLUMN "order" SET DEFAULT nextval('public.card_order_seq'::regclass);


--
-- Name: price id; Type: DEFAULT; Schema: public; Owner: matthewtowles
--

ALTER TABLE ONLY public.price ALTER COLUMN id SET DEFAULT nextval('public.price_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: matthewtowles
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: legality PK_5d47fb12ee9f5adc5bb8e36a842; Type: CONSTRAINT; Schema: public; Owner: matthewtowles
--

ALTER TABLE ONLY public.legality
    ADD CONSTRAINT "PK_5d47fb12ee9f5adc5bb8e36a842" PRIMARY KEY (card_id, format);


--
-- Name: inventory PK_83dd749dbfec0574295a68f3e0f; Type: CONSTRAINT; Schema: public; Owner: matthewtowles
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT "PK_83dd749dbfec0574295a68f3e0f" PRIMARY KEY (card_id, user_id, foil);


--
-- Name: card PK_9451069b6f1199730791a7f4ae4; Type: CONSTRAINT; Schema: public; Owner: matthewtowles
--

ALTER TABLE ONLY public.card
    ADD CONSTRAINT "PK_9451069b6f1199730791a7f4ae4" PRIMARY KEY (id);


--
-- Name: users PK_a3ffb1c0c8416b9fc6f907b7433; Type: CONSTRAINT; Schema: public; Owner: matthewtowles
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY (id);


--
-- Name: price PK_d163e55e8cce6908b2e0f27cea4; Type: CONSTRAINT; Schema: public; Owner: matthewtowles
--

ALTER TABLE ONLY public.price
    ADD CONSTRAINT "PK_d163e55e8cce6908b2e0f27cea4" PRIMARY KEY (id);


--
-- Name: set PK_e7149fddfa204f00c1113ac5b1b; Type: CONSTRAINT; Schema: public; Owner: matthewtowles
--

ALTER TABLE ONLY public.set
    ADD CONSTRAINT "PK_e7149fddfa204f00c1113ac5b1b" PRIMARY KEY (code);


--
-- Name: price UQ_182035bb64a5e455b91e9a4d24e; Type: CONSTRAINT; Schema: public; Owner: matthewtowles
--

ALTER TABLE ONLY public.price
    ADD CONSTRAINT "UQ_182035bb64a5e455b91e9a4d24e" UNIQUE (card_id, date);


--
-- Name: users UQ_97672ac88f789774dd47f7c8be3; Type: CONSTRAINT; Schema: public; Owner: matthewtowles
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE (email);


--
-- Name: price_history price_history_pkey; Type: CONSTRAINT; Schema: public; Owner: matthewtowles
--

ALTER TABLE ONLY public.price_history
    ADD CONSTRAINT price_history_pkey PRIMARY KEY (id);


--
-- Name: price_history uq_card_date_history; Type: CONSTRAINT; Schema: public; Owner: matthewtowles
--

ALTER TABLE ONLY public.price_history
    ADD CONSTRAINT uq_card_date_history UNIQUE (card_id, date);


--
-- Name: inventory FK_Inventory_Card; Type: FK CONSTRAINT; Schema: public; Owner: matthewtowles
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT "FK_Inventory_Card" FOREIGN KEY (card_id) REFERENCES public.card(id) ON DELETE CASCADE;


--
-- Name: inventory FK_Inventory_User; Type: FK CONSTRAINT; Schema: public; Owner: matthewtowles
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT "FK_Inventory_User" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: price FK_b8288d2373b2e06555bfeca6139; Type: FK CONSTRAINT; Schema: public; Owner: matthewtowles
--

ALTER TABLE ONLY public.price
    ADD CONSTRAINT "FK_b8288d2373b2e06555bfeca6139" FOREIGN KEY (card_id) REFERENCES public.card(id) ON DELETE CASCADE;


--
-- Name: card FK_e53fc463a7a6cc91ddc4f3a6c58; Type: FK CONSTRAINT; Schema: public; Owner: matthewtowles
--

ALTER TABLE ONLY public.card
    ADD CONSTRAINT "FK_e53fc463a7a6cc91ddc4f3a6c58" FOREIGN KEY (set_code) REFERENCES public.set(code);


--
-- Name: legality FK_f224925d2e2d1811a75d09bef70; Type: FK CONSTRAINT; Schema: public; Owner: matthewtowles
--

ALTER TABLE ONLY public.legality
    ADD CONSTRAINT "FK_f224925d2e2d1811a75d09bef70" FOREIGN KEY (card_id) REFERENCES public.card(id) ON DELETE CASCADE;


--
-- Name: price_history fk_card_history; Type: FK CONSTRAINT; Schema: public; Owner: matthewtowles
--

ALTER TABLE ONLY public.price_history
    ADD CONSTRAINT fk_card_history FOREIGN KEY (card_id) REFERENCES public.card(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

