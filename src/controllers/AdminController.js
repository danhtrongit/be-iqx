const SchedulerService = require('../services/SchedulerService');
const SimplizeApiService = require('../services/SimplizeApiService');

class AdminController {
  constructor() {
    this.schedulerService = new SchedulerService();
  }

  // Manual data collection trigger
  static async triggerDataCollection(req, res) {
    try {
      const schedulerService = new SchedulerService();

      console.log('Manual data collection triggered via API');
      const result = await schedulerService.triggerManualCollection();

      res.json({
        success: true,
        message: 'Data collection completed successfully',
        data: result
      });
    } catch (error) {
      console.error('Error during manual data collection:', error);
      res.status(500).json({
        success: false,
        error: 'Data collection failed',
        message: error.message
      });
    }
  }



  // Get scheduler status
  static async getSchedulerStatus(req, res) {
    try {
      const schedulerService = new SchedulerService();
      const status = schedulerService.getSchedulerStatus();
      
      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      console.error('Error getting scheduler status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get scheduler status',
        message: error.message
      });
    }
  }



  // Fetch data for specific ticker
  static async fetchSpecificTicker(req, res) {
    try {
      const { ticker } = req.params;

      if (!ticker) {
        return res.status(400).json({
          success: false,
          error: 'Ticker symbol is required'
        });
      }

      const tickerUpper = ticker.toUpperCase();

      // Check if it's an index (VNINDEX, HNX-INDEX, etc.)
      const isIndex = tickerUpper === 'VNINDEX' || tickerUpper === 'HNX-INDEX' || tickerUpper === 'UPCOM-INDEX';

      if (isIndex) {
        // For indices, only collect historical price data
        const HistoricalPriceService = require('../services/HistoricalPriceService');
        const historicalPriceService = new HistoricalPriceService();

        const result = await historicalPriceService.fetchHistoricalPrices(tickerUpper, 0, 5);

        res.json({
          success: true,
          message: `Historical price data collected for ${tickerUpper}`,
          data: {
            ticker: tickerUpper,
            type: 'index',
            dataCollected: {
              basicInfo: false,
              financials: false,
              technicalAnalysis: false,
              historicalPrices: true,
              ownership: false,
              image: false
            },
            historicalData: result
          }
        });
      } else {
        // For regular stocks, use SimplizeApiService
        const simplizeApiService = new SimplizeApiService();
        const result = await simplizeApiService.fetchTickerData(tickerUpper);

        res.json({
          success: true,
          message: `Data fetched successfully for ${tickerUpper}`,
          data: result
        });
      }
    } catch (error) {
      console.error(`Error fetching data for ${req.params.ticker}:`, error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch ticker data',
        message: error.message
      });
    }
  }

  // Get system health
  static async getSystemHealth(req, res) {
    try {
      const { pool } = require('../config/database');
      
      // Test database connection
      let dbStatus = 'healthy';
      let dbError = null;
      try {
        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();
      } catch (error) {
        dbStatus = 'unhealthy';
        dbError = error.message;
      }

      // Get memory usage
      const memoryUsage = process.memoryUsage();
      
      // Get uptime
      const uptime = process.uptime();
      
      // Get scheduler status
      const schedulerService = new SchedulerService();
      const schedulerStatus = schedulerService.getSchedulerStatus();

      res.json({
        success: true,
        data: {
          status: dbStatus === 'healthy' ? 'healthy' : 'unhealthy',
          timestamp: new Date().toISOString(),
          database: {
            status: dbStatus,
            error: dbError
          },
          memory: {
            rss: Math.round(memoryUsage.rss / 1024 / 1024) + ' MB',
            heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB',
            heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB',
            external: Math.round(memoryUsage.external / 1024 / 1024) + ' MB'
          },
          uptime: {
            seconds: Math.round(uptime),
            formatted: this.formatUptime(uptime)
          },
          scheduler: schedulerStatus,
          nodeVersion: process.version,
          platform: process.platform
        }
      });
    } catch (error) {
      console.error('Error getting system health:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get system health',
        message: error.message
      });
    }
  }

  static formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    let result = '';
    if (days > 0) result += `${days}d `;
    if (hours > 0) result += `${hours}h `;
    if (minutes > 0) result += `${minutes}m `;
    result += `${secs}s`;
    
    return result.trim();
  }
}

module.exports = AdminController;
