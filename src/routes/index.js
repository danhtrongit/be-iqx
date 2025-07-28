const express = require('express');
const path = require('path');

const router = express.Router();

/**
 * @route GET /
 * @desc API root endpoint with basic information
 * @access Public
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'IQX Stock Data API',
    version: '1.0.0',
    description: 'Professional Node.js application for collecting stock ticker data from Simplize API',
    endpoints: {
      tickers: {
        getAll: 'GET /api/tickers',
        getBySymbol: 'GET /api/tickers/:ticker',
        search: 'GET /api/tickers/search',
        statistics: 'GET /api/tickers/statistics',
        logs: 'GET /api/tickers/logs'
      },
      admin: {
        collectData: 'POST /api/admin/collect-data',
        schedulerStatus: 'GET /api/admin/scheduler/status',
        downloadImages: 'POST /api/admin/images/download',
        cleanupImages: 'POST /api/admin/images/cleanup',
        imageStats: 'GET /api/admin/images/stats',
        fetchTicker: 'POST /api/admin/ticker/:ticker/fetch',
        health: 'GET /api/admin/health'
      },
      images: 'GET /api/images/:filename'
    },
    documentation: 'https://github.com/your-repo/be-iqx#api-documentation',
    timestamp: new Date().toISOString()
  });
});

/**
 * @route GET /health
 * @desc Basic health check endpoint
 * @access Public
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.version
  });
});



module.exports = router;
