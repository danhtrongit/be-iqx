const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'iqx_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test database connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Initialize database tables
const initializeDatabase = async () => {
  const client = await pool.connect();
  try {
    // Create tickers table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS tickers (
        id SERIAL PRIMARY KEY,
        ticker VARCHAR(20) NOT NULL UNIQUE,
        name_vi TEXT,
        name_en TEXT,
        industry_activity TEXT,
        bc_industry_group_id INTEGER,
        bc_industry_group_slug VARCHAR(255),
        bc_industry_group_code VARCHAR(50),
        bc_industry_group_type VARCHAR(50),
        bc_economic_sector_id INTEGER,
        bc_economic_sector_slug VARCHAR(255),
        bc_economic_sector_name VARCHAR(255),
        website TEXT,
        main_service TEXT,
        business_line TEXT,
        business_strategy TEXT,
        business_risk TEXT,
        business_overall TEXT,
        detail_info TEXT,
        market_cap BIGINT,
        outstanding_shares_value BIGINT,
        analysis_updated VARCHAR(50),
        stock_exchange VARCHAR(20),
        no_of_recommendations INTEGER,
        price_close DECIMAL(15,2),
        is_in_watchlist BOOLEAN,
        net_change DECIMAL(15,2),
        pct_change DECIMAL(10,4),
        price_referrance DECIMAL(15,2),
        price_open DECIMAL(15,2),
        price_floor DECIMAL(15,2),
        price_low DECIMAL(15,2),
        price_high DECIMAL(15,2),
        price_ceiling DECIMAL(15,2),
        price_time_stamp VARCHAR(50),
        price_type INTEGER,
        volume_10d_avg BIGINT,
        volume BIGINT,
        pe_ratio DECIMAL(10,4),
        pb_ratio DECIMAL(10,4),
        eps_ratio DECIMAL(15,4),
        ev_ebitda_ratio DECIMAL(10,4),
        book_value DECIMAL(15,4),
        free_float_rate DECIMAL(10,4),
        valuation_point INTEGER,
        growth_point INTEGER,
        pass_performance_point INTEGER,
        financial_health_point INTEGER,
        dividend_point INTEGER,
        image_url TEXT,
        dividend_yield_current DECIMAL(10,4),
        beta_5y DECIMAL(10,4),
        price_pct_chg_7d DECIMAL(10,4),
        price_pct_chg_30d DECIMAL(10,4),
        price_pct_chg_ytd DECIMAL(10,4),
        price_pct_chg_1y DECIMAL(10,4),
        price_pct_chg_3y DECIMAL(10,4),
        price_pct_chg_5y DECIMAL(10,4),
        company_quality INTEGER,
        overall_risk_level VARCHAR(50),
        quality_valuation VARCHAR(10),
        ta_signal_1d VARCHAR(50),
        watchlist_count INTEGER,
        roe DECIMAL(15,8),
        roa DECIMAL(15,8),
        revenue_5y_growth DECIMAL(10,4),
        net_income_5y_growth DECIMAL(10,4),
        revenue_ltm_growth DECIMAL(10,4),
        net_income_ltm_growth DECIMAL(10,4),
        revenue_growth_qoq DECIMAL(10,4),
        net_income_growth_qoq DECIMAL(10,4),
        type VARCHAR(20),
        country VARCHAR(10),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_tickers_ticker ON tickers(ticker);
      CREATE INDEX IF NOT EXISTS idx_tickers_stock_exchange ON tickers(stock_exchange);
      CREATE INDEX IF NOT EXISTS idx_tickers_created_at ON tickers(created_at);

      CREATE INDEX IF NOT EXISTS idx_historical_prices_ticker ON historical_prices(ticker);
      CREATE INDEX IF NOT EXISTS idx_historical_prices_date ON historical_prices(date);
      CREATE INDEX IF NOT EXISTS idx_historical_prices_ticker_date ON historical_prices(ticker, date);

      CREATE INDEX IF NOT EXISTS idx_ownership_breakdown_ticker ON ownership_breakdown(ticker);
      CREATE INDEX IF NOT EXISTS idx_ownership_breakdown_level ON ownership_breakdown(level);
      CREATE INDEX IF NOT EXISTS idx_major_shareholders_ticker ON major_shareholders(ticker);
      CREATE INDEX IF NOT EXISTS idx_major_shareholders_pct ON major_shareholders(pct_of_shares_out_held);
      CREATE INDEX IF NOT EXISTS idx_fund_holdings_ticker ON fund_holdings(ticker);
      CREATE INDEX IF NOT EXISTS idx_fund_holdings_fund_id ON fund_holdings(fund_id);

      CREATE INDEX IF NOT EXISTS idx_technical_analysis_ticker ON technical_analysis(ticker);
      CREATE INDEX IF NOT EXISTS idx_technical_analysis_time_frame ON technical_analysis(time_frame);
      CREATE INDEX IF NOT EXISTS idx_technical_moving_averages_ticker ON technical_moving_averages(ticker, time_frame);
      CREATE INDEX IF NOT EXISTS idx_technical_oscillators_ticker ON technical_oscillators(ticker, time_frame);

      CREATE INDEX IF NOT EXISTS idx_impact_index_symbol ON impact_index(symbol);
      CREATE INDEX IF NOT EXISTS idx_impact_index_value ON impact_index(impact_index);
      CREATE INDEX IF NOT EXISTS idx_impact_index_updated_at ON impact_index(updated_at);

      CREATE INDEX IF NOT EXISTS idx_foreign_trading_symbol ON foreign_trading(symbol);
      CREATE INDEX IF NOT EXISTS idx_foreign_trading_buy_value ON foreign_trading(foreign_buy_value);
      CREATE INDEX IF NOT EXISTS idx_foreign_trading_sell_value ON foreign_trading(foreign_sell_value);
      CREATE INDEX IF NOT EXISTS idx_foreign_trading_net_value ON foreign_trading((foreign_buy_value - foreign_sell_value));
      CREATE INDEX IF NOT EXISTS idx_foreign_trading_updated_at ON foreign_trading(updated_at);
    `);

    // Create historical_prices table
    await client.query(`
      CREATE TABLE IF NOT EXISTS historical_prices (
        id SERIAL PRIMARY KEY,
        ticker VARCHAR(20) NOT NULL,
        date DATE NOT NULL,
        price_close DECIMAL(15,2),
        price_open DECIMAL(15,2),
        price_low DECIMAL(15,2),
        price_high DECIMAL(15,2),
        net_change DECIMAL(15,2),
        pct_change DECIMAL(15,8),
        volume BIGINT,
        cfr BIGINT,
        bfq BIGINT,
        sfq BIGINT,
        fnbsq BIGINT,
        bfv DECIMAL(20,2),
        sfv DECIMAL(20,2),
        fnbsv DECIMAL(20,2),
        type VARCHAR(20) DEFAULT 'stock',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(ticker, date)
      );
    `);

    // Create ownership_breakdown table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ownership_breakdown (
        id SERIAL PRIMARY KEY,
        ticker VARCHAR(20) NOT NULL,
        investor_type VARCHAR(100) NOT NULL,
        pct_of_shares_out_held_tier DECIMAL(8,4),
        parent_investor_type VARCHAR(100),
        level INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(ticker, investor_type, level)
      );
    `);

    // Create major_shareholders table
    await client.query(`
      CREATE TABLE IF NOT EXISTS major_shareholders (
        id SERIAL PRIMARY KEY,
        ticker VARCHAR(20) NOT NULL,
        investor_full_name VARCHAR(200) NOT NULL,
        pct_of_shares_out_held DECIMAL(8,4),
        shares_held BIGINT,
        current_value BIGINT,
        change_value INTEGER,
        country_of_investor VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(ticker, investor_full_name)
      );
    `);

    // Create fund_holdings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS fund_holdings (
        id SERIAL PRIMARY KEY,
        ticker VARCHAR(20) NOT NULL,
        fund_id INTEGER NOT NULL,
        fund_code VARCHAR(50),
        fund_name VARCHAR(200),
        issuer VARCHAR(100),
        filling_date VARCHAR(20),
        shares_held BIGINT,
        shares_held_value_vnd BIGINT,
        pct_portfolio DECIMAL(8,4),
        image_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(ticker, fund_id)
      );
    `);

    // Create technical_analysis table
    await client.query(`
      CREATE TABLE IF NOT EXISTS technical_analysis (
        id SERIAL PRIMARY KEY,
        ticker VARCHAR(20) NOT NULL,
        time_frame VARCHAR(30) NOT NULL,
        server_date_time TIMESTAMP,
        gauge_moving_average_rating VARCHAR(30),
        gauge_moving_average_values JSONB,
        gauge_oscillator_rating VARCHAR(30),
        gauge_oscillator_values JSONB,
        gauge_summary_rating VARCHAR(30),
        gauge_summary_values JSONB,
        pivot_point DECIMAL(15,4),
        resistance1 DECIMAL(15,4),
        resistance2 DECIMAL(15,4),
        resistance3 DECIMAL(15,4),
        support1 DECIMAL(15,4),
        support2 DECIMAL(15,4),
        support3 DECIMAL(15,4),
        fib_resistance1 DECIMAL(15,4),
        fib_resistance2 DECIMAL(15,4),
        fib_resistance3 DECIMAL(15,4),
        fib_support1 DECIMAL(15,4),
        fib_support2 DECIMAL(15,4),
        fib_support3 DECIMAL(15,4),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(ticker, time_frame)
      );
    `);

    // Create technical_moving_averages table
    await client.query(`
      CREATE TABLE IF NOT EXISTS technical_moving_averages (
        id SERIAL PRIMARY KEY,
        ticker VARCHAR(20) NOT NULL,
        time_frame VARCHAR(30) NOT NULL,
        name VARCHAR(100) NOT NULL,
        value DECIMAL(15,4),
        rating VARCHAR(30),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create technical_oscillators table
    await client.query(`
      CREATE TABLE IF NOT EXISTS technical_oscillators (
        id SERIAL PRIMARY KEY,
        ticker VARCHAR(20) NOT NULL,
        time_frame VARCHAR(30) NOT NULL,
        name VARCHAR(100) NOT NULL,
        value DECIMAL(15,4),
        rating VARCHAR(30),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create impact_index table
    await client.query(`
      CREATE TABLE IF NOT EXISTS impact_index (
        id SERIAL PRIMARY KEY,
        symbol VARCHAR(20) NOT NULL UNIQUE,
        impact_index DECIMAL(15,8) NOT NULL,
        data_source VARCHAR(50) DEFAULT 'google_sheets',
        sheet_range VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create foreign_trading table
    await client.query(`
      CREATE TABLE IF NOT EXISTS foreign_trading (
        id SERIAL PRIMARY KEY,
        symbol VARCHAR(20) NOT NULL UNIQUE,
        foreign_buy_volume BIGINT DEFAULT 0,
        foreign_buy_value BIGINT DEFAULT 0,
        foreign_sell_volume BIGINT DEFAULT 0,
        foreign_sell_value BIGINT DEFAULT 0,
        data_source VARCHAR(50) DEFAULT 'google_sheets',
        sheet_range VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create data_collection_logs table for tracking API calls
    await client.query(`
      CREATE TABLE IF NOT EXISTS data_collection_logs (
        id SERIAL PRIMARY KEY,
        ticker VARCHAR(20) NOT NULL,
        status VARCHAR(20) NOT NULL,
        error_message TEXT,
        retry_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  pool,
  initializeDatabase
};
