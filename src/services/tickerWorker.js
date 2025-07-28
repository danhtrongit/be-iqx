const { parentPort, workerData } = require('worker_threads');
const axios = require('axios');
const { Pool } = require('pg');

// Worker configuration
const { workerId } = workerData;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

// Database connection for this worker
let pool;

// Initialize database connection
const initDatabase = () => {
  pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'iqx',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    max: 2, // Limit connections per worker
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
};

// Transform API data to match database schema
const transformApiData = (summary) => {
  return {
    ticker: summary.ticker,
    nameVi: summary.nameVi || summary.name,
    nameEn: summary.nameEn,
    industryActivity: summary.industryActivity,
    bcIndustryGroupId: summary.bcIndustryGroupId,
    bcIndustryGroupSlug: summary.bcIndustryGroupSlug,
    bcIndustryGroupCode: summary.bcIndustryGroupCode,
    bcIndustryGroupType: summary.bcIndustryGroupType,
    bcEconomicSectorId: summary.bcEconomicSectorId,
    bcEconomicSectorSlug: summary.bcEconomicSectorSlug,
    bcEconomicSectorName: summary.bcEconomicSectorName,
    website: summary.website,
    mainService: summary.mainService,
    businessLine: summary.businessLine,
    businessStrategy: summary.businessStrategy,
    businessRisk: summary.businessRisk,
    businessOverall: summary.businessOverall,
    detailInfo: summary.detailInfo,
    marketCap: summary.marketCap,
    outstandingSharesValue: summary.outstandingSharesValue,
    analysisUpdated: summary.analysisUpdated,
    stockExchange: summary.stockExchange,
    noOfRecommendations: summary.noOfRecommendations,
    priceClose: summary.priceClose,
    isInWatchlist: summary.isInWatchlist,
    netChange: summary.netChange,
    pctChange: summary.pctChange,
    priceReferrance: summary.priceReferrance,
    priceOpen: summary.priceOpen,
    priceFloor: summary.priceFloor,
    priceLow: summary.priceLow,
    priceHigh: summary.priceHigh,
    priceCeiling: summary.priceCeiling,
    priceTimeStamp: summary.priceTimeStamp,
    priceType: summary.priceType,
    volume10dAvg: summary.volume10dAvg,
    volume: summary.volume,
    peRatio: summary.peRatio,
    pbRatio: summary.pbRatio,
    epsRatio: summary.epsRatio,
    evEbitdaRatio: summary.evEbitdaRatio,
    bookValue: summary.bookValue,
    freeFloatRate: summary.freeFloatRate,
    valuationPoint: summary.valuationPoint,
    growthPoint: summary.growthPoint,
    passPerformancePoint: summary.passPerformancePoint,
    financialHealthPoint: summary.financialHealthPoint,
    dividendPoint: summary.dividendPoint,
    imageUrl: summary.imageUrl,
    dividendYieldCurrent: summary.dividendYieldCurrent,
    beta5y: summary.beta5y,
    pricePctChg7d: summary.pricePctChg7d,
    pricePctChg30d: summary.pricePctChg30d,
    pricePctChgYtd: summary.pricePctChgYtd,
    pricePctChg1y: summary.pricePctChg1y,
    pricePctChg3y: summary.pricePctChg3y,
    pricePctChg5y: summary.pricePctChg5y,
    companyQuality: summary.companyQuality,
    overallRiskLevel: summary.overallRiskLevel,
    qualityValuation: summary.qualityValuation,
    taSignal1d: summary.taSignal1d,
    watchlistCount: summary.watchlistCount,
    roe: summary.roe,
    roa: summary.roa,
    revenue5yGrowth: summary.revenue5yGrowth,
    netIncome5yGrowth: summary.netIncome5yGrowth,
    revenueLtmGrowth: summary.revenueLtmGrowth,
    netIncomeLtmGrowth: summary.netIncomeLtmGrowth,
    revenueGrowthQoq: summary.revenueGrowthQoq,
    netIncomeGrowthQoq: summary.netIncomeGrowthQoq,
    type: summary.type,
    country: summary.country
  };
};

// Save ticker data to database
const saveTickerData = async (tickerData) => {
  const client = await pool.connect();
  try {
    const query = `
      INSERT INTO tickers (
        ticker, name_vi, name_en, industry_activity, bc_industry_group_id,
        bc_industry_group_slug, bc_industry_group_code, bc_industry_group_type,
        bc_economic_sector_id, bc_economic_sector_slug, bc_economic_sector_name,
        website, main_service, business_line, business_strategy, business_risk,
        business_overall, detail_info, market_cap, outstanding_shares_value,
        analysis_updated, stock_exchange, no_of_recommendations, price_close,
        is_in_watchlist, net_change, pct_change, price_referrance, price_open,
        price_floor, price_low, price_high, price_ceiling, price_time_stamp,
        price_type, volume_10d_avg, volume, pe_ratio, pb_ratio, eps_ratio,
        ev_ebitda_ratio, book_value, free_float_rate, valuation_point,
        growth_point, pass_performance_point, financial_health_point,
        dividend_point, image_url, dividend_yield_current,
        beta_5y, price_pct_chg_7d, price_pct_chg_30d, price_pct_chg_ytd,
        price_pct_chg_1y, price_pct_chg_3y, price_pct_chg_5y, company_quality,
        overall_risk_level, quality_valuation, ta_signal_1d, watchlist_count,
        roe, roa, revenue_5y_growth, net_income_5y_growth, revenue_ltm_growth,
        net_income_ltm_growth, revenue_growth_qoq, net_income_growth_qoq,
        type, country
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
        $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44,
        $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55, $56, $57, $58,
        $59, $60, $61, $62, $63, $64, $65, $66, $67, $68, $69, $70, $71, $72
      )
      ON CONFLICT (ticker) DO UPDATE SET
        name_vi = EXCLUDED.name_vi,
        name_en = EXCLUDED.name_en,
        industry_activity = EXCLUDED.industry_activity,
        market_cap = EXCLUDED.market_cap,
        price_close = EXCLUDED.price_close,
        pe_ratio = EXCLUDED.pe_ratio,
        pb_ratio = EXCLUDED.pb_ratio,
        roe = EXCLUDED.roe,
        roa = EXCLUDED.roa,
        image_url = EXCLUDED.image_url,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;

    const values = [
      tickerData.ticker, tickerData.nameVi, tickerData.nameEn, tickerData.industryActivity,
      tickerData.bcIndustryGroupId, tickerData.bcIndustryGroupSlug, tickerData.bcIndustryGroupCode,
      tickerData.bcIndustryGroupType, tickerData.bcEconomicSectorId, tickerData.bcEconomicSectorSlug,
      tickerData.bcEconomicSectorName, tickerData.website, tickerData.mainService, tickerData.businessLine,
      tickerData.businessStrategy, tickerData.businessRisk, tickerData.businessOverall, tickerData.detailInfo,
      tickerData.marketCap, tickerData.outstandingSharesValue, tickerData.analysisUpdated,
      tickerData.stockExchange, tickerData.noOfRecommendations, tickerData.priceClose,
      tickerData.isInWatchlist, tickerData.netChange, tickerData.pctChange, tickerData.priceReferrance,
      tickerData.priceOpen, tickerData.priceFloor, tickerData.priceLow, tickerData.priceHigh,
      tickerData.priceCeiling, tickerData.priceTimeStamp, tickerData.priceType, tickerData.volume10dAvg,
      tickerData.volume, tickerData.peRatio, tickerData.pbRatio, tickerData.epsRatio,
      tickerData.evEbitdaRatio, tickerData.bookValue, tickerData.freeFloatRate, tickerData.valuationPoint,
      tickerData.growthPoint, tickerData.passPerformancePoint, tickerData.financialHealthPoint,
      tickerData.dividendPoint, tickerData.imageUrl, tickerData.dividendYieldCurrent,
      tickerData.beta5y, tickerData.pricePctChg7d, tickerData.pricePctChg30d, tickerData.pricePctChgYtd,
      tickerData.pricePctChg1y, tickerData.pricePctChg3y, tickerData.pricePctChg5y, tickerData.companyQuality,
      tickerData.overallRiskLevel, tickerData.qualityValuation, tickerData.taSignal1d, tickerData.watchlistCount,
      tickerData.roe, tickerData.roa, tickerData.revenue5yGrowth, tickerData.netIncome5yGrowth,
      tickerData.revenueLtmGrowth, tickerData.netIncomeLtmGrowth, tickerData.revenueGrowthQoq,
      tickerData.netIncomeGrowthQoq, tickerData.type, tickerData.country
    ];

    const result = await client.query(query, values);
    return result.rows[0];
  } finally {
    client.release();
  }
};

// Fetch ticker data from API with retry logic
const fetchTickerData = async (ticker) => {
  const baseUrl = process.env.SIMPLIZE_API_BASE_URL || 'https://simplize.vn/_next/data/n0EN5WraCn9Bbeck4Eik9/co-phieu';
  const endpoint = process.env.SIMPLIZE_API_ENDPOINT || '/ho-so-doanh-nghiep.json';
  const url = `${baseUrl}/${ticker}${endpoint}`;

  let lastError = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9,vi;q=0.8',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (response.data && response.data.pageProps && response.data.pageProps.summary) {
        const summary = response.data.pageProps.summary;
        const tickerData = transformApiData(summary);
        const savedTicker = await saveTickerData(tickerData);
        
        return savedTicker;
      } else {
        throw new Error('Invalid response structure');
      }
    } catch (error) {
      lastError = error;
      
      if (attempt < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      }
    }
  }

  throw new Error(`Failed to fetch ${ticker} after ${MAX_RETRIES} attempts: ${lastError.message}`);
};

// Handle messages from main thread
parentPort.on('message', async (message) => {
  switch (message.type) {
    case 'ping':
      parentPort.postMessage({ type: 'pong' });
      break;
      
    case 'fetch_ticker':
      try {
        const result = await fetchTickerData(message.ticker);
        parentPort.postMessage({
          type: 'job_complete',
          jobId: message.jobId,
          result
        });
      } catch (error) {
        parentPort.postMessage({
          type: 'job_error',
          jobId: message.jobId,
          error: error.message
        });
      }
      break;
  }
});

// Initialize database when worker starts
initDatabase();
