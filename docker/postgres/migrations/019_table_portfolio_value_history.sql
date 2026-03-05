--
-- Name: portfolio_value_history; Type: TABLE; Schema: public
--

CREATE TABLE IF NOT EXISTS public.portfolio_value_history (
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

CREATE INDEX IF NOT EXISTS idx_portfolio_value_history_user_date
    ON public.portfolio_value_history (user_id, date);
