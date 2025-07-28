const { pool } = require('../config/database');

class ImpactIndex {
  // Create or update impact index data
  static async createOrUpdate(impactData) {
    const client = await pool.connect();
    try {
      const query = `
        INSERT INTO impact_index (
          symbol, impact_index, data_source, sheet_range
        ) VALUES (
          $1, $2, $3, $4
        )
        ON CONFLICT (symbol) DO UPDATE SET
          impact_index = EXCLUDED.impact_index,
          data_source = EXCLUDED.data_source,
          sheet_range = EXCLUDED.sheet_range,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *;
      `;

      const values = [
        impactData.symbol,
        impactData.impactIndex,
        impactData.dataSource || 'google_sheets',
        impactData.sheetRange || 'CoPhieuAnhHuong!A1:Z1605'
      ];

      const result = await client.query(query, values);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  // Bulk create or update
  static async bulkCreateOrUpdate(impactDataArray) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const results = [];
      for (const impactData of impactDataArray) {
        const result = await this.createOrUpdate(impactData);
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

  // Get impact index by symbol
  static async findBySymbol(symbol) {
    const client = await pool.connect();
    try {
      const query = `
        SELECT * FROM impact_index 
        WHERE symbol = $1
      `;
      const result = await client.query(query, [symbol.toUpperCase()]);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  // Get all impact index data with pagination
  static async findAll(limit = 100, offset = 0, orderBy = 'impact_index', orderDirection = 'DESC') {
    const client = await pool.connect();
    try {
      const validOrderBy = ['symbol', 'impact_index', 'updated_at'];
      const validDirection = ['ASC', 'DESC'];
      
      const orderColumn = validOrderBy.includes(orderBy) ? orderBy : 'impact_index';
      const direction = validDirection.includes(orderDirection.toUpperCase()) ? orderDirection.toUpperCase() : 'DESC';
      
      const query = `
        SELECT * FROM impact_index 
        ORDER BY ${orderColumn} ${direction}
        LIMIT $1 OFFSET $2
      `;
      const result = await client.query(query, [limit, offset]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  // Get impact index statistics
  static async getStatistics() {
    const client = await pool.connect();
    try {
      const query = `
        SELECT 
          COUNT(*) as total_symbols,
          COUNT(CASE WHEN impact_index > 0 THEN 1 END) as positive_impact,
          COUNT(CASE WHEN impact_index < 0 THEN 1 END) as negative_impact,
          COUNT(CASE WHEN impact_index = 0 THEN 1 END) as neutral_impact,
          MAX(impact_index) as max_impact,
          MIN(impact_index) as min_impact,
          AVG(impact_index) as avg_impact,
          STDDEV(impact_index) as stddev_impact,
          MAX(updated_at) as last_updated
        FROM impact_index
      `;
      const result = await client.query(query);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  // Get top impact symbols
  static async getTopImpact(limit = 20, type = 'positive', stockExchange = null) {
    const client = await pool.connect();
    try {
      let orderBy = 'impact_index DESC';
      let whereClause = '';
      let params = [limit];

      // Build where clause for impact type
      if (type === 'positive') {
        whereClause = 'WHERE i.impact_index > 0';
        orderBy = 'i.impact_index DESC';
      } else if (type === 'negative') {
        whereClause = 'WHERE i.impact_index < 0';
        orderBy = 'i.impact_index ASC';
      } else if (type === 'absolute') {
        orderBy = 'ABS(i.impact_index) DESC';
      }

      // Add stock exchange filter
      if (stockExchange) {
        if (whereClause) {
          whereClause += ' AND t.stock_exchange = $2';
        } else {
          whereClause = 'WHERE t.stock_exchange = $2';
        }
        params.push(stockExchange.toUpperCase());
      }

      const query = `
        SELECT
          i.symbol,
          i.impact_index,
          ABS(i.impact_index) as abs_impact,
          i.updated_at,
          t.stock_exchange,
          t.name_vi,
          t.price_close
        FROM impact_index i
        LEFT JOIN tickers t ON i.symbol = t.ticker
        ${whereClause}
        ORDER BY ${orderBy}
        LIMIT $1
      `;
      const result = await client.query(query, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  // Search symbols by impact range
  static async findByImpactRange(minImpact, maxImpact, limit = 100) {
    const client = await pool.connect();
    try {
      const query = `
        SELECT * FROM impact_index 
        WHERE impact_index >= $1 AND impact_index <= $2
        ORDER BY impact_index DESC
        LIMIT $3
      `;
      const result = await client.query(query, [minImpact, maxImpact, limit]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  // Get count for pagination
  static async getCount() {
    const client = await pool.connect();
    try {
      const query = 'SELECT COUNT(*) as count FROM impact_index';
      const result = await client.query(query);
      return parseInt(result.rows[0].count);
    } finally {
      client.release();
    }
  }

  // Delete old data (cleanup)
  static async deleteOldData(daysToKeep = 30) {
    const client = await pool.connect();
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      const query = `
        DELETE FROM impact_index 
        WHERE updated_at < $1
      `;
      const result = await client.query(query, [cutoffDate]);
      return result.rowCount;
    } finally {
      client.release();
    }
  }

  // Get symbols with highest volatility (frequent changes)
  static async getVolatileSymbols(limit = 20, stockExchange = null) {
    const client = await pool.connect();
    try {
      let whereClause = 'WHERE i.impact_index != 0';
      let params = [limit];

      if (stockExchange) {
        whereClause += ' AND t.stock_exchange = $2';
        params.push(stockExchange.toUpperCase());
      }

      const query = `
        SELECT
          i.symbol,
          i.impact_index,
          ABS(i.impact_index) as abs_impact,
          i.updated_at,
          t.stock_exchange,
          t.name_vi,
          t.price_close,
          CASE
            WHEN ABS(i.impact_index) > 0.1 THEN 'Very High'
            WHEN ABS(i.impact_index) > 0.05 THEN 'High'
            WHEN ABS(i.impact_index) > 0.01 THEN 'Medium'
            ELSE 'Low'
          END as volatility_level
        FROM impact_index i
        LEFT JOIN tickers t ON i.symbol = t.ticker
        ${whereClause}
        ORDER BY ABS(i.impact_index) DESC
        LIMIT $1
      `;
      const result = await client.query(query, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  // Get impact index statistics by stock exchange
  static async getStatisticsByExchange(stockExchange = null) {
    const client = await pool.connect();
    try {
      let whereClause = '';
      let params = [];

      if (stockExchange) {
        whereClause = 'WHERE t.stock_exchange = $1';
        params.push(stockExchange.toUpperCase());
      }

      const query = `
        SELECT
          COUNT(*) as total_symbols,
          COUNT(CASE WHEN i.impact_index > 0 THEN 1 END) as positive_impact,
          COUNT(CASE WHEN i.impact_index < 0 THEN 1 END) as negative_impact,
          COUNT(CASE WHEN i.impact_index = 0 THEN 1 END) as neutral_impact,
          MAX(i.impact_index) as max_impact,
          MIN(i.impact_index) as min_impact,
          AVG(i.impact_index) as avg_impact,
          STDDEV(i.impact_index) as stddev_impact,
          MAX(i.updated_at) as last_updated,
          ${stockExchange ? `'${stockExchange.toUpperCase()}'` : 'NULL'} as stock_exchange
        FROM impact_index i
        LEFT JOIN tickers t ON i.symbol = t.ticker
        ${whereClause}
      `;
      const result = await client.query(query, params);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  // Get all stock exchanges with impact data
  static async getAvailableExchanges() {
    const client = await pool.connect();
    try {
      const query = `
        SELECT
          t.stock_exchange,
          COUNT(*) as symbol_count,
          COUNT(CASE WHEN i.impact_index > 0 THEN 1 END) as positive_count,
          COUNT(CASE WHEN i.impact_index < 0 THEN 1 END) as negative_count,
          COUNT(CASE WHEN i.impact_index = 0 THEN 1 END) as neutral_count,
          AVG(i.impact_index) as avg_impact,
          MAX(ABS(i.impact_index)) as max_abs_impact
        FROM impact_index i
        LEFT JOIN tickers t ON i.symbol = t.ticker
        WHERE t.stock_exchange IS NOT NULL
        GROUP BY t.stock_exchange
        ORDER BY symbol_count DESC
      `;
      const result = await client.query(query);
      return result.rows;
    } finally {
      client.release();
    }
  }

  // Get impact index ranking within exchange
  static async getRankingByExchange(symbol, stockExchange) {
    const client = await pool.connect();
    try {
      const query = `
        WITH ranked_symbols AS (
          SELECT
            i.symbol,
            i.impact_index,
            ROW_NUMBER() OVER (ORDER BY i.impact_index DESC) as positive_rank,
            ROW_NUMBER() OVER (ORDER BY i.impact_index ASC) as negative_rank,
            ROW_NUMBER() OVER (ORDER BY ABS(i.impact_index) DESC) as absolute_rank,
            COUNT(*) OVER () as total_symbols
          FROM impact_index i
          LEFT JOIN tickers t ON i.symbol = t.ticker
          WHERE t.stock_exchange = $2
        )
        SELECT
          symbol,
          impact_index,
          positive_rank,
          negative_rank,
          absolute_rank,
          total_symbols,
          ROUND((positive_rank::decimal / total_symbols) * 100, 2) as positive_percentile,
          ROUND((negative_rank::decimal / total_symbols) * 100, 2) as negative_percentile,
          ROUND((absolute_rank::decimal / total_symbols) * 100, 2) as absolute_percentile
        FROM ranked_symbols
        WHERE symbol = $1
      `;
      const result = await client.query(query, [symbol.toUpperCase(), stockExchange.toUpperCase()]);
      return result.rows[0];
    } finally {
      client.release();
    }
  }
}

module.exports = ImpactIndex;
