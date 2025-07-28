const express = require('express');
const { query, body } = require('express-validator');
const HistoricalPriceController = require('../controllers/HistoricalPriceController');

const router = express.Router();

// Validation middleware
const dateRangeValidation = [
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO 8601 date')
];

const bulkCollectionValidation = [
  body('tickers').isArray({ min: 1 }).withMessage('Tickers must be a non-empty array'),
  body('tickers.*').isString().isLength({ min: 1, max: 20 }).withMessage('Each ticker must be a valid string'),
  body('type').optional().isIn(['recent', 'all']).withMessage('Type must be either "recent" or "all"')
];

/**
 * @route GET /api/historical-prices/statistics
 * @desc Get historical price statistics
 * @access Public
 */
router.get('/statistics', HistoricalPriceController.getStatistics);

/**
 * @route GET /api/historical-prices/:ticker
 * @desc Get historical prices for a ticker
 * @access Public
 * @param {string} ticker - Ticker symbol
 * @param {number} page - Page number (default: 1)
 * @param {number} limit - Items per page (default: 100, max: 1000)
 */
router.get('/:ticker', HistoricalPriceController.getHistoricalPrices);

/**
 * @route GET /api/historical-prices/:ticker/range
 * @desc Get historical prices by date range
 * @access Public
 * @param {string} ticker - Ticker symbol
 * @param {string} startDate - Start date (ISO 8601 format)
 * @param {string} endDate - End date (ISO 8601 format)
 */
router.get('/:ticker/range', dateRangeValidation, HistoricalPriceController.getHistoricalPricesByDateRange);

/**
 * @route GET /api/historical-prices/:ticker/latest
 * @desc Get latest price for a ticker
 * @access Public
 * @param {string} ticker - Ticker symbol
 */
router.get('/:ticker/latest', HistoricalPriceController.getLatestPrice);

/**
 * @route GET /api/historical-prices/:ticker/period/:period
 * @desc Get historical prices by time period
 * @access Public
 * @param {string} ticker - Ticker symbol
 * @param {string} period - Time period (1m, 3m, 6m, 1y, 5y, all)
 * @param {number} limit - Items limit for 'all' period (default: 1000, max: 5000)
 * @param {number} offset - Offset for 'all' period (default: 0)
 */
router.get('/:ticker/period/:period', HistoricalPriceController.getHistoricalPricesByPeriod);

/**
 * @route POST /api/historical-prices/collect
 * @desc Trigger historical price collection for a single ticker
 * @access Admin
 * @body {string} ticker - Ticker symbol
 * @body {string} pages - "recent" for 5 records or "all" for complete history
 */
router.post('/collect', HistoricalPriceController.triggerHistoricalCollection);

/**
 * @route POST /api/historical-prices/collect-bulk
 * @desc Trigger bulk historical price collection
 * @access Admin
 * @body {string[]} tickers - Array of ticker symbols
 * @body {string} type - "recent" for 5 records each or "all" for complete history
 */
router.post('/collect-bulk', bulkCollectionValidation, HistoricalPriceController.triggerBulkHistoricalCollection);

module.exports = router;
