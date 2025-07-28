const express = require('express');
const { query } = require('express-validator');
const ForeignTradingController = require('../controllers/ForeignTradingController');

const router = express.Router();

// Validation middleware
const rangeSearchValidation = [
  query('minValue').isInt().withMessage('minValue must be a valid integer'),
  query('maxValue').isInt().withMessage('maxValue must be a valid integer'),
  query('type').optional().isIn(['net', 'buy', 'sell']).withMessage('type must be net, buy, or sell'),
  query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('limit must be between 1 and 1000')
];

const topTradingValidation = [
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
  query('exchange').optional().isIn(['HSX', 'HNX', 'UPCOM']).withMessage('exchange must be HSX, HNX, or UPCOM')
];

const paginationValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('limit must be between 1 and 1000'),
  query('orderBy').optional().isIn(['symbol', 'foreign_buy_value', 'foreign_sell_value', 'net_value', 'net_volume', 'updated_at']).withMessage('Invalid orderBy field'),
  query('orderDirection').optional().isIn(['ASC', 'DESC']).withMessage('orderDirection must be ASC or DESC')
];

/**
 * @route GET /api/foreign-trading/statistics
 * @desc Get foreign trading statistics
 * @access Public
 */
router.get('/statistics', ForeignTradingController.getStatistics);

/**
 * @route GET /api/foreign-trading/top-buyers
 * @desc Get top net buyers
 * @access Public
 * @param {number} limit - Number of results (default: 20, max: 100)
 * @param {string} exchange - Stock exchange filter (HSX, HNX, UPCOM)
 */
router.get('/top-buyers', topTradingValidation, ForeignTradingController.getTopNetBuyers);

/**
 * @route GET /api/foreign-trading/top-sellers
 * @desc Get top net sellers
 * @access Public
 * @param {number} limit - Number of results (default: 20, max: 100)
 * @param {string} exchange - Stock exchange filter (HSX, HNX, UPCOM)
 */
router.get('/top-sellers', topTradingValidation, ForeignTradingController.getTopNetSellers);

/**
 * @route GET /api/foreign-trading/search
 * @desc Search symbols by value range
 * @access Public
 * @param {number} minValue - Minimum value
 * @param {number} maxValue - Maximum value
 * @param {string} type - Value type (net, buy, sell)
 * @param {number} limit - Number of results (default: 100, max: 1000)
 */
router.get('/search', rangeSearchValidation, ForeignTradingController.searchByRange);

/**
 * @route GET /api/foreign-trading
 * @desc Get all foreign trading data with pagination
 * @access Public
 * @param {number} page - Page number (default: 1)
 * @param {number} limit - Items per page (default: 100, max: 1000)
 * @param {string} orderBy - Sort field
 * @param {string} orderDirection - Sort direction (ASC, DESC)
 */
router.get('/', paginationValidation, ForeignTradingController.getAllForeignTrading);

/**
 * @route GET /api/foreign-trading/exchange/:exchange/statistics
 * @desc Get foreign trading statistics for specific exchange
 * @access Public
 * @param {string} exchange - Stock exchange (HSX, HNX, UPCOM)
 */
router.get('/exchange/:exchange/statistics', ForeignTradingController.getStatisticsByExchange);

/**
 * @route GET /api/foreign-trading/:symbol
 * @desc Get foreign trading for specific symbol
 * @access Public
 * @param {string} symbol - Stock symbol
 */
router.get('/:symbol', ForeignTradingController.getForeignTrading);

/**
 * @route POST /api/foreign-trading/collect
 * @desc Trigger manual foreign trading collection from Google Sheets
 * @access Admin
 */
router.post('/collect', ForeignTradingController.triggerCollection);

module.exports = router;
