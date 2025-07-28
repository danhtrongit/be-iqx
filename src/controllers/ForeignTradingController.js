const ForeignTrading = require('../models/ForeignTrading');
const ForeignTradingService = require('../services/ForeignTradingService');
const { validationResult } = require('express-validator');

class ForeignTradingController {
  // Get foreign trading for a specific symbol
  static async getForeignTrading(req, res) {
    try {
      const { symbol } = req.params;

      if (!symbol) {
        return res.status(400).json({
          success: false,
          error: 'Symbol is required'
        });
      }

      const foreignData = await ForeignTrading.findBySymbol(symbol.toUpperCase());

      if (!foreignData) {
        return res.status(404).json({
          success: false,
          error: `No foreign trading data found for symbol ${symbol.toUpperCase()}`
        });
      }

      res.json({
        success: true,
        data: {
          symbol: foreignData.symbol,
          foreignBuyVolume: parseInt(foreignData.foreign_buy_volume),
          foreignBuyValue: parseInt(foreignData.foreign_buy_value),
          foreignSellVolume: parseInt(foreignData.foreign_sell_volume),
          foreignSellValue: parseInt(foreignData.foreign_sell_value),
          netValue: parseInt(foreignData.net_value),
          netVolume: parseInt(foreignData.net_volume),
          netPosition: foreignData.net_position,
          stockExchange: foreignData.stock_exchange,
          nameVi: foreignData.name_vi,
          priceClose: foreignData.price_close ? parseFloat(foreignData.price_close) : null,
          dataSource: foreignData.data_source,
          sheetRange: foreignData.sheet_range,
          lastUpdated: foreignData.updated_at,
          analysis: this.analyzeForeignTrading(foreignData)
        }
      });
    } catch (error) {
      console.error('Error getting foreign trading:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  // Get all foreign trading data with pagination
  static async getAllForeignTrading(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
      const offset = (page - 1) * limit;
      const orderBy = req.query.orderBy || 'net_value';
      const orderDirection = req.query.orderDirection || 'DESC';

      const foreignData = await ForeignTrading.findAll(limit, offset, orderBy, orderDirection);
      const totalCount = await ForeignTrading.getCount();
      const totalPages = Math.ceil(totalCount / limit);

      res.json({
        success: true,
        data: {
          foreignTrading: foreignData.map(item => ({
            symbol: item.symbol,
            foreignBuyVolume: parseInt(item.foreign_buy_volume),
            foreignBuyValue: parseInt(item.foreign_buy_value),
            foreignSellVolume: parseInt(item.foreign_sell_volume),
            foreignSellValue: parseInt(item.foreign_sell_value),
            netValue: parseInt(item.net_value),
            netVolume: parseInt(item.net_volume),
            netPosition: item.net_position,
            stockExchange: item.stock_exchange,
            nameVi: item.name_vi,
            priceClose: item.price_close ? parseFloat(item.price_close) : null,
            lastUpdated: item.updated_at
          })),
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
      console.error('Error getting all foreign trading:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  // Get foreign trading statistics
  static async getStatistics(req, res) {
    try {
      const foreignTradingService = new ForeignTradingService();
      const stats = await foreignTradingService.getForeignTradingStatistics();

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting foreign trading statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  // Get top net buyers
  static async getTopNetBuyers(req, res) {
    try {
      const limit = Math.min(parseInt(req.query.limit) || 20, 100);
      const stockExchange = req.query.exchange; // HSX, HNX, UPCOM

      const foreignTradingService = new ForeignTradingService();
      const topBuyers = await foreignTradingService.getTopNetBuyers(limit, stockExchange);

      res.json({
        success: true,
        data: topBuyers
      });
    } catch (error) {
      console.error('Error getting top net buyers:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  // Get top net sellers
  static async getTopNetSellers(req, res) {
    try {
      const limit = Math.min(parseInt(req.query.limit) || 20, 100);
      const stockExchange = req.query.exchange; // HSX, HNX, UPCOM

      const foreignTradingService = new ForeignTradingService();
      const topSellers = await foreignTradingService.getTopNetSellers(limit, stockExchange);

      res.json({
        success: true,
        data: topSellers
      });
    } catch (error) {
      console.error('Error getting top net sellers:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  // Search by value range
  static async searchByRange(req, res) {
    try {
      const { minValue, maxValue, type } = req.query;
      const limit = Math.min(parseInt(req.query.limit) || 100, 1000);

      if (minValue === undefined || maxValue === undefined) {
        return res.status(400).json({
          success: false,
          error: 'minValue and maxValue parameters are required'
        });
      }

      const min = parseInt(minValue);
      const max = parseInt(maxValue);

      if (isNaN(min) || isNaN(max)) {
        return res.status(400).json({
          success: false,
          error: 'minValue and maxValue must be valid numbers'
        });
      }

      if (min > max) {
        return res.status(400).json({
          success: false,
          error: 'minValue cannot be greater than maxValue'
        });
      }

      const validTypes = ['net', 'buy', 'sell'];
      const searchType = validTypes.includes(type) ? type : 'net';

      const foreignTradingService = new ForeignTradingService();
      const results = await foreignTradingService.searchByValueRange(min, max, searchType, limit);

      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      console.error('Error searching by value range:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  // Get statistics by stock exchange
  static async getStatisticsByExchange(req, res) {
    try {
      const { exchange } = req.params;

      if (!exchange) {
        return res.status(400).json({
          success: false,
          error: 'Stock exchange is required'
        });
      }

      const foreignTradingService = new ForeignTradingService();
      const stats = await foreignTradingService.getStatisticsByExchange(exchange.toUpperCase());

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting statistics by exchange:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  // Trigger manual foreign trading collection
  static async triggerCollection(req, res) {
    try {
      console.log('Manual foreign trading collection triggered via API');
      
      const foreignTradingService = new ForeignTradingService();
      const result = await foreignTradingService.fetchForeignTradingData();

      res.json({
        success: true,
        message: 'Foreign trading collection completed successfully',
        data: result
      });
    } catch (error) {
      console.error('Error during foreign trading collection:', error);
      res.status(500).json({
        success: false,
        error: 'Foreign trading collection failed',
        message: error.message
      });
    }
  }

  // Helper method to analyze foreign trading
  static analyzeForeignTrading(data) {
    const netValue = parseInt(data.net_value);
    const netVolume = parseInt(data.net_volume);
    const buyValue = parseInt(data.foreign_buy_value);
    const sellValue = parseInt(data.foreign_sell_value);
    
    let intensity = 'Low';
    const totalValue = buyValue + sellValue;
    
    if (totalValue > 10000000000) { // > 10 billion VND
      intensity = 'Very High';
    } else if (totalValue > 1000000000) { // > 1 billion VND
      intensity = 'High';
    } else if (totalValue > 100000000) { // > 100 million VND
      intensity = 'Medium';
    }
    
    let sentiment = 'Neutral';
    if (netValue > 0) {
      sentiment = 'Bullish (Net Buy)';
    } else if (netValue < 0) {
      sentiment = 'Bearish (Net Sell)';
    }
    
    return {
      sentiment,
      intensity,
      netValueFormatted: this.formatCurrency(netValue),
      totalValueFormatted: this.formatCurrency(totalValue),
      buyRatio: totalValue > 0 ? parseFloat(((buyValue / totalValue) * 100).toFixed(2)) : 0,
      sellRatio: totalValue > 0 ? parseFloat(((sellValue / totalValue) * 100).toFixed(2)) : 0
    };
  }

  // Helper method to format currency
  static formatCurrency(value) {
    if (Math.abs(value) >= 1000000000) {
      return `${(value / 1000000000).toFixed(2)}B VND`;
    } else if (Math.abs(value) >= 1000000) {
      return `${(value / 1000000).toFixed(2)}M VND`;
    } else if (Math.abs(value) >= 1000) {
      return `${(value / 1000).toFixed(2)}K VND`;
    } else {
      return `${value} VND`;
    }
  }
}

module.exports = ForeignTradingController;
