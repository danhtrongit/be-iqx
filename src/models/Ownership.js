const { pool } = require('../config/database');

class Ownership {
  // Ownership Breakdown methods
  static async createOwnershipBreakdown(ownershipData) {
    const client = await pool.connect();
    try {
      const query = `
        INSERT INTO ownership_breakdown (
          ticker, investor_type, pct_of_shares_out_held_tier, 
          parent_investor_type, level
        ) VALUES (
          $1, $2, $3, $4, $5
        )
        ON CONFLICT (ticker, investor_type, level) DO UPDATE SET
          pct_of_shares_out_held_tier = EXCLUDED.pct_of_shares_out_held_tier,
          parent_investor_type = EXCLUDED.parent_investor_type,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *;
      `;

      const values = [
        ownershipData.ticker,
        ownershipData.investorType,
        ownershipData.pctOfSharesOutHeldTier,
        ownershipData.parentInvestorType || null,
        ownershipData.level
      ];

      const result = await client.query(query, values);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  static async bulkCreateOwnershipBreakdown(ownershipDataArray) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const results = [];
      for (const ownershipData of ownershipDataArray) {
        const result = await this.createOwnershipBreakdown(ownershipData);
        results.push(result);
      }
      
      await client.query('COMMIT');
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Major Shareholders methods
  static async createMajorShareholder(shareholderData) {
    const client = await pool.connect();
    try {
      const query = `
        INSERT INTO major_shareholders (
          ticker, investor_full_name, pct_of_shares_out_held, 
          shares_held, current_value, change_value, country_of_investor
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7
        )
        ON CONFLICT (ticker, investor_full_name) DO UPDATE SET
          pct_of_shares_out_held = EXCLUDED.pct_of_shares_out_held,
          shares_held = EXCLUDED.shares_held,
          current_value = EXCLUDED.current_value,
          change_value = EXCLUDED.change_value,
          country_of_investor = EXCLUDED.country_of_investor,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *;
      `;

      const values = [
        shareholderData.ticker,
        shareholderData.investorFullName,
        shareholderData.pctOfSharesOutHeld,
        shareholderData.sharesHeld,
        shareholderData.currentValue,
        shareholderData.changeValue,
        shareholderData.countryOfInvestor
      ];

      const result = await client.query(query, values);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  // Fund Holdings methods
  static async createFundHolding(fundData) {
    const client = await pool.connect();
    try {
      const query = `
        INSERT INTO fund_holdings (
          ticker, fund_id, fund_code, fund_name, issuer, filling_date,
          shares_held, shares_held_value_vnd, pct_portfolio, image_url
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
        )
        ON CONFLICT (ticker, fund_id) DO UPDATE SET
          fund_code = EXCLUDED.fund_code,
          fund_name = EXCLUDED.fund_name,
          issuer = EXCLUDED.issuer,
          filling_date = EXCLUDED.filling_date,
          shares_held = EXCLUDED.shares_held,
          shares_held_value_vnd = EXCLUDED.shares_held_value_vnd,
          pct_portfolio = EXCLUDED.pct_portfolio,
          image_url = EXCLUDED.image_url,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *;
      `;

      const values = [
        fundData.ticker,
        fundData.fundId,
        fundData.fundCode,
        fundData.fundName,
        fundData.issuer,
        fundData.fillingDate,
        fundData.sharesHeld,
        fundData.sharesHeldValueVnd,
        fundData.pctPortfolio,
        fundData.imageUrl
      ];

      const result = await client.query(query, values);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  // Query methods
  static async findOwnershipBreakdownByTicker(ticker) {
    const client = await pool.connect();
    try {
      const query = `
        SELECT * FROM ownership_breakdown 
        WHERE ticker = $1 
        ORDER BY level, pct_of_shares_out_held_tier DESC
      `;
      const result = await client.query(query, [ticker]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  static async findMajorShareholdersByTicker(ticker, limit = 20) {
    const client = await pool.connect();
    try {
      const query = `
        SELECT * FROM major_shareholders 
        WHERE ticker = $1 
        ORDER BY pct_of_shares_out_held DESC 
        LIMIT $2
      `;
      const result = await client.query(query, [ticker, limit]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  static async findFundHoldingsByTicker(ticker, limit = 50) {
    const client = await pool.connect();
    try {
      const query = `
        SELECT * FROM fund_holdings 
        WHERE ticker = $1 
        ORDER BY pct_portfolio DESC 
        LIMIT $2
      `;
      const result = await client.query(query, [ticker, limit]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  static async getOwnershipStatistics() {
    const client = await pool.connect();
    try {
      const query = `
        SELECT 
          COUNT(DISTINCT ticker) as total_tickers_with_ownership,
          COUNT(*) as total_ownership_records,
          (SELECT COUNT(DISTINCT ticker) FROM major_shareholders) as tickers_with_shareholders,
          (SELECT COUNT(*) FROM major_shareholders) as total_shareholders,
          (SELECT COUNT(DISTINCT ticker) FROM fund_holdings) as tickers_with_funds,
          (SELECT COUNT(*) FROM fund_holdings) as total_fund_holdings
        FROM ownership_breakdown
      `;
      const result = await client.query(query);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  static async getTickersWithOwnershipData() {
    const client = await pool.connect();
    try {
      const query = `
        SELECT DISTINCT ticker FROM ownership_breakdown
        UNION
        SELECT DISTINCT ticker FROM major_shareholders
        UNION
        SELECT DISTINCT ticker FROM fund_holdings
        ORDER BY ticker
      `;
      const result = await client.query(query);
      return result.rows.map(row => row.ticker);
    } finally {
      client.release();
    }
  }
}

module.exports = Ownership;
