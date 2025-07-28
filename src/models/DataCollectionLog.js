const { pool } = require('../config/database');

class DataCollectionLog {
  static async create(ticker, status, errorMessage = null, retryCount = 0) {
    const client = await pool.connect();
    try {
      const query = `
        INSERT INTO data_collection_logs (ticker, status, error_message, retry_count)
        VALUES ($1, $2, $3, $4)
        RETURNING *;
      `;
      const values = [ticker, status, errorMessage, retryCount];
      const result = await client.query(query, values);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  static async findByTicker(ticker, limit = 10) {
    const client = await pool.connect();
    try {
      const query = `
        SELECT * FROM data_collection_logs 
        WHERE ticker = $1 
        ORDER BY created_at DESC 
        LIMIT $2
      `;
      const result = await client.query(query, [ticker, limit]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  static async getRecentLogs(limit = 100) {
    const client = await pool.connect();
    try {
      const query = `
        SELECT * FROM data_collection_logs 
        ORDER BY created_at DESC 
        LIMIT $1
      `;
      const result = await client.query(query, [limit]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  static async getStatistics() {
    const client = await pool.connect();
    try {
      const query = `
        SELECT 
          status,
          COUNT(*) as count,
          DATE(created_at) as date
        FROM data_collection_logs 
        WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY status, DATE(created_at)
        ORDER BY date DESC, status
      `;
      const result = await client.query(query);
      return result.rows;
    } finally {
      client.release();
    }
  }
}

module.exports = DataCollectionLog;
