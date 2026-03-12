--
-- Add computation_method column to portfolio_summary
-- Tracks whether the snapshot was computed using 'average' (ETL) or 'fifo' (NestJS recalculate)
--

ALTER TABLE public.portfolio_summary
    ADD COLUMN IF NOT EXISTS computation_method varchar(10) NOT NULL DEFAULT 'average';
