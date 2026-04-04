-- Seed data for integration tests
-- Runs after init schema + migrations

-- Test set
INSERT INTO "set" (code, base_size, total_size, block, keyrune_code, name, parent_code, release_date, type, is_main)
VALUES ('TST', 4, 4, NULL, 'tst', 'Test Set', NULL, '2024-01-01', 'expansion', true)
ON CONFLICT (code) DO NOTHING;

-- Test cards in the set
INSERT INTO card (id, artist, has_foil, has_non_foil, img_src, is_reserved, mana_cost, name, number, oracle_text, rarity, set_code, type, layout, is_alternative, sort_number, in_main)
VALUES
    ('00000000-0000-4000-a000-000000000001', 'Test Artist', true, true, 'https://example.com/card1.jpg', false, '{2}{W}', 'Test Angel', '1', 'Flying', 'rare', 'TST', 'Creature - Angel', 'normal', false, '001', true),
    ('00000000-0000-4000-a000-000000000002', 'Test Artist', true, true, 'https://example.com/card2.jpg', false, '{1}{U}', 'Test Sphinx', '2', 'Draw a card.', 'uncommon', 'TST', 'Creature - Sphinx', 'normal', false, '002', true),
    ('00000000-0000-4000-a000-000000000003', 'Test Artist', false, true, 'https://example.com/card3.jpg', false, '{B}', 'Test Zombie', '3', 'Deathtouch', 'common', 'TST', 'Creature - Zombie', 'normal', false, '003', true),
    ('00000000-0000-4000-a000-000000000004', 'Test Artist', true, true, 'https://example.com/card4.jpg', false, '{R}', 'Test Dragon', '4', 'Haste', 'mythic', 'TST', 'Creature - Dragon', 'normal', false, '004', true)
ON CONFLICT (id) DO NOTHING;

-- Prices for test cards
INSERT INTO price (card_id, normal, foil, date)
VALUES
    ('00000000-0000-4000-a000-000000000001', 5.00, 10.00, CURRENT_DATE),
    ('00000000-0000-4000-a000-000000000002', 1.50, 3.00, CURRENT_DATE),
    ('00000000-0000-4000-a000-000000000003', 0.25, NULL, CURRENT_DATE),
    ('00000000-0000-4000-a000-000000000004', 20.00, 40.00, CURRENT_DATE)
ON CONFLICT (card_id, date) DO NOTHING;

-- Price history for test card
INSERT INTO price_history (card_id, normal, foil, date)
VALUES
    ('00000000-0000-4000-a000-000000000001', 4.50, 9.00, CURRENT_DATE - INTERVAL '7 days'),
    ('00000000-0000-4000-a000-000000000001', 4.75, 9.50, CURRENT_DATE - INTERVAL '3 days'),
    ('00000000-0000-4000-a000-000000000001', 5.00, 10.00, CURRENT_DATE)
ON CONFLICT (card_id, date) DO NOTHING;

-- Set price
INSERT INTO set_price (set_code, base_price, total_price, base_price_all, total_price_all, date)
VALUES ('TST', 6.75, 6.75, 19.75, 19.75, CURRENT_DATE)
ON CONFLICT (set_code) DO NOTHING;

-- Set price history
INSERT INTO set_price_history (set_code, base_price, total_price, base_price_all, total_price_all, date)
VALUES
    ('TST', 6.00, 6.00, 18.00, 18.00, CURRENT_DATE - INTERVAL '7 days'),
    ('TST', 6.75, 6.75, 19.75, 19.75, CURRENT_DATE)
ON CONFLICT (set_code, date) DO NOTHING;

-- Test user (password: TestPass1!)
-- bcrypt hash generated with 10 rounds
INSERT INTO users (email, name, password, role)
VALUES ('integ@test.com', 'IntegTestUser', '$2b$10$fNiH5A76rU5uJun2HwtdX.buge2hb2urV/cZJpOfHRz1oamXu77la', 'user')
ON CONFLICT (email) DO NOTHING;

-- Disposable test user for mutation tests (password: TestPass1!)
-- Same bcrypt hash; this user can be freely modified/deleted without affecting other suites
INSERT INTO users (email, name, password, role)
VALUES ('mutation@test.com', 'MutationTestUser', '$2b$10$fNiH5A76rU5uJun2HwtdX.buge2hb2urV/cZJpOfHRz1oamXu77la', 'user')
ON CONFLICT (email) DO NOTHING;

-- Legality entries (required FK for some queries)
INSERT INTO legality (card_id, format, status)
VALUES
    ('00000000-0000-4000-a000-000000000001', 'standard', 'legal'),
    ('00000000-0000-4000-a000-000000000002', 'standard', 'legal'),
    ('00000000-0000-4000-a000-000000000003', 'standard', 'legal'),
    ('00000000-0000-4000-a000-000000000004', 'standard', 'legal')
ON CONFLICT (card_id, format) DO NOTHING;
