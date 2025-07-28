const HistoricalPrice = require('../models/HistoricalPrice');
const HistoricalPriceService = require('../services/HistoricalPriceService');
const { validationResult } = require('express-validator');

class HistoricalPriceController {
  // Get historical prices for a ticker
  static async getHistoricalPrices(req, res) {
    try {
      const { ticker } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
      const offset = (page - 1) * limit;

      if (!ticker) {
        return res.status(400).json({
          success: false,
          error: 'Ticker symbol is required'
        });
      }

      const prices = await HistoricalPrice.findByTicker(ticker.toUpperCase(), limit, offset);
      const totalCount = await HistoricalPrice.getCount(ticker.toUpperCase());
      const totalPages = Math.ceil(totalCount / limit);

      res.json({
        success: true,
        data: {
          ticker: ticker.toUpperCase(),
          prices,
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
      console.error('Error getting historical prices:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  // Get historical prices by date range
  static async getHistoricalPricesByDateRange(req, res) {
    try {
      const { ticker } = req.params;
      const { startDate, endDate } = req.query;

      if (!ticker) {
        return res.status(400).json({
          success: false,
          error: 'Ticker symbol is required'
        });
      }

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          error: 'Start date and end date are required'
        });
      }

      const prices = await HistoricalPrice.findByDateRange(
        ticker.toUpperCase(),
        new Date(startDate),
        new Date(endDate)
      );

      res.json({
        success: true,
        data: {
          ticker: ticker.toUpperCase(),
          startDate,
          endDate,
          count: prices.length,
          prices
        }
      });
    } catch (error) {
      console.error('Error getting historical prices by date range:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  // Get latest price for a ticker
  static async getLatestPrice(req, res) {
    try {
      const { ticker } = req.params;

      if (!ticker) {
        return res.status(400).json({
          success: false,
          error: 'Ticker symbol is required'
        });
      }

      const latestPrice = await HistoricalPrice.getLatestPrice(ticker.toUpperCase());

      if (!latestPrice) {
        return res.status(404).json({
          success: false,
          error: 'No price data found for this ticker'
        });
      }

      res.json({
        success: true,
        data: {
          ticker: ticker.toUpperCase(),
          latestPrice
        }
      });
    } catch (error) {
      console.error('Error getting latest price:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  // Get historical prices by time period
  static async getHistoricalPricesByPeriod(req, res) {
    try {
      const { ticker, period } = req.params;

      if (!ticker) {
        return res.status(400).json({
          success: false,
          error: 'Ticker symbol is required'
        });
      }

      // Define time periods
      const periods = {
        '1m': 30,      // 1 month = 30 days
        '3m': 90,      // 3 months = 90 days
        '6m': 180,     // 6 months = 180 days
        '1y': 365,     // 1 year = 365 days
        '5y': 1825,    // 5 years = 1825 days
        'all': null    // All available data
      };

      if (!periods.hasOwnProperty(period)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid period. Valid periods: 1m, 3m, 6m, 1y, 5y, all'
        });
      }

      let startDate = null;
      let endDate = new Date();

      if (period !== 'all') {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - periods[period]);
      }

      let prices;
      if (period === 'all') {
        // Get all data with pagination
        const limit = Math.min(parseInt(req.query.limit) || 1000, 5000);
        const offset = parseInt(req.query.offset) || 0;
        prices = await HistoricalPrice.findByTicker(ticker.toUpperCase(), limit, offset);
      } else {
        // Get data by date range
        prices = await HistoricalPrice.findByDateRange(ticker.toUpperCase(), startDate, endDate);
      }

      if (prices.length === 0) {
        return res.status(404).json({
          success: false,
          error: `No price data found for ${ticker.toUpperCase()} in the specified period`
        });
      }

      // Calculate period statistics
      const priceValues = prices.map(p => parseFloat(p.price_close)).filter(p => p > 0);
      const volumes = prices.map(p => parseInt(p.volume)).filter(v => v > 0);

      const statistics = {
        count: prices.length,
        period: period,
        periodDescription: HistoricalPriceController.getPeriodDescription(period),
        dateRange: {
          from: prices[prices.length - 1]?.date,
          to: prices[0]?.date
        },
        priceStats: priceValues.length > 0 ? {
          highest: Math.max(...priceValues),
          lowest: Math.min(...priceValues),
          average: priceValues.reduce((a, b) => a + b, 0) / priceValues.length,
          latest: priceValues[0],
          change: priceValues.length > 1 ? priceValues[0] - priceValues[priceValues.length - 1] : 0,
          changePercent: priceValues.length > 1 ?
            ((priceValues[0] - priceValues[priceValues.length - 1]) / priceValues[priceValues.length - 1] * 100) : 0
        } : null,
        volumeStats: volumes.length > 0 ? {
          highest: Math.max(...volumes),
          lowest: Math.min(...volumes),
          average: Math.round(volumes.reduce((a, b) => a + b, 0) / volumes.length),
          total: volumes.reduce((a, b) => a + b, 0)
        } : null
      };

      res.json({
        success: true,
        data: {
          ticker: ticker.toUpperCase(),
          period,
          statistics,
          prices: prices.map(price => ({
            date: price.date,
            priceClose: parseFloat(price.price_close),
            priceOpen: parseFloat(price.price_open),
            priceLow: parseFloat(price.price_low),
            priceHigh: parseFloat(price.price_high),
            netChange: parseFloat(price.net_change),
            pctChange: parseFloat(price.pct_change),
            volume: parseInt(price.volume),
            cfr: parseInt(price.cfr),
            bfq: parseInt(price.bfq),
            sfq: parseInt(price.sfq),
            fnbsq: parseInt(price.fnbsq),
            bfv: parseFloat(price.bfv),
            sfv: parseFloat(price.sfv),
            fnbsv: parseFloat(price.fnbsv),
            type: price.type
          }))
        }
      });
    } catch (error) {
      console.error('Error getting historical prices by period:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  // Helper method to get period description
  static getPeriodDescription(period) {
    const descriptions = {
      '1m': '1 Month',
      '3m': '3 Months',
      '6m': '6 Months',
      '1y': '1 Year',
      '5y': '5 Years',
      'all': 'All Available Data'
    };
    return descriptions[period] || 'Unknown Period';
  }

  // Get statistics for historical prices
  static async getStatistics(req, res) {
    try {
      const tickersWithData = await HistoricalPrice.getTickersWithData();
      const totalRecords = await HistoricalPrice.getCount();

      const statistics = {
        totalRecords,
        totalTickers: tickersWithData.length,
        tickersWithData: tickersWithData.map(ticker => ({
          ticker: ticker.ticker,
          recordsCount: parseInt(ticker.records_count),
          earliestDate: ticker.earliest_date,
          latestDate: ticker.latest_date,
          dateRange: {
            days: Math.ceil((new Date(ticker.latest_date) - new Date(ticker.earliest_date)) / (1000 * 60 * 60 * 24))
          }
        }))
      };

      res.json({
        success: true,
        data: statistics
      });
    } catch (error) {
      console.error('Error getting historical price statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  // Trigger manual historical price collection
  static async triggerHistoricalCollection(req, res) {
    try {
      const { ticker, pages } = req.body;

      if (!ticker) {
        return res.status(400).json({
          success: false,
          error: 'Ticker symbol is required'
        });
      }

      const historicalPriceService = new HistoricalPriceService();
      let result;

      if (pages === 'all') {
        // Fetch all historical data
        result = await historicalPriceService.fetchAllHistoricalPages(ticker.toUpperCase());
      } else {
        // Fetch recent data (default 5 records)
        const pageResult = await historicalPriceService.fetchHistoricalPrices(ticker.toUpperCase(), 0, 5);
        result = {
          ticker: ticker.toUpperCase(),
          totalPages: 1,
          totalSaved: pageResult.savedCount,
          results: [pageResult]
        };
      }

      res.json({
        success: true,
        message: `Historical price collection completed for ${ticker.toUpperCase()}`,
        data: result
      });
    } catch (error) {
      console.error('Error during historical price collection:', error);
      res.status(500).json({
        success: false,
        error: 'Historical price collection failed',
        message: error.message
      });
    }
  }

  // Trigger bulk historical price collection
  static async triggerBulkHistoricalCollection(req, res) {
    try {
      const { tickers, type = 'recent' } = req.body;

      if (!tickers || !Array.isArray(tickers)) {
        return res.status(400).json({
          success: false,
          error: 'Tickers array is required'
        });
      }

      const historicalPriceService = new HistoricalPriceService();
      let result;

      if (type === 'all') {
        // Fetch complete historical data for all tickers
        result = await historicalPriceService.fetchAllHistoricalData(tickers);
      } else {
        // Fetch recent data for all tickers
        result = await historicalPriceService.fetchRecentPrices(tickers, 5);
      }

      res.json({
        success: true,
        message: `Bulk historical price collection completed`,
        data: {
          type,
          totalTickers: tickers.length,
          successCount: result.success.length,
          failedCount: result.failed.length,
          results: result
        }
      });
    } catch (error) {
      console.error('Error during bulk historical price collection:', error);
      res.status(500).json({
        success: false,
        error: 'Bulk historical price collection failed',
        message: error.message
      });
    }
  }
}

module.exports = HistoricalPriceController;
