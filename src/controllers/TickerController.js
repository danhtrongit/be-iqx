const Ticker = require('../models/Ticker');
const DataCollectionLog = require('../models/DataCollectionLog');
const { validationResult } = require('express-validator');

class TickerController {
  // Get all tickers with pagination
  static async getAllTickers(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 50, 100); // Max 100 per page
      const offset = (page - 1) * limit;

      const tickers = await Ticker.findAll(limit, offset);
      const totalCount = await Ticker.getCount();
      const totalPages = Math.ceil(totalCount / limit);

      res.json({
        success: true,
        data: {
          tickers,
          pagination: {
            currentPage: page,
            totalPages,
            totalCount,
            limit,
            hasNext: page < totalPages,
            hasPrev: page > 1
          }
        }
      });
    } catch (error) {
      console.error('Error getting all tickers:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  // Get ticker by symbol
  static async getTickerBySymbol(req, res) {
    try {
      const { ticker } = req.params;
      
      if (!ticker) {
        return res.status(400).json({
          success: false,
          error: 'Ticker symbol is required'
        });
      }

      const tickerData = await Ticker.findByTicker(ticker.toUpperCase());
      
      if (!tickerData) {
        return res.status(404).json({
          success: false,
          error: 'Ticker not found'
        });
      }

      res.json({
        success: true,
        data: tickerData
      });
    } catch (error) {
      console.error('Error getting ticker:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  // Search tickers by various criteria
  static async searchTickers(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: errors.array()
        });
      }

      const {
        query,
        exchange,
        sector,
        industry,
        minPrice,
        maxPrice,
        minMarketCap,
        maxMarketCap,
        sortBy = 'ticker',
        sortOrder = 'asc',
        page = 1,
        limit = 50
      } = req.query;

      // This is a simplified search - in production, you'd want to use full-text search
      // or a proper search engine like Elasticsearch
      let whereConditions = [];
      let values = [];
      let paramIndex = 1;

      // Biến để lưu query search cho việc sắp xếp ưu tiên
      let searchQuery = null;
      if (query) {
        searchQuery = query.trim().toUpperCase();
        whereConditions.push(`(ticker ILIKE $${paramIndex} OR name_vi ILIKE $${paramIndex} OR name_en ILIKE $${paramIndex})`);
        values.push(`%${query}%`);
        paramIndex++;
      }

      if (exchange) {
        whereConditions.push(`stock_exchange = $${paramIndex}`);
        values.push(exchange.toUpperCase());
        paramIndex++;
      }

      if (sector) {
        whereConditions.push(`bc_economic_sector_slug = $${paramIndex}`);
        values.push(sector);
        paramIndex++;
      }

      if (industry) {
        whereConditions.push(`bc_industry_group_slug = $${paramIndex}`);
        values.push(industry);
        paramIndex++;
      }

      if (minPrice) {
        whereConditions.push(`price_close >= $${paramIndex}`);
        values.push(parseFloat(minPrice));
        paramIndex++;
      }

      if (maxPrice) {
        whereConditions.push(`price_close <= $${paramIndex}`);
        values.push(parseFloat(maxPrice));
        paramIndex++;
      }

      if (minMarketCap) {
        whereConditions.push(`market_cap >= $${paramIndex}`);
        values.push(parseInt(minMarketCap));
        paramIndex++;
      }

      if (maxMarketCap) {
        whereConditions.push(`market_cap <= $${paramIndex}`);
        values.push(parseInt(maxMarketCap));
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Tạo ORDER BY clause với ưu tiên cho ticker match
      let orderClause;
      let searchOrderParams = [];

      if (searchQuery && sortBy === 'ticker') {
        // Ưu tiên: exact match ticker -> starts with ticker -> contains ticker -> other fields -> sort by specified field
        orderClause = `ORDER BY
          CASE
            WHEN UPPER(ticker) = $${paramIndex} THEN 1
            WHEN UPPER(ticker) LIKE $${paramIndex + 1} THEN 2
            WHEN UPPER(ticker) LIKE $${paramIndex + 2} THEN 3
            WHEN UPPER(name_vi) LIKE $${paramIndex + 3} THEN 4
            WHEN UPPER(name_en) LIKE $${paramIndex + 4} THEN 5
            ELSE 6
          END,
          ${sortBy} ${sortOrder.toUpperCase()}`;

        searchOrderParams = [
          searchQuery,                    // exact match
          `${searchQuery}%`,             // starts with
          `%${searchQuery}%`,            // contains
          `%${searchQuery.toUpperCase()}%`,  // name_vi contains
          `%${searchQuery.toUpperCase()}%`   // name_en contains
        ];
        paramIndex += 5;

      } else if (searchQuery) {
        // Nếu có search query nhưng sort theo field khác, vẫn ưu tiên ticker match trước
        orderClause = `ORDER BY
          CASE
            WHEN UPPER(ticker) = $${paramIndex} THEN 1
            WHEN UPPER(ticker) LIKE $${paramIndex + 1} THEN 2
            WHEN UPPER(ticker) LIKE $${paramIndex + 2} THEN 3
            ELSE 4
          END,
          ${sortBy} ${sortOrder.toUpperCase()}`;

        searchOrderParams = [
          searchQuery,        // exact match
          `${searchQuery}%`,  // starts with
          `%${searchQuery}%`  // contains
        ];
        paramIndex += 3;

      } else {
        // Không có search query, sort bình thường
        orderClause = `ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;
      }

      const limitValue = Math.min(parseInt(limit), 100);
      const offsetValue = (parseInt(page) - 1) * limitValue;

      const { pool } = require('../config/database');
      const client = await pool.connect();

      try {
        // Get total count
        const countQuery = `SELECT COUNT(*) as count FROM tickers ${whereClause}`;
        const countResult = await client.query(countQuery, values);
        const totalCount = parseInt(countResult.rows[0].count);

        // Prepare values for data query (bao gồm search order params)
        const dataQueryValues = [...values, ...searchOrderParams, limitValue, offsetValue];

        // Get data
        const dataQuery = `
          SELECT * FROM tickers
          ${whereClause}
          ${orderClause}
          LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        const dataResult = await client.query(dataQuery, dataQueryValues);
        const totalPages = Math.ceil(totalCount / limitValue);

        res.json({
          success: true,
          data: {
            tickers: dataResult.rows,
            pagination: {
              currentPage: parseInt(page),
              totalPages,
              totalCount,
              limit: limitValue,
              hasNext: parseInt(page) < totalPages,
              hasPrev: parseInt(page) > 1
            },
            searchCriteria: {
              query,
              exchange,
              sector,
              industry,
              priceRange: { min: minPrice, max: maxPrice },
              marketCapRange: { min: minMarketCap, max: maxMarketCap },
              sortBy,
              sortOrder
            }
          }
        });
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error searching tickers:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  // Get ticker statistics
  static async getStatistics(req, res) {
    try {
      const { pool } = require('../config/database');
      const client = await pool.connect();

      try {
        // Get basic statistics
        const statsQuery = `
          SELECT 
            COUNT(*) as total_tickers,
            COUNT(DISTINCT stock_exchange) as total_exchanges,
            COUNT(DISTINCT bc_economic_sector_name) as total_sectors,
            COUNT(DISTINCT bc_industry_group_name) as total_industries,
            AVG(price_close) as avg_price,
            SUM(market_cap) as total_market_cap,
            COUNT(CASE WHEN image_url IS NOT NULL THEN 1 END) as tickers_with_images,
            MAX(updated_at) as last_updated
          FROM tickers
        `;
        
        const statsResult = await client.query(statsQuery);
        const stats = statsResult.rows[0];

        // Get exchange breakdown
        const exchangeQuery = `
          SELECT 
            stock_exchange,
            COUNT(*) as count,
            AVG(price_close) as avg_price,
            SUM(market_cap) as total_market_cap
          FROM tickers 
          WHERE stock_exchange IS NOT NULL
          GROUP BY stock_exchange
          ORDER BY count DESC
        `;
        
        const exchangeResult = await client.query(exchangeQuery);

        // Get sector breakdown
        const sectorQuery = `
          SELECT 
            bc_economic_sector_name as sector,
            COUNT(*) as count,
            AVG(price_close) as avg_price
          FROM tickers 
          WHERE bc_economic_sector_name IS NOT NULL
          GROUP BY bc_economic_sector_name
          ORDER BY count DESC
          LIMIT 10
        `;
        
        const sectorResult = await client.query(sectorQuery);

        res.json({
          success: true,
          data: {
            overview: {
              totalTickers: parseInt(stats.total_tickers),
              totalExchanges: parseInt(stats.total_exchanges),
              totalSectors: parseInt(stats.total_sectors),
              totalIndustries: parseInt(stats.total_industries),
              averagePrice: parseFloat(stats.avg_price || 0).toFixed(2),
              totalMarketCap: parseInt(stats.total_market_cap || 0),
              tickersWithImages: parseInt(stats.tickers_with_images),
              lastUpdated: stats.last_updated
            },
            exchanges: exchangeResult.rows.map(row => ({
              exchange: row.stock_exchange,
              count: parseInt(row.count),
              averagePrice: parseFloat(row.avg_price || 0).toFixed(2),
              totalMarketCap: parseInt(row.total_market_cap || 0)
            })),
            topSectors: sectorResult.rows.map(row => ({
              sector: row.sector,
              count: parseInt(row.count),
              averagePrice: parseFloat(row.avg_price || 0).toFixed(2)
            }))
          }
        });
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error getting statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  // Get data collection logs
  static async getCollectionLogs(req, res) {
    try {
      const { ticker } = req.query;
      const limit = Math.min(parseInt(req.query.limit) || 50, 100);

      let logs;
      if (ticker) {
        logs = await DataCollectionLog.findByTicker(ticker.toUpperCase(), limit);
      } else {
        logs = await DataCollectionLog.getRecentLogs(limit);
      }

      res.json({
        success: true,
        data: {
          logs,
          filter: ticker ? { ticker: ticker.toUpperCase() } : null
        }
      });
    } catch (error) {
      console.error('Error getting collection logs:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  // Get collection statistics
  static async getCollectionStatistics(req, res) {
    try {
      const stats = await DataCollectionLog.getStatistics();
      
      res.json({
        success: true,
        data: {
          statistics: stats
        }
      });
    } catch (error) {
      console.error('Error getting collection statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }
}

module.exports = TickerController;
