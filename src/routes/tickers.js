const express = require('express');
const { query } = require('express-validator');
const TickerController = require('../controllers/TickerController');

const router = express.Router();

// Validation middleware for search
const searchValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('minPrice').optional().isFloat({ min: 0 }).withMessage('Min price must be a positive number'),
  query('maxPrice').optional().isFloat({ min: 0 }).withMessage('Max price must be a positive number'),
  query('minMarketCap').optional().isInt({ min: 0 }).withMessage('Min market cap must be a positive integer'),
  query('maxMarketCap').optional().isInt({ min: 0 }).withMessage('Max market cap must be a positive integer'),
  query('sortBy').optional().isIn(['ticker', 'name_vi', 'name_en', 'price_close', 'market_cap', 'updated_at']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc')
];

/**
 * @route GET /api/tickers
 * @desc Get all tickers with pagination
 * @access Public
 * @param {number} page - Page number (default: 1)
 * @param {number} limit - Items per page (default: 50, max: 100)
 */
router.get('/', TickerController.getAllTickers);

/**
 * @route GET /api/tickers/search
 * @desc Search tickers by various criteria
 * @access Public
 * @param {string} query - Search query (ticker, name_vi, name_en)
 * @param {string} exchange - Stock exchange (HOSE, HNX, UPCOM)
 * @param {string} sector - Economic sector slug
 * @param {string} industry - Industry group slug
 * @param {number} minPrice - Minimum price
 * @param {number} maxPrice - Maximum price
 * @param {number} minMarketCap - Minimum market cap
 * @param {number} maxMarketCap - Maximum market cap
 * @param {string} sortBy - Sort field
 * @param {string} sortOrder - Sort order (asc/desc)
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 */
router.get('/search', searchValidation, TickerController.searchTickers);

/**
 * @route GET /api/tickers/statistics
 * @desc Get ticker statistics and overview
 * @access Public
 */
router.get('/statistics', TickerController.getStatistics);

/**
 * @route GET /api/tickers/logs
 * @desc Get data collection logs
 * @access Public
 * @param {string} ticker - Filter by ticker symbol (optional)
 * @param {number} limit - Number of logs to return (default: 50, max: 100)
 */
router.get('/logs', TickerController.getCollectionLogs);

/**
 * @route GET /api/tickers/logs/statistics
 * @desc Get data collection statistics
 * @access Public
 */
router.get('/logs/statistics', TickerController.getCollectionStatistics);

/**
 * @route GET /api/tickers/:ticker
 * @desc Get specific ticker by symbol
 * @access Public
 * @param {string} ticker - Ticker symbol
 */
router.get('/:ticker', TickerController.getTickerBySymbol);

module.exports = router;
