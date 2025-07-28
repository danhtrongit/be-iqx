const express = require('express');
const { body } = require('express-validator');
const TechnicalAnalysisController = require('../controllers/TechnicalAnalysisController');

const router = express.Router();

// Validation middleware
const technicalCollectionValidation = [
  body('tickers').isArray({ min: 1 }).withMessage('Tickers must be a non-empty array'),
  body('tickers.*').isString().isLength({ min: 1, max: 20 }).withMessage('Each ticker must be a valid string'),
  body('timeFrame').optional().isIn(['ONE_HOUR', 'ONE_DAY', 'ONE_WEEK']).withMessage('TimeFrame must be ONE_HOUR, ONE_DAY, or ONE_WEEK'),
  body('useWorkers').optional().isBoolean().withMessage('useWorkers must be a boolean'),
  body('workerCount').optional().isInt({ min: 1, max: 256 }).withMessage('workerCount must be between 1 and 256')
];

/**
 * @route GET /api/technical/statistics
 * @desc Get technical analysis statistics
 * @access Public
 */
router.get('/statistics', TechnicalAnalysisController.getStatistics);

/**
 * @route GET /api/technical/:ticker
 * @desc Get technical analysis for a ticker (all timeframes)
 * @access Public
 * @param {string} ticker - Ticker symbol
 */
router.get('/:ticker', TechnicalAnalysisController.getTechnicalAnalysis);

/**
 * @route GET /api/technical/:ticker/:timeFrame
 * @desc Get technical analysis for specific timeframe
 * @access Public
 * @param {string} ticker - Ticker symbol
 * @param {string} timeFrame - Time frame (ONE_HOUR, ONE_DAY, ONE_WEEK)
 */
router.get('/:ticker/:timeFrame', TechnicalAnalysisController.getTechnicalAnalysisByTimeFrame);

/**
 * @route POST /api/technical/collect
 * @desc Trigger technical analysis collection with 128 workers
 * @access Admin
 * @body {string[]} tickers - Array of ticker symbols
 * @body {string} timeFrame - Optional specific timeframe (ONE_HOUR, ONE_DAY, ONE_WEEK)
 * @body {boolean} useWorkers - Use parallel workers (default: true)
 * @body {number} workerCount - Number of workers (default: 128, max: 256)
 */
router.post('/collect', technicalCollectionValidation, TechnicalAnalysisController.triggerTechnicalCollection);

module.exports = router;
