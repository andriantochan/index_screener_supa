-- =============================================
-- BEI Stock Screener - Supabase Schema
-- =============================================

-- Enable realtime
alter publication supabase_realtime add table stocks;

-- Stocks table
CREATE TABLE IF NOT EXISTS stocks (
    symbol VARCHAR(10) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    
    -- Price data
    price DECIMAL(15, 2) DEFAULT 0,
    open_price DECIMAL(15, 2) DEFAULT 0,
    high DECIMAL(15, 2) DEFAULT 0,
    low DECIMAL(15, 2) DEFAULT 0,
    prev_close DECIMAL(15, 2) DEFAULT 0,
    change DECIMAL(15, 2) DEFAULT 0,
    change_percent DECIMAL(8, 2) DEFAULT 0,
    
    -- Volume
    volume BIGINT DEFAULT 0,
    avg_volume BIGINT DEFAULT 0,
    frequency INTEGER DEFAULT 0,
    value DECIMAL(20, 2) DEFAULT 0,
    
    -- Order book
    bid DECIMAL(15, 2) DEFAULT 0,
    ask DECIMAL(15, 2) DEFAULT 0,
    bid_size BIGINT DEFAULT 0,
    ask_size BIGINT DEFAULT 0,
    
    -- IEP/IEV (Pre-opening/Pre-closing)
    iep DECIMAL(15, 2) DEFAULT 0,
    iev BIGINT DEFAULT 0,
    
    -- ARA/ARB (Auto Reject)
    ara DECIMAL(15, 2) DEFAULT 0,
    arb DECIMAL(15, 2) DEFAULT 0,
    ara_pct DECIMAL(8, 2) DEFAULT 0,
    arb_pct DECIMAL(8, 2) DEFAULT 0,
    
    -- Foreign flow
    foreign_buy BIGINT DEFAULT 0,
    foreign_sell BIGINT DEFAULT 0,
    net_foreign BIGINT DEFAULT 0,
    
    -- Accumulation/Distribution
    acc_dist_status VARCHAR(20) DEFAULT 'neutral',
    acc_dist_score INTEGER DEFAULT 0,
    
    -- Calculated metrics
    market_cap BIGINT DEFAULT 0,
    volatility DECIMAL(8, 2) DEFAULT 0,
    spread DECIMAL(8, 2) DEFAULT 0,
    volume_spike DECIMAL(8, 2) DEFAULT 100,
    rsi DECIMAL(8, 2) DEFAULT 50,
    score INTEGER DEFAULT 0,
    passed_screen BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Market status table
CREATE TABLE IF NOT EXISTS market_status (
    id INTEGER PRIMARY KEY DEFAULT 1,
    status VARCHAR(20) NOT NULL,
    session VARCHAR(20) NOT NULL,
    message VARCHAR(255) NOT NULL,
    can_trade BOOLEAN DEFAULT FALSE,
    should_update BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure only one row
    CONSTRAINT single_row CHECK (id = 1)
);

-- Insert default market status
INSERT INTO market_status (id, status, session, message, can_trade, should_update)
VALUES (1, 'closed', 'unknown', 'Initializing...', FALSE, FALSE)
ON CONFLICT (id) DO NOTHING;

-- Screened stocks view
CREATE OR REPLACE VIEW screened_stocks AS
SELECT *
FROM stocks
WHERE passed_screen = TRUE
ORDER BY score DESC, symbol ASC;

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_stocks_passed ON stocks(passed_screen);
CREATE INDEX IF NOT EXISTS idx_stocks_score ON stocks(score DESC);
CREATE INDEX IF NOT EXISTS idx_stocks_updated ON stocks(updated_at DESC);

-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-updating timestamp
DROP TRIGGER IF EXISTS stocks_updated_at ON stocks;
CREATE TRIGGER stocks_updated_at
    BEFORE UPDATE ON stocks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Enable Row Level Security
ALTER TABLE stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_status ENABLE ROW LEVEL SECURITY;

-- Public read access (no auth required)
CREATE POLICY "Public read stocks" ON stocks
    FOR SELECT USING (true);

CREATE POLICY "Public read market_status" ON market_status
    FOR SELECT USING (true);

-- Service role can do everything (for scraper)
CREATE POLICY "Service can insert stocks" ON stocks
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Service can update stocks" ON stocks
    FOR UPDATE USING (true);

CREATE POLICY "Service can update market_status" ON market_status
    FOR ALL USING (true);
