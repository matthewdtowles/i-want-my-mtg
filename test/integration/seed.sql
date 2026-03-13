-- Seed data for integration tests
-- Runs after init schema + migrations

-- Test set
INSERT INTO "set" (code, base_size, total_size, block, keyrune_code, name, parent_code, release_date, type, is_main)
VALUES ('TST', 3, 3, NULL, 'tst', 'Test Set', NULL, '2024-01-01', 'expansion', true)
ON CONFLICT (code) DO NOTHING;

-- Test cards in the set
INSERT INTO card (id, artist, has_foil, has_non_foil, img_src, is_reserved, mana_cost, name, number, oracle_text, rarity, set_code, type, layout, is_alternative, sort_number, in_main)
VALUES
    ('test-card-001', 'Test Artist', true, true, 'https://example.com/card1.jpg', false, '{2}{W}', 'Test Angel', '1', 'Flying', 'rare', 'TST', 'Creature — Angel', 'normal', false, '001', true),
    ('test-card-002', 'Test Artist', true, true, 'https://example.com/card2.jpg', false, '{1}{U}', 'Test Sphinx', '2', 'Draw a card.', 'uncommon', 'TST', 'Creature — Sphinx', 'normal', false, '002', true),
    ('test-card-003', 'Test Artist', false, true, 'https://example.com/card3.jpg', false, '{B}', 'Test Zombie', '3', 'Deathtouch', 'common', 'TST', 'Creature — Zombie', 'normal', false, '003', true)
ON CONFLICT (id) DO NOTHING;

-- Prices for test cards
INSERT INTO price (card_id, normal, foil, date)
VALUES
    ('test-card-001', 5.00, 10.00, CURRENT_DATE),
    ('test-card-002', 1.50, 3.00, CURRENT_DATE),
    ('test-card-003', 0.25, NULL, CURRENT_DATE)
ON CONFLICT (card_id, date) DO NOTHING;

-- Price history for test card
INSERT INTO price_history (card_id, normal, foil, date)
VALUES
    ('test-card-001', 4.50, 9.00, CURRENT_DATE - INTERVAL '7 days'),
    ('test-card-001', 4.75, 9.50, CURRENT_DATE - INTERVAL '3 days'),
    ('test-card-001', 5.00, 10.00, CURRENT_DATE)
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

-- Legality entries (required FK for some queries)
INSERT INTO legality (card_id, format, status)
VALUES
    ('test-card-001', 'standard', 'legal'),
    ('test-card-002', 'standard', 'legal'),
    ('test-card-003', 'standard', 'legal')
ON CONFLICT (card_id, format) DO NOTHING;
