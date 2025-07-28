const { pool } = require('../config/database');

class Ticker {
  static async create(tickerData) {
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
          bc_industry_group_id = EXCLUDED.bc_industry_group_id,
          bc_industry_group_slug = EXCLUDED.bc_industry_group_slug,
          bc_industry_group_code = EXCLUDED.bc_industry_group_code,
          bc_industry_group_type = EXCLUDED.bc_industry_group_type,
          bc_economic_sector_id = EXCLUDED.bc_economic_sector_id,
          bc_economic_sector_slug = EXCLUDED.bc_economic_sector_slug,
          bc_economic_sector_name = EXCLUDED.bc_economic_sector_name,
          website = EXCLUDED.website,
          main_service = EXCLUDED.main_service,
          business_line = EXCLUDED.business_line,
          business_strategy = EXCLUDED.business_strategy,
          business_risk = EXCLUDED.business_risk,
          business_overall = EXCLUDED.business_overall,
          detail_info = EXCLUDED.detail_info,
          market_cap = EXCLUDED.market_cap,
          outstanding_shares_value = EXCLUDED.outstanding_shares_value,
          analysis_updated = EXCLUDED.analysis_updated,
          stock_exchange = EXCLUDED.stock_exchange,
          no_of_recommendations = EXCLUDED.no_of_recommendations,
          price_close = EXCLUDED.price_close,
          is_in_watchlist = EXCLUDED.is_in_watchlist,
          net_change = EXCLUDED.net_change,
          pct_change = EXCLUDED.pct_change,
          price_referrance = EXCLUDED.price_referrance,
          price_open = EXCLUDED.price_open,
          price_floor = EXCLUDED.price_floor,
          price_low = EXCLUDED.price_low,
          price_high = EXCLUDED.price_high,
          price_ceiling = EXCLUDED.price_ceiling,
          price_time_stamp = EXCLUDED.price_time_stamp,
          price_type = EXCLUDED.price_type,
          volume_10d_avg = EXCLUDED.volume_10d_avg,
          volume = EXCLUDED.volume,
          pe_ratio = EXCLUDED.pe_ratio,
          pb_ratio = EXCLUDED.pb_ratio,
          eps_ratio = EXCLUDED.eps_ratio,
          ev_ebitda_ratio = EXCLUDED.ev_ebitda_ratio,
          book_value = EXCLUDED.book_value,
          free_float_rate = EXCLUDED.free_float_rate,
          valuation_point = EXCLUDED.valuation_point,
          growth_point = EXCLUDED.growth_point,
          pass_performance_point = EXCLUDED.pass_performance_point,
          financial_health_point = EXCLUDED.financial_health_point,
          dividend_point = EXCLUDED.dividend_point,
          image_url = EXCLUDED.image_url,
          local_image_path = EXCLUDED.local_image_path,
          dividend_yield_current = EXCLUDED.dividend_yield_current,
          beta_5y = EXCLUDED.beta_5y,
          price_pct_chg_7d = EXCLUDED.price_pct_chg_7d,
          price_pct_chg_30d = EXCLUDED.price_pct_chg_30d,
          price_pct_chg_ytd = EXCLUDED.price_pct_chg_ytd,
          price_pct_chg_1y = EXCLUDED.price_pct_chg_1y,
          price_pct_chg_3y = EXCLUDED.price_pct_chg_3y,
          price_pct_chg_5y = EXCLUDED.price_pct_chg_5y,
          company_quality = EXCLUDED.company_quality,
          overall_risk_level = EXCLUDED.overall_risk_level,
          quality_valuation = EXCLUDED.quality_valuation,
          ta_signal_1d = EXCLUDED.ta_signal_1d,
          watchlist_count = EXCLUDED.watchlist_count,
          roe = EXCLUDED.roe,
          roa = EXCLUDED.roa,
          revenue_5y_growth = EXCLUDED.revenue_5y_growth,
          net_income_5y_growth = EXCLUDED.net_income_5y_growth,
          revenue_ltm_growth = EXCLUDED.revenue_ltm_growth,
          net_income_ltm_growth = EXCLUDED.net_income_ltm_growth,
          revenue_growth_qoq = EXCLUDED.revenue_growth_qoq,
          net_income_growth_qoq = EXCLUDED.net_income_growth_qoq,
          type = EXCLUDED.type,
          country = EXCLUDED.country,
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
  }

  static async findByTicker(ticker) {
    const client = await pool.connect();
    try {
      const query = 'SELECT * FROM tickers WHERE ticker = $1';
      const result = await client.query(query, [ticker]);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  static async findAll(limit = 100, offset = 0) {
    const client = await pool.connect();
    try {
      const query = `
        SELECT * FROM tickers 
        ORDER BY updated_at DESC 
        LIMIT $1 OFFSET $2
      `;
      const result = await client.query(query, [limit, offset]);
      return result.rows;
    } finally {
      client.release();
    }
  }



  static async getCount() {
    const client = await pool.connect();
    try {
      const query = 'SELECT COUNT(*) as count FROM tickers';
      const result = await client.query(query);
      return parseInt(result.rows[0].count);
    } finally {
      client.release();
    }
  }
}

module.exports = Ticker;
