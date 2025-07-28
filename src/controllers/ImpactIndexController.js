const ImpactIndex = require('../models/ImpactIndex');
const ImpactIndexService = require('../services/ImpactIndexService');
const { validationResult } = require('express-validator');

class ImpactIndexController {
  // Get impact index for a specific symbol
  static async getImpactIndex(req, res) {
    try {
      const { symbol } = req.params;

      if (!symbol) {
        return res.status(400).json({
          success: false,
          error: 'Symbol is required'
        });
      }

      const impactData = await ImpactIndex.findBySymbol(symbol.toUpperCase());

      if (!impactData) {
        return res.status(404).json({
          success: false,
          error: `No impact index data found for symbol ${symbol.toUpperCase()}`
        });
      }

      res.json({
        success: true,
        data: {
          symbol: impactData.symbol,
          impactIndex: parseFloat(impactData.impact_index),
          dataSource: impactData.data_source,
          sheetRange: impactData.sheet_range,
          lastUpdated: impactData.updated_at,
          classification: this.classifyImpact(parseFloat(impactData.impact_index))
        }
      });
    } catch (error) {
      console.error('Error getting impact index:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  // Get all impact index data with pagination
  static async getAllImpactIndex(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
      const offset = (page - 1) * limit;
      const orderBy = req.query.orderBy || 'impact_index';
      const orderDirection = req.query.orderDirection || 'DESC';

      const impactData = await ImpactIndex.findAll(limit, offset, orderBy, orderDirection);
      const totalCount = await ImpactIndex.getCount();
      const totalPages = Math.ceil(totalCount / limit);

      res.json({
        success: true,
        data: {
          impactIndex: impactData.map(item => ({
            symbol: item.symbol,
            impactIndex: parseFloat(item.impact_index),
            classification: this.classifyImpact(parseFloat(item.impact_index)),
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
      console.error('Error getting all impact index:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  // Get impact index statistics
  static async getStatistics(req, res) {
    try {
      const impactIndexService = new ImpactIndexService();
      const stats = await impactIndexService.getImpactStatistics();

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting impact index statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  // Get top impact symbols
  static async getTopImpact(req, res) {
    try {
      const limit = Math.min(parseInt(req.query.limit) || 20, 100);
      const type = req.query.type || 'positive'; // positive, negative, absolute
      const stockExchange = req.query.exchange; // HSX, HNX, UPCOM

      if (!['positive', 'negative', 'absolute'].includes(type)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid type. Must be: positive, negative, or absolute'
        });
      }

      const impactIndexService = new ImpactIndexService();
      const topSymbols = await impactIndexService.getTopImpactSymbols(limit, type, stockExchange);

      res.json({
        success: true,
        data: topSymbols
      });
    } catch (error) {
      console.error('Error getting top impact symbols:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  // Search by impact range
  static async searchByRange(req, res) {
    try {
      const { minImpact, maxImpact } = req.query;
      const limit = Math.min(parseInt(req.query.limit) || 100, 1000);

      if (minImpact === undefined || maxImpact === undefined) {
        return res.status(400).json({
          success: false,
          error: 'minImpact and maxImpact parameters are required'
        });
      }

      const min = parseFloat(minImpact);
      const max = parseFloat(maxImpact);

      if (isNaN(min) || isNaN(max)) {
        return res.status(400).json({
          success: false,
          error: 'minImpact and maxImpact must be valid numbers'
        });
      }

      if (min > max) {
        return res.status(400).json({
          success: false,
          error: 'minImpact cannot be greater than maxImpact'
        });
      }

      const impactIndexService = new ImpactIndexService();
      const results = await impactIndexService.searchByImpactRange(min, max, limit);

      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      console.error('Error searching by impact range:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  // Get volatile symbols
  static async getVolatileSymbols(req, res) {
    try {
      const limit = Math.min(parseInt(req.query.limit) || 20, 100);
      const stockExchange = req.query.exchange; // HSX, HNX, UPCOM

      const impactIndexService = new ImpactIndexService();
      const volatileSymbols = await impactIndexService.getVolatileSymbols(limit, stockExchange);

      res.json({
        success: true,
        data: volatileSymbols
      });
    } catch (error) {
      console.error('Error getting volatile symbols:', error);
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

      const impactIndexService = new ImpactIndexService();
      const stats = await impactIndexService.getStatisticsByExchange(exchange.toUpperCase());

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

  // Get available stock exchanges
  static async getAvailableExchanges(req, res) {
    try {
      const impactIndexService = new ImpactIndexService();
      const exchanges = await impactIndexService.getAvailableExchanges();

      res.json({
        success: true,
        data: exchanges
      });
    } catch (error) {
      console.error('Error getting available exchanges:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  // Get symbol ranking within exchange
  static async getSymbolRanking(req, res) {
    try {
      const { symbol, exchange } = req.params;

      if (!symbol || !exchange) {
        return res.status(400).json({
          success: false,
          error: 'Symbol and exchange are required'
        });
      }

      const impactIndexService = new ImpactIndexService();
      const ranking = await impactIndexService.getSymbolRanking(symbol.toUpperCase(), exchange.toUpperCase());

      if (!ranking) {
        return res.status(404).json({
          success: false,
          error: `No ranking data found for ${symbol.toUpperCase()} in ${exchange.toUpperCase()}`
        });
      }

      res.json({
        success: true,
        data: ranking
      });
    } catch (error) {
      console.error('Error getting symbol ranking:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  // Trigger manual impact index collection
  static async triggerCollection(req, res) {
    try {
      console.log('Manual impact index collection triggered via API');

      const impactIndexService = new ImpactIndexService();
      const result = await impactIndexService.fetchImpactIndexData();

      res.json({
        success: true,
        message: 'Impact index collection completed successfully',
        data: result
      });
    } catch (error) {
      console.error('Error during impact index collection:', error);
      res.status(500).json({
        success: false,
        error: 'Impact index collection failed',
        message: error.message
      });
    }
  }

  // Helper method to classify impact
  static classifyImpact(impactValue) {
    const absValue = Math.abs(impactValue);
    
    if (impactValue === 0) {
      return { level: 'Neutral', description: 'No impact' };
    } else if (absValue > 0.1) {
      return { 
        level: 'Very High', 
        description: impactValue > 0 ? 'Very positive impact' : 'Very negative impact',
        direction: impactValue > 0 ? 'positive' : 'negative'
      };
    } else if (absValue > 0.05) {
      return { 
        level: 'High', 
        description: impactValue > 0 ? 'High positive impact' : 'High negative impact',
        direction: impactValue > 0 ? 'positive' : 'negative'
      };
    } else if (absValue > 0.01) {
      return { 
        level: 'Medium', 
        description: impactValue > 0 ? 'Medium positive impact' : 'Medium negative impact',
        direction: impactValue > 0 ? 'positive' : 'negative'
      };
    } else {
      return { 
        level: 'Low', 
        description: impactValue > 0 ? 'Low positive impact' : 'Low negative impact',
        direction: impactValue > 0 ? 'positive' : 'negative'
      };
    }
  }
}

module.exports = ImpactIndexController;
