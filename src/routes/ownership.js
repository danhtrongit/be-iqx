const express = require('express');
const { body } = require('express-validator');
const OwnershipController = require('../controllers/OwnershipController');

const router = express.Router();

// Validation middleware
const ownershipCollectionValidation = [
  body('tickers').isArray({ min: 1 }).withMessage('Tickers must be a non-empty array'),
  body('tickers.*').isString().isLength({ min: 1, max: 20 }).withMessage('Each ticker must be a valid string')
];

/**
 * @route GET /api/ownership/statistics
 * @desc Get ownership statistics
 * @access Public
 */
router.get('/statistics', OwnershipController.getStatistics);

/**
 * @route GET /api/ownership/:ticker
 * @desc Get complete ownership data for a ticker
 * @access Public
 * @param {string} ticker - Ticker symbol
 */
router.get('/:ticker', OwnershipController.getCompleteOwnership);

/**
 * @route GET /api/ownership/:ticker/breakdown
 * @desc Get ownership breakdown for a ticker
 * @access Public
 * @param {string} ticker - Ticker symbol
 */
router.get('/:ticker/breakdown', OwnershipController.getOwnershipBreakdown);

/**
 * @route GET /api/ownership/:ticker/shareholders
 * @desc Get major shareholders for a ticker
 * @access Public
 * @param {string} ticker - Ticker symbol
 * @param {number} limit - Number of shareholders to return (default: 20, max: 100)
 */
router.get('/:ticker/shareholders', OwnershipController.getMajorShareholders);

/**
 * @route GET /api/ownership/:ticker/funds
 * @desc Get fund holdings for a ticker
 * @access Public
 * @param {string} ticker - Ticker symbol
 * @param {number} limit - Number of fund holdings to return (default: 50, max: 100)
 */
router.get('/:ticker/funds', OwnershipController.getFundHoldings);

/**
 * @route POST /api/ownership/collect
 * @desc Trigger ownership data collection for multiple tickers
 * @access Admin
 * @body {string[]} tickers - Array of ticker symbols
 */
router.post('/collect', ownershipCollectionValidation, OwnershipController.triggerOwnershipCollection);

module.exports = router;
