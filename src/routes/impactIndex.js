const express = require('express');
const { query } = require('express-validator');
const ImpactIndexController = require('../controllers/ImpactIndexController');

const router = express.Router();

// Validation middleware
const rangeSearchValidation = [
  query('minImpact').isFloat().withMessage('minImpact must be a valid number'),
  query('maxImpact').isFloat().withMessage('maxImpact must be a valid number'),
  query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('limit must be between 1 and 1000')
];

const topImpactValidation = [
  query('type').optional().isIn(['positive', 'negative', 'absolute']).withMessage('type must be positive, negative, or absolute'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
  query('exchange').optional().isIn(['HSX', 'HNX', 'UPCOM']).withMessage('exchange must be HSX, HNX, or UPCOM')
];

const paginationValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('limit must be between 1 and 1000'),
  query('orderBy').optional().isIn(['symbol', 'impact_index', 'updated_at']).withMessage('orderBy must be symbol, impact_index, or updated_at'),
  query('orderDirection').optional().isIn(['ASC', 'DESC']).withMessage('orderDirection must be ASC or DESC')
];

/**
 * @route GET /api/impact-index/statistics
 * @desc Get impact index statistics
 * @access Public
 */
router.get('/statistics', ImpactIndexController.getStatistics);

/**
 * @route GET /api/impact-index/exchanges
 * @desc Get available stock exchanges with impact data
 * @access Public
 */
router.get('/exchanges', ImpactIndexController.getAvailableExchanges);

/**
 * @route GET /api/impact-index/top
 * @desc Get top impact symbols
 * @access Public
 * @param {string} type - Type of impact (positive, negative, absolute)
 * @param {number} limit - Number of results (default: 20, max: 100)
 * @param {string} exchange - Stock exchange filter (HSX, HNX, UPCOM)
 */
router.get('/top', topImpactValidation, ImpactIndexController.getTopImpact);

/**
 * @route GET /api/impact-index/volatile
 * @desc Get most volatile symbols (highest absolute impact)
 * @access Public
 * @param {number} limit - Number of results (default: 20, max: 100)
 * @param {string} exchange - Stock exchange filter (HSX, HNX, UPCOM)
 */
router.get('/volatile', ImpactIndexController.getVolatileSymbols);

/**
 * @route GET /api/impact-index/search
 * @desc Search symbols by impact range
 * @access Public
 * @param {number} minImpact - Minimum impact value
 * @param {number} maxImpact - Maximum impact value
 * @param {number} limit - Number of results (default: 100, max: 1000)
 */
router.get('/search', rangeSearchValidation, ImpactIndexController.searchByRange);

/**
 * @route GET /api/impact-index
 * @desc Get all impact index data with pagination
 * @access Public
 * @param {number} page - Page number (default: 1)
 * @param {number} limit - Items per page (default: 100, max: 1000)
 * @param {string} orderBy - Sort field (symbol, impact_index, updated_at)
 * @param {string} orderDirection - Sort direction (ASC, DESC)
 */
router.get('/', paginationValidation, ImpactIndexController.getAllImpactIndex);

/**
 * @route GET /api/impact-index/exchange/:exchange/statistics
 * @desc Get impact index statistics for specific exchange
 * @access Public
 * @param {string} exchange - Stock exchange (HSX, HNX, UPCOM)
 */
router.get('/exchange/:exchange/statistics', ImpactIndexController.getStatisticsByExchange);

/**
 * @route GET /api/impact-index/:symbol/ranking/:exchange
 * @desc Get symbol ranking within exchange
 * @access Public
 * @param {string} symbol - Stock symbol
 * @param {string} exchange - Stock exchange (HSX, HNX, UPCOM)
 */
router.get('/:symbol/ranking/:exchange', ImpactIndexController.getSymbolRanking);

/**
 * @route GET /api/impact-index/:symbol
 * @desc Get impact index for specific symbol
 * @access Public
 * @param {string} symbol - Stock symbol
 */
router.get('/:symbol', ImpactIndexController.getImpactIndex);

/**
 * @route POST /api/impact-index/collect
 * @desc Trigger manual impact index collection from Google Sheets
 * @access Admin
 */
router.post('/collect', ImpactIndexController.triggerCollection);

module.exports = router;
