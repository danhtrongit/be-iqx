const { pool } = require('../config/database');

class ForeignTrading {
  // Create or update foreign trading data
  static async createOrUpdate(foreignData) {
    const client = await pool.connect();
    try {
      const query = `
        INSERT INTO foreign_trading (
          symbol, foreign_buy_volume, foreign_buy_value, 
          foreign_sell_volume, foreign_sell_value, data_source, sheet_range
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7
        )
        ON CONFLICT (symbol) DO UPDATE SET
          foreign_buy_volume = EXCLUDED.foreign_buy_volume,
          foreign_buy_value = EXCLUDED.foreign_buy_value,
          foreign_sell_volume = EXCLUDED.foreign_sell_volume,
          foreign_sell_value = EXCLUDED.foreign_sell_value,
          data_source = EXCLUDED.data_source,
          sheet_range = EXCLUDED.sheet_range,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *;
      `;

      const values = [
        foreignData.symbol,
        foreignData.foreignBuyVolume,
        foreignData.foreignBuyValue,
        foreignData.foreignSellVolume,
        foreignData.foreignSellValue,
        foreignData.dataSource || 'google_sheets',
        foreignData.sheetRange || 'ChartMuaBan!A1:Z1605'
      ];

      const result = await client.query(query, values);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  // Bulk create or update
  static async bulkCreateOrUpdate(foreignDataArray) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const results = [];
      for (const foreignData of foreignDataArray) {
        const result = await this.createOrUpdate(foreignData);
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

  // Get foreign trading by symbol
  static async findBySymbol(symbol) {
    const client = await pool.connect();
    try {
      const query = `
        SELECT 
          f.*,
          t.name_vi,
          t.stock_exchange,
          t.price_close,
          CASE 
            WHEN f.foreign_buy_value > f.foreign_sell_value THEN 'NET_BUY'
            WHEN f.foreign_sell_value > f.foreign_buy_value THEN 'NET_SELL'
            ELSE 'NEUTRAL'
          END as net_position,
          (f.foreign_buy_value - f.foreign_sell_value) as net_value,
          (f.foreign_buy_volume - f.foreign_sell_volume) as net_volume
        FROM foreign_trading f
        LEFT JOIN tickers t ON f.symbol = t.ticker
        WHERE f.symbol = $1
      `;
      const result = await client.query(query, [symbol.toUpperCase()]);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  // Get all foreign trading data with pagination
  static async findAll(limit = 100, offset = 0, orderBy = 'net_value', orderDirection = 'DESC') {
    const client = await pool.connect();
    try {
      const validOrderBy = ['symbol', 'foreign_buy_value', 'foreign_sell_value', 'net_value', 'net_volume', 'updated_at'];
      const validDirection = ['ASC', 'DESC'];
      
      const orderColumn = validOrderBy.includes(orderBy) ? orderBy : 'net_value';
      const direction = validDirection.includes(orderDirection.toUpperCase()) ? orderDirection.toUpperCase() : 'DESC';
      
      let orderClause = '';
      if (orderColumn === 'net_value') {
        orderClause = `ORDER BY (foreign_buy_value - foreign_sell_value) ${direction}`;
      } else if (orderColumn === 'net_volume') {
        orderClause = `ORDER BY (foreign_buy_volume - foreign_sell_volume) ${direction}`;
      } else {
        orderClause = `ORDER BY ${orderColumn} ${direction}`;
      }
      
      const query = `
        SELECT 
          f.*,
          t.name_vi,
          t.stock_exchange,
          t.price_close,
          CASE 
            WHEN f.foreign_buy_value > f.foreign_sell_value THEN 'NET_BUY'
            WHEN f.foreign_sell_value > f.foreign_buy_value THEN 'NET_SELL'
            ELSE 'NEUTRAL'
          END as net_position,
          (f.foreign_buy_value - f.foreign_sell_value) as net_value,
          (f.foreign_buy_volume - f.foreign_sell_volume) as net_volume
        FROM foreign_trading f
        LEFT JOIN tickers t ON f.symbol = t.ticker
        ${orderClause}
        LIMIT $1 OFFSET $2
      `;
      const result = await client.query(query, [limit, offset]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  // Get foreign trading statistics
  static async getStatistics() {
    const client = await pool.connect();
    try {
      const query = `
        SELECT 
          COUNT(*) as total_symbols,
          COUNT(CASE WHEN foreign_buy_value > foreign_sell_value THEN 1 END) as net_buy_symbols,
          COUNT(CASE WHEN foreign_sell_value > foreign_buy_value THEN 1 END) as net_sell_symbols,
          COUNT(CASE WHEN foreign_buy_value = foreign_sell_value THEN 1 END) as neutral_symbols,
          SUM(foreign_buy_value) as total_buy_value,
          SUM(foreign_sell_value) as total_sell_value,
          SUM(foreign_buy_volume) as total_buy_volume,
          SUM(foreign_sell_volume) as total_sell_volume,
          SUM(foreign_buy_value - foreign_sell_value) as total_net_value,
          SUM(foreign_buy_volume - foreign_sell_volume) as total_net_volume,
          AVG(foreign_buy_value) as avg_buy_value,
          AVG(foreign_sell_value) as avg_sell_value,
          MAX(foreign_buy_value) as max_buy_value,
          MAX(foreign_sell_value) as max_sell_value,
          MAX(updated_at) as last_updated
        FROM foreign_trading
      `;
      const result = await client.query(query);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  // Get top net buyers
  static async getTopNetBuyers(limit = 20, stockExchange = null) {
    const client = await pool.connect();
    try {
      let whereClause = 'WHERE f.foreign_buy_value > f.foreign_sell_value';
      let params = [limit];
      
      if (stockExchange) {
        whereClause += ' AND t.stock_exchange = $2';
        params.push(stockExchange.toUpperCase());
      }
      
      const query = `
        SELECT 
          f.symbol,
          f.foreign_buy_volume,
          f.foreign_buy_value,
          f.foreign_sell_volume,
          f.foreign_sell_value,
          (f.foreign_buy_value - f.foreign_sell_value) as net_value,
          (f.foreign_buy_volume - f.foreign_sell_volume) as net_volume,
          t.name_vi,
          t.stock_exchange,
          t.price_close,
          f.updated_at
        FROM foreign_trading f
        LEFT JOIN tickers t ON f.symbol = t.ticker
        ${whereClause}
        ORDER BY (f.foreign_buy_value - f.foreign_sell_value) DESC
        LIMIT $1
      `;
      const result = await client.query(query, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  // Get top net sellers
  static async getTopNetSellers(limit = 20, stockExchange = null) {
    const client = await pool.connect();
    try {
      let whereClause = 'WHERE f.foreign_sell_value > f.foreign_buy_value';
      let params = [limit];
      
      if (stockExchange) {
        whereClause += ' AND t.stock_exchange = $2';
        params.push(stockExchange.toUpperCase());
      }
      
      const query = `
        SELECT 
          f.symbol,
          f.foreign_buy_volume,
          f.foreign_buy_value,
          f.foreign_sell_volume,
          f.foreign_sell_value,
          (f.foreign_sell_value - f.foreign_buy_value) as net_sell_value,
          (f.foreign_sell_volume - f.foreign_buy_volume) as net_sell_volume,
          t.name_vi,
          t.stock_exchange,
          t.price_close,
          f.updated_at
        FROM foreign_trading f
        LEFT JOIN tickers t ON f.symbol = t.ticker
        ${whereClause}
        ORDER BY (f.foreign_sell_value - f.foreign_buy_value) DESC
        LIMIT $1
      `;
      const result = await client.query(query, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  // Get statistics by stock exchange
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
          COUNT(CASE WHEN f.foreign_buy_value > f.foreign_sell_value THEN 1 END) as net_buy_symbols,
          COUNT(CASE WHEN f.foreign_sell_value > f.foreign_buy_value THEN 1 END) as net_sell_symbols,
          COUNT(CASE WHEN f.foreign_buy_value = f.foreign_sell_value THEN 1 END) as neutral_symbols,
          SUM(f.foreign_buy_value) as total_buy_value,
          SUM(f.foreign_sell_value) as total_sell_value,
          SUM(f.foreign_buy_value - f.foreign_sell_value) as total_net_value,
          AVG(f.foreign_buy_value) as avg_buy_value,
          AVG(f.foreign_sell_value) as avg_sell_value,
          MAX(f.updated_at) as last_updated,
          ${stockExchange ? `'${stockExchange.toUpperCase()}'` : 'NULL'} as stock_exchange
        FROM foreign_trading f
        LEFT JOIN tickers t ON f.symbol = t.ticker
        ${whereClause}
      `;
      const result = await client.query(query, params);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  // Get count for pagination
  static async getCount() {
    const client = await pool.connect();
    try {
      const query = 'SELECT COUNT(*) as count FROM foreign_trading';
      const result = await client.query(query);
      return parseInt(result.rows[0].count);
    } finally {
      client.release();
    }
  }

  // Search by value range
  static async findByValueRange(minValue, maxValue, type = 'net', limit = 100) {
    const client = await pool.connect();
    try {
      let valueColumn = '';
      if (type === 'buy') {
        valueColumn = 'f.foreign_buy_value';
      } else if (type === 'sell') {
        valueColumn = 'f.foreign_sell_value';
      } else {
        valueColumn = '(f.foreign_buy_value - f.foreign_sell_value)';
      }
      
      const query = `
        SELECT 
          f.*,
          t.name_vi,
          t.stock_exchange,
          t.price_close,
          (f.foreign_buy_value - f.foreign_sell_value) as net_value,
          (f.foreign_buy_volume - f.foreign_sell_volume) as net_volume
        FROM foreign_trading f
        LEFT JOIN tickers t ON f.symbol = t.ticker
        WHERE ${valueColumn} >= $1 AND ${valueColumn} <= $2
        ORDER BY ${valueColumn} DESC
        LIMIT $3
      `;
      const result = await client.query(query, [minValue, maxValue, limit]);
      return result.rows;
    } finally {
      client.release();
    }
  }
}

module.exports = ForeignTrading;
