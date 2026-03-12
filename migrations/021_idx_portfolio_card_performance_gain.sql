--
-- Add composite index for top/worst performer queries
-- Supports ORDER BY (unrealized_gain + realized_gain) per user
--
CREATE INDEX IF NOT EXISTS idx_portfolio_card_performance_user_gain
    ON public.portfolio_card_performance (user_id, ((unrealized_gain + realized_gain)));
