-- W9 (#577, cross-repo X1): ON DELETE CASCADE for the card FKs on
-- price_history, inventory, price and legality, so scry's card-prune paths
-- (scry S2, scry#36) can delete from `card` alone and rely on the database to
-- remove dependents.
--
-- Why these four tables: they predate the numbered migration set, so
-- production carries whatever delete rule they were originally created with,
-- while docker/postgres/init/001_complete_schema.sql — the fresh-install
-- schema — already declares ON DELETE CASCADE for all four. This migration
-- normalizes production to the documented state; on a fresh database it finds
-- the rule already CASCADE and does nothing. #577 names price_history and
-- inventory (the dependents scry's delete paths miss today); price and
-- legality are included because scry S2 will stop deleting them explicitly and
-- rely on the cascade, and their production delete rule has the same
-- pre-migration-era provenance — if it drifted too, S2 would trade one FK
-- violation for another. Every later card dependent (granular_price,
-- transaction, price_alert, price_notification, buy_list, deck_card,
-- published_deck_card, portfolio_card_performance) already cascades via its
-- creating migration.
--
-- card.set_code -> set(code) deliberately keeps NO ACTION: scry's set-delete
-- path removes the set's cards before the set row, and a cascade there would
-- chain a set delete into user data through the card cascades.
--
-- granular_price_history, named in #577, was dropped in 042 (§10.10) and is
-- deliberately not handled here.
--
-- inventory decision (#577 asked for this to be explicit): CASCADE. A card
-- prune deletes the owning users' inventory rows. Rationale: every read of an
-- inventory row joins card, so a row whose card is gone is unreadable dead
-- weight; and the user-data tables that shipped later (transaction 018,
-- price_alert 025, buy_list 039, deck_card 041) already cascade on card
-- delete in production — RESTRICT here would only block the prune for some
-- dependents while others cascade, leaving partial deletes.
--
-- Idempotent + replayable (the untracked migration set reruns on every
-- deploy): FKs are matched by referencing/referenced table, not by name (the
-- constraint names in production may predate the init dump's), and are only
-- touched when the delete rule is not already CASCADE.
--
-- Lock hygiene: the re-add uses NOT VALID so the ACCESS EXCLUSIVE lock on
-- price_history (the large table) is held only for the catalog change, not for
-- a full validation scan. VALIDATE CONSTRAINT then runs as a separate
-- statement under the weaker SHARE UPDATE EXCLUSIVE lock; it cannot fail,
-- since every row was already enforced by the constraint being replaced.

DO $$
DECLARE
    fk RECORD;
BEGIN
    FOR fk IN
        SELECT con.conname, rel.relname AS table_name
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        WHERE nsp.nspname = 'public'
          AND rel.relname IN ('price_history', 'inventory', 'price', 'legality')
          AND con.contype = 'f'
          AND con.confrelid = 'public.card'::regclass
          AND con.confdeltype <> 'c'
    LOOP
        EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', fk.table_name, fk.conname);
        EXECUTE format(
            'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (card_id) '
                || 'REFERENCES public.card(id) ON DELETE CASCADE NOT VALID',
            fk.table_name,
            fk.conname
        );
    END LOOP;
END $$;

DO $$
DECLARE
    fk RECORD;
BEGIN
    FOR fk IN
        SELECT con.conname, rel.relname AS table_name
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        WHERE nsp.nspname = 'public'
          AND rel.relname IN ('price_history', 'inventory', 'price', 'legality')
          AND con.contype = 'f'
          AND con.confrelid = 'public.card'::regclass
          AND NOT con.convalidated
    LOOP
        EXECUTE format(
            'ALTER TABLE public.%I VALIDATE CONSTRAINT %I',
            fk.table_name,
            fk.conname
        );
    END LOOP;
END $$;
