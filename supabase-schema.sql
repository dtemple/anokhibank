-- =====================================================
-- SUPABASE SCHEMA FOR ANOKHI'S BANK
-- =====================================================
-- Run this SQL in your Supabase SQL Editor (Database > SQL Editor)
-- This creates the tables and sets up the weekly allowance cron job

-- =====================================================
-- 1. CREATE BALANCE TABLE
-- =====================================================
-- Stores the current balance (single row)
CREATE TABLE IF NOT EXISTS balance (
    id INTEGER PRIMARY KEY DEFAULT 1,
    amount DECIMAL(10, 2) NOT NULL DEFAULT 21.00,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Ensure only one row exists
    CONSTRAINT single_row CHECK (id = 1)
);

-- Insert the initial balance of $21
INSERT INTO balance (id, amount) VALUES (1, 21.00)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 2. CREATE TRANSACTIONS TABLE
-- =====================================================
-- Stores all transaction history
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    type VARCHAR(20) NOT NULL CHECK (type IN ('deposit', 'withdrawal')),
    amount DECIMAL(10, 2) NOT NULL,
    description TEXT NOT NULL,
    balance_after DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries ordered by date
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);

-- =====================================================
-- 3. CREATE FUNCTION TO ADD WEEKLY ALLOWANCE
-- =====================================================
-- This function adds $4 allowance and logs the transaction
CREATE OR REPLACE FUNCTION add_weekly_allowance()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    new_balance DECIMAL(10, 2);
BEGIN
    -- Update the balance by adding $4
    UPDATE balance 
    SET amount = amount + 4.00,
        updated_at = NOW()
    WHERE id = 1
    RETURNING amount INTO new_balance;
    
    -- Log the transaction
    INSERT INTO transactions (type, amount, description, balance_after)
    VALUES ('deposit', 4.00, 'Weekly allowance (automatic)', new_balance);
END;
$$;

-- =====================================================
-- 4. SET UP CRON JOB FOR WEEKLY ALLOWANCE
-- =====================================================
-- Note: pg_cron uses UTC time. 7am PST = 3pm UTC (or 2pm UTC during PDT)
-- We'll use 3pm UTC which is 7am PST (8am PDT during daylight saving)

-- First, enable the pg_cron extension (may already be enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the weekly allowance for every Sunday at 3pm UTC (7am PST)
-- The cron expression: minute hour day-of-month month day-of-week
-- '0 15 * * 0' = At 15:00 (3pm UTC) on Sunday (0)
SELECT cron.schedule(
    'weekly-allowance',           -- Job name
    '0 15 * * 0',                 -- Every Sunday at 3pm UTC (7am PST)
    'SELECT add_weekly_allowance()'
);

-- =====================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- =====================================================
-- Enable RLS but allow public access (since this is a single-user app)

ALTER TABLE balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read balance
CREATE POLICY "Allow public read balance" ON balance
    FOR SELECT USING (true);

-- Allow anyone to update balance
CREATE POLICY "Allow public update balance" ON balance
    FOR UPDATE USING (true);

-- Allow anyone to read transactions
CREATE POLICY "Allow public read transactions" ON transactions
    FOR SELECT USING (true);

-- Allow anyone to insert transactions
CREATE POLICY "Allow public insert transactions" ON transactions
    FOR INSERT WITH CHECK (true);

-- =====================================================
-- VERIFICATION QUERIES (run these to check setup)
-- =====================================================
-- Check balance: SELECT * FROM balance;
-- Check transactions: SELECT * FROM transactions ORDER BY created_at DESC;
-- Check cron jobs: SELECT * FROM cron.job;
-- Test allowance function: SELECT add_weekly_allowance();

