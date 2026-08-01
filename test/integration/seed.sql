-- Seed data for integration tests
-- Runs after init schema + migrations

-- Test set
INSERT INTO "set" (code, base_size, total_size, block, keyrune_code, name, parent_code, release_date, type, is_main)
VALUES ('tst', 4, 5, NULL, 'tst', 'Test Set', NULL, '2024-01-01', 'expansion', true)
ON CONFLICT (code) DO NOTHING;

-- Test cards in the set
-- scryfall_id (not img_src) drives the card image now (6.8b): the web derives
-- the path tail '{a}/{b}/{scryfall_id}.jpg' from it at read time.
INSERT INTO card (id, artist, has_foil, has_non_foil, scryfall_id, is_reserved, mana_cost, name, number, oracle_text, rarity, set_code, type, layout, is_alternative, sort_number, in_main)
VALUES
    ('00000000-0000-4000-a000-000000000001', 'Test Artist', true, true, '11111111-1111-4111-a111-111111111111', false, '{2}{W}', 'Test Angel', '1', 'Flying', 'rare', 'tst', 'Creature - Angel', 'normal', false, '001', true),
    ('00000000-0000-4000-a000-000000000002', 'Test Artist', true, true, '22222222-2222-4222-a222-222222222222', false, '{1}{U}', 'Test Sphinx', '2', 'Draw a card.', 'uncommon', 'tst', 'Creature - Sphinx', 'normal', false, '002', true),
    ('00000000-0000-4000-a000-000000000003', 'Test Artist', false, true, '33333333-3333-4333-a333-333333333333', false, '{B}', 'Test Zombie', '3', 'Deathtouch', 'common', 'tst', 'Creature - Zombie', 'normal', false, '003', true),
    ('00000000-0000-4000-a000-000000000004', 'Test Artist', true, true, '44444444-4444-4444-a444-444444444444', false, '{R}', 'Test Dragon', '4', 'Haste', 'mythic', 'tst', 'Creature - Dragon', 'normal', false, '004', true),
    -- An extended-art variant of the chase card: outside the main set
    -- (in_main = false) and priced above every main card. Set cover art must
    -- still pick the base Test Dragon over this one, so anything that orders
    -- covers by price alone fails here.
    --
    -- Its id ends in the collector number, not the next number in sequence.
    -- Suites create and drop their own throwaway cards at ...005 and ...006
    -- (freemium-gates.e2e-spec.ts), so a seeded row there gets deleted out from
    -- under the suites that run after it. Keep permanent seed rows clear of
    -- that range.
    ('00000000-0000-4000-a000-000000000305', 'Test Artist', true, true, '55555555-5555-4555-a555-555555555555', false, '{R}', 'Test Dragon', '305', 'Haste', 'mythic', 'tst', 'Creature - Dragon', 'normal', true, '305', false)
ON CONFLICT (id) DO NOTHING;

-- Prices for test cards
INSERT INTO price (card_id, normal, foil, date)
VALUES
    ('00000000-0000-4000-a000-000000000001', 5.00, 10.00, CURRENT_DATE),
    ('00000000-0000-4000-a000-000000000002', 1.50, 3.00, CURRENT_DATE),
    ('00000000-0000-4000-a000-000000000003', 0.25, NULL, CURRENT_DATE),
    ('00000000-0000-4000-a000-000000000004', 20.00, 40.00, CURRENT_DATE),
    ('00000000-0000-4000-a000-000000000305', 50.00, 90.00, CURRENT_DATE)
ON CONFLICT (card_id, date) DO NOTHING;

-- Current granular offers for test card 1: two buylist vendors (normal), one
-- foil buylist, and a retail row (must not show as buylist).
INSERT INTO granular_price (card_id, provider, price_type, finish, condition, date, price)
VALUES
    ('00000000-0000-4000-a000-000000000001', 'cardkingdom', 'buylist', 'normal', 'NM', CURRENT_DATE, 3.50),
    ('00000000-0000-4000-a000-000000000001', 'cardsphere', 'buylist', 'normal', 'NM', CURRENT_DATE, 3.25),
    ('00000000-0000-4000-a000-000000000001', 'cardkingdom', 'buylist', 'foil', 'NM', CURRENT_DATE, 7.00),
    ('00000000-0000-4000-a000-000000000001', 'tcgplayer', 'retail', 'normal', 'NM', CURRENT_DATE, 5.00)
ON CONFLICT (card_id, provider, price_type, finish, condition) DO NOTHING;

-- Price history for test card
INSERT INTO price_history (card_id, normal, foil, date)
VALUES
    ('00000000-0000-4000-a000-000000000001', 4.50, 9.00, CURRENT_DATE - INTERVAL '7 days'),
    ('00000000-0000-4000-a000-000000000001', 4.75, 9.50, CURRENT_DATE - INTERVAL '3 days'),
    ('00000000-0000-4000-a000-000000000001', 5.00, 10.00, CURRENT_DATE)
ON CONFLICT (card_id, date) DO NOTHING;

-- Set price
INSERT INTO set_price (set_code, base_price, total_price, base_price_all, total_price_all, date)
VALUES ('tst', 6.75, 6.75, 19.75, 19.75, CURRENT_DATE)
ON CONFLICT (set_code) DO NOTHING;

-- Set price history
INSERT INTO set_price_history (set_code, base_price, total_price, base_price_all, total_price_all, date)
VALUES
    ('tst', 6.00, 6.00, 18.00, 18.00, CURRENT_DATE - INTERVAL '7 days'),
    ('tst', 6.75, 6.75, 19.75, 19.75, CURRENT_DATE)
ON CONFLICT (set_code, date) DO NOTHING;

-- Test users (password for all three: TestPass1!)
-- bcrypt hash generated with 10 rounds.
--
-- ON CONFLICT DO UPDATE, not DO NOTHING: the seed must be able to *repair* a user a
-- previous run left mutated, not just create a missing one. test-integ.sh drops the
-- volume on entry so this normally hits an empty table, but a run against a reused
-- database would otherwise inherit whatever the last run wrote.
--
-- Credentials are still not a shared fixture: any suite that changes a password must
-- use pwchange@test.com, because the seed runs once per run and cannot undo a mutation
-- between suites. See the comment on that user below.
INSERT INTO users (email, name, password, role)
VALUES
    ('integ@test.com', 'IntegTestUser', '$2b$10$fNiH5A76rU5uJun2HwtdX.buge2hb2urV/cZJpOfHRz1oamXu77la', 'user'),
    ('mutation@test.com', 'MutationTestUser', '$2b$10$fNiH5A76rU5uJun2HwtdX.buge2hb2urV/cZJpOfHRz1oamXu77la', 'user'),
    ('pwchange@test.com', 'PasswordChangeTestUser', '$2b$10$fNiH5A76rU5uJun2HwtdX.buge2hb2urV/cZJpOfHRz1oamXu77la', 'user')
ON CONFLICT (email) DO UPDATE
    SET password = EXCLUDED.password,
        name = EXCLUDED.name,
        role = EXCLUDED.role;

-- integ@test.com     — read-mostly user shared by most suites (setup.ts TEST_USER).
-- mutation@test.com  — non-credential mutations (profile name, subscription rows).
-- pwchange@test.com  — owned solely by api-user's password test. Nothing else may log
--                      in as it: the seed runs once per run, so a password rewritten
--                      mid-run stays rewritten for every later suite, and Jest's file
--                      order decides who runs later. That is what broke
--                      freemium-gates with 14 × 401 (issue #620).

-- Legality entries (required FK for some queries)
INSERT INTO legality (card_id, format, status)
VALUES
    ('00000000-0000-4000-a000-000000000001', 'standard', 'legal'),
    ('00000000-0000-4000-a000-000000000002', 'standard', 'legal'),
    ('00000000-0000-4000-a000-000000000003', 'standard', 'legal'),
    ('00000000-0000-4000-a000-000000000004', 'standard', 'legal')
ON CONFLICT (card_id, format) DO NOTHING;
