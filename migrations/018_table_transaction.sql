-- Create transaction table for tracking card buy/sell transactions
CREATE TABLE IF NOT EXISTS public."transaction" (
    id serial PRIMARY KEY,
    user_id integer NOT NULL,
    card_id character varying NOT NULL,
    type character varying NOT NULL,
    quantity integer NOT NULL,
    price_per_unit numeric(10,2) NOT NULL,
    is_foil boolean NOT NULL,
    date date NOT NULL DEFAULT CURRENT_DATE,
    source character varying,
    fees numeric(10,2),
    notes text,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    CONSTRAINT FK_transaction_user FOREIGN KEY (user_id) REFERENCES public."users"(id) ON DELETE CASCADE,
    CONSTRAINT FK_transaction_card FOREIGN KEY (card_id) REFERENCES public."card"(id) ON DELETE CASCADE,
    CONSTRAINT CHK_transaction_type CHECK (type IN ('BUY', 'SELL')),
    CONSTRAINT CHK_transaction_quantity CHECK (quantity > 0)
);

-- Prevent exact duplicate entries
CREATE UNIQUE INDEX IF NOT EXISTS idx_transaction_unique
    ON public."transaction" (user_id, card_id, is_foil, type, date, price_per_unit);

-- For FIFO lot matching queries
CREATE INDEX IF NOT EXISTS idx_transaction_fifo
    ON public."transaction" (user_id, card_id, is_foil, date);

-- For portfolio-level queries
CREATE INDEX IF NOT EXISTS idx_transaction_user_date
    ON public."transaction" (user_id, date);
