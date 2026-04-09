BEGIN;

--
-- sealed_product: core table for sealed products (booster boxes, bundles, etc.)
--
CREATE TABLE IF NOT EXISTS public.sealed_product (
    uuid CHARACTER VARYING NOT NULL PRIMARY KEY,
    name CHARACTER VARYING NOT NULL,
    set_code CHARACTER VARYING NOT NULL REFERENCES public.set(code) ON DELETE CASCADE,
    category CHARACTER VARYING,
    subtype CHARACTER VARYING,
    card_count INTEGER,
    product_size INTEGER,
    release_date DATE,
    contents_summary TEXT,
    purchase_url_tcgplayer CHARACTER VARYING
);

CREATE INDEX IF NOT EXISTS idx_sealed_product_set_code ON sealed_product (set_code);
CREATE INDEX IF NOT EXISTS idx_sealed_product_category ON sealed_product (category);

--
-- sealed_product_price: current price for each sealed product
--
CREATE TABLE IF NOT EXISTS public.sealed_product_price (
    sealed_product_uuid CHARACTER VARYING NOT NULL PRIMARY KEY
        REFERENCES public.sealed_product(uuid) ON DELETE CASCADE,
    price NUMERIC,
    price_change_weekly NUMERIC,
    date DATE NOT NULL
);

--
-- sealed_product_price_history: daily price snapshots
--
CREATE TABLE IF NOT EXISTS public.sealed_product_price_history (
    id INTEGER NOT NULL GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    sealed_product_uuid CHARACTER VARYING NOT NULL
        REFERENCES public.sealed_product(uuid) ON DELETE CASCADE,
    price NUMERIC,
    date DATE NOT NULL,
    UNIQUE (sealed_product_uuid, date)
);

--
-- sealed_product_inventory: user inventory of sealed products
--
CREATE TABLE IF NOT EXISTS public.sealed_product_inventory (
    sealed_product_uuid CHARACTER VARYING NOT NULL
        REFERENCES public.sealed_product(uuid) ON DELETE CASCADE,
    user_id INTEGER NOT NULL
        REFERENCES public.users(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (sealed_product_uuid, user_id)
);

CREATE INDEX IF NOT EXISTS idx_sealed_product_inventory_user ON sealed_product_inventory (user_id);

COMMIT;
