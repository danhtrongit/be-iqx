const { pool } = require('../config/database');

class TechnicalAnalysis {
  // Create or update technical analysis data
  static async createOrUpdate(technicalData) {
    const client = await pool.connect();
    try {
      const query = `
        INSERT INTO technical_analysis (
          ticker, time_frame, server_date_time,
          gauge_moving_average_rating, gauge_moving_average_values,
          gauge_oscillator_rating, gauge_oscillator_values,
          gauge_summary_rating, gauge_summary_values,
          pivot_point, resistance1, resistance2, resistance3,
          support1, support2, support3,
          fib_resistance1, fib_resistance2, fib_resistance3,
          fib_support1, fib_support2, fib_support3
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
        )
        ON CONFLICT (ticker, time_frame) DO UPDATE SET
          server_date_time = EXCLUDED.server_date_time,
          gauge_moving_average_rating = EXCLUDED.gauge_moving_average_rating,
          gauge_moving_average_values = EXCLUDED.gauge_moving_average_values,
          gauge_oscillator_rating = EXCLUDED.gauge_oscillator_rating,
          gauge_oscillator_values = EXCLUDED.gauge_oscillator_values,
          gauge_summary_rating = EXCLUDED.gauge_summary_rating,
          gauge_summary_values = EXCLUDED.gauge_summary_values,
          pivot_point = EXCLUDED.pivot_point,
          resistance1 = EXCLUDED.resistance1,
          resistance2 = EXCLUDED.resistance2,
          resistance3 = EXCLUDED.resistance3,
          support1 = EXCLUDED.support1,
          support2 = EXCLUDED.support2,
          support3 = EXCLUDED.support3,
          fib_resistance1 = EXCLUDED.fib_resistance1,
          fib_resistance2 = EXCLUDED.fib_resistance2,
          fib_resistance3 = EXCLUDED.fib_resistance3,
          fib_support1 = EXCLUDED.fib_support1,
          fib_support2 = EXCLUDED.fib_support2,
          fib_support3 = EXCLUDED.fib_support3,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *;
      `;

      const values = [
        technicalData.ticker,
        technicalData.timeFrame,
        technicalData.serverDateTime,
        technicalData.gaugeMovingAverage?.rating || null,
        JSON.stringify(technicalData.gaugeMovingAverage?.values || {}),
        technicalData.gaugeOscillator?.rating || null,
        JSON.stringify(technicalData.gaugeOscillator?.values || {}),
        technicalData.gaugeSummary?.rating || null,
        JSON.stringify(technicalData.gaugeSummary?.values || {}),
        technicalData.pivot?.pivotPoint || null,
        technicalData.pivot?.resistance1 || null,
        technicalData.pivot?.resistance2 || null,
        technicalData.pivot?.resistance3 || null,
        technicalData.pivot?.support1 || null,
        technicalData.pivot?.support2 || null,
        technicalData.pivot?.support3 || null,
        technicalData.pivot?.fibResistance1 || null,
        technicalData.pivot?.fibResistance2 || null,
        technicalData.pivot?.fibResistance3 || null,
        technicalData.pivot?.fibSupport1 || null,
        technicalData.pivot?.fibSupport2 || null,
        technicalData.pivot?.fibSupport3 || null
      ];

      const result = await client.query(query, values);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  // Create moving averages
  static async createMovingAverages(ticker, timeFrame, movingAverages) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Delete existing moving averages for this ticker and timeframe
      await client.query(
        'DELETE FROM technical_moving_averages WHERE ticker = $1 AND time_frame = $2',
        [ticker, timeFrame]
      );

      // Insert new moving averages
      const results = [];
      for (const ma of movingAverages) {
        const query = `
          INSERT INTO technical_moving_averages (
            ticker, time_frame, name, value, rating
          ) VALUES ($1, $2, $3, $4, $5)
          RETURNING *;
        `;
        
        const result = await client.query(query, [
          ticker, timeFrame, ma.name, ma.value, ma.rating
        ]);
        results.push(result.rows[0]);
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

  // Create oscillators
  static async createOscillators(ticker, timeFrame, oscillators) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Delete existing oscillators for this ticker and timeframe
      await client.query(
        'DELETE FROM technical_oscillators WHERE ticker = $1 AND time_frame = $2',
        [ticker, timeFrame]
      );

      // Insert new oscillators
      const results = [];
      for (const osc of oscillators) {
        const query = `
          INSERT INTO technical_oscillators (
            ticker, time_frame, name, value, rating
          ) VALUES ($1, $2, $3, $4, $5)
          RETURNING *;
        `;
        
        const result = await client.query(query, [
          ticker, timeFrame, osc.name, osc.value, osc.rating
        ]);
        results.push(result.rows[0]);
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

  // Get technical analysis by ticker and timeframe
  static async findByTickerAndTimeFrame(ticker, timeFrame) {
    const client = await pool.connect();
    try {
      const query = `
        SELECT * FROM technical_analysis 
        WHERE ticker = $1 AND time_frame = $2
      `;
      const result = await client.query(query, [ticker, timeFrame]);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  // Get all technical analysis for a ticker
  static async findByTicker(ticker) {
    const client = await pool.connect();
    try {
      const query = `
        SELECT * FROM technical_analysis 
        WHERE ticker = $1 
        ORDER BY time_frame
      `;
      const result = await client.query(query, [ticker]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  // Get moving averages
  static async getMovingAverages(ticker, timeFrame) {
    const client = await pool.connect();
    try {
      const query = `
        SELECT * FROM technical_moving_averages 
        WHERE ticker = $1 AND time_frame = $2
        ORDER BY name
      `;
      const result = await client.query(query, [ticker, timeFrame]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  // Get oscillators
  static async getOscillators(ticker, timeFrame) {
    const client = await pool.connect();
    try {
      const query = `
        SELECT * FROM technical_oscillators 
        WHERE ticker = $1 AND time_frame = $2
        ORDER BY name
      `;
      const result = await client.query(query, [ticker, timeFrame]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  // Get statistics
  static async getStatistics() {
    const client = await pool.connect();
    try {
      const query = `
        SELECT 
          COUNT(DISTINCT ticker) as total_tickers,
          COUNT(*) as total_records,
          COUNT(CASE WHEN time_frame = 'ONE_HOUR' THEN 1 END) as one_hour_records,
          COUNT(CASE WHEN time_frame = 'ONE_DAY' THEN 1 END) as one_day_records,
          COUNT(CASE WHEN time_frame = 'ONE_WEEK' THEN 1 END) as one_week_records,
          (SELECT COUNT(*) FROM technical_moving_averages) as total_moving_averages,
          (SELECT COUNT(*) FROM technical_oscillators) as total_oscillators
        FROM technical_analysis
      `;
      const result = await client.query(query);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  // Get tickers with technical data
  static async getTickersWithData() {
    const client = await pool.connect();
    try {
      const query = `
        SELECT 
          ticker,
          COUNT(*) as timeframes_count,
          array_agg(time_frame ORDER BY time_frame) as timeframes,
          MAX(updated_at) as last_updated
        FROM technical_analysis 
        GROUP BY ticker
        ORDER BY ticker
      `;
      const result = await client.query(query);
      return result.rows;
    } finally {
      client.release();
    }
  }
}

module.exports = TechnicalAnalysis;
