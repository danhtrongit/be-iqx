const { pool } = require('../config/database');

class HistoricalPrice {
  static async create(priceData) {
    const client = await pool.connect();
    try {
      const query = `
        INSERT INTO historical_prices (
          ticker, date, price_close, price_open, price_low, price_high,
          net_change, pct_change, volume, cfr, bfq, sfq, fnbsq,
          bfv, sfv, fnbsv, type
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
        )
        ON CONFLICT (ticker, date) DO UPDATE SET
          price_close = EXCLUDED.price_close,
          price_open = EXCLUDED.price_open,
          price_low = EXCLUDED.price_low,
          price_high = EXCLUDED.price_high,
          net_change = EXCLUDED.net_change,
          pct_change = EXCLUDED.pct_change,
          volume = EXCLUDED.volume,
          cfr = EXCLUDED.cfr,
          bfq = EXCLUDED.bfq,
          sfq = EXCLUDED.sfq,
          fnbsq = EXCLUDED.fnbsq,
          bfv = EXCLUDED.bfv,
          sfv = EXCLUDED.sfv,
          fnbsv = EXCLUDED.fnbsv,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *;
      `;

      const values = [
        priceData.ticker,
        new Date(priceData.date * 1000), // Convert timestamp to date
        priceData.priceClose,
        priceData.priceOpen,
        priceData.priceLow,
        priceData.priceHigh,
        priceData.netChange,
        priceData.pctChange,
        priceData.volume,
        priceData.cfr,
        priceData.bfq,
        priceData.sfq,
        priceData.fnbsq,
        priceData.bfv,
        priceData.sfv,
        priceData.fnbsv,
        priceData.type || 'stock'
      ];

      const result = await client.query(query, values);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  static async bulkCreate(pricesData) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const results = [];
      for (const priceData of pricesData) {
        const result = await this.create(priceData);
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

  static async findByTicker(ticker, limit = 100, offset = 0) {
    const client = await pool.connect();
    try {
      const query = `
        SELECT * FROM historical_prices 
        WHERE ticker = $1 
        ORDER BY date DESC 
        LIMIT $2 OFFSET $3
      `;
      const result = await client.query(query, [ticker, limit, offset]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  static async findByDateRange(ticker, startDate, endDate) {
    const client = await pool.connect();
    try {
      const query = `
        SELECT * FROM historical_prices 
        WHERE ticker = $1 AND date >= $2 AND date <= $3
        ORDER BY date DESC
      `;
      const result = await client.query(query, [ticker, startDate, endDate]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  static async getLatestPrice(ticker) {
    const client = await pool.connect();
    try {
      const query = `
        SELECT * FROM historical_prices 
        WHERE ticker = $1 
        ORDER BY date DESC 
        LIMIT 1
      `;
      const result = await client.query(query, [ticker]);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  static async getCount(ticker = null) {
    const client = await pool.connect();
    try {
      let query, values;
      if (ticker) {
        query = 'SELECT COUNT(*) as count FROM historical_prices WHERE ticker = $1';
        values = [ticker];
      } else {
        query = 'SELECT COUNT(*) as count FROM historical_prices';
        values = [];
      }
      
      const result = await client.query(query, values);
      return parseInt(result.rows[0].count);
    } finally {
      client.release();
    }
  }

  static async getTickersWithData() {
    const client = await pool.connect();
    try {
      const query = `
        SELECT 
          ticker,
          COUNT(*) as records_count,
          MIN(date) as earliest_date,
          MAX(date) as latest_date
        FROM historical_prices 
        GROUP BY ticker
        ORDER BY ticker
      `;
      const result = await client.query(query);
      return result.rows;
    } finally {
      client.release();
    }
  }

  static async deleteOldData(daysToKeep = 365) {
    const client = await pool.connect();
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      const query = `
        DELETE FROM historical_prices 
        WHERE date < $1
      `;
      const result = await client.query(query, [cutoffDate]);
      return result.rowCount;
    } finally {
      client.release();
    }
  }
}

module.exports = HistoricalPrice;
