--
-- Name: portfolio_summary; Type: TABLE; Schema: public
--

CREATE TABLE IF NOT EXISTS public.portfolio_summary (
    user_id integer NOT NULL,
    total_value numeric(12,2) NOT NULL,
    total_cost numeric(12,2),
    total_realized_gain numeric(12,2),
    total_cards integer NOT NULL,
    total_quantity integer NOT NULL,
    computed_at timestamptz NOT NULL DEFAULT NOW(),
    refreshes_today integer NOT NULL DEFAULT 0,
    last_refresh_date date NOT NULL DEFAULT CURRENT_DATE,
    CONSTRAINT portfolio_summary_pkey PRIMARY KEY (user_id),
    CONSTRAINT fk_portfolio_summary_user FOREIGN KEY (user_id)
        REFERENCES public.users(id) ON DELETE CASCADE
);


--
-- Name: portfolio_card_performance; Type: TABLE; Schema: public
--

CREATE TABLE IF NOT EXISTS public.portfolio_card_performance (
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

CREATE INDEX IF NOT EXISTS idx_portfolio_card_performance_user
    ON public.portfolio_card_performance (user_id);
