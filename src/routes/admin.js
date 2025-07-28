const express = require('express');
const { body } = require('express-validator');
const AdminController = require('../controllers/AdminController');

const router = express.Router();



// Test route
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Admin routes working!' });
});

/**
 * @route POST /api/admin/collect-data
 * @desc Manually trigger data collection for all tickers
 * @access Admin
 */
router.post('/collect-data', AdminController.triggerDataCollection);



/**
 * @route GET /api/admin/scheduler/status
 * @desc Get scheduler status and next run times
 * @access Admin
 */
router.get('/scheduler/status', AdminController.getSchedulerStatus);



/**
 * @route POST /api/admin/ticker/:ticker/fetch
 * @desc Fetch data for a specific ticker
 * @access Admin
 * @param {string} ticker - Ticker symbol
 */
router.post('/ticker/:ticker/fetch', AdminController.fetchSpecificTicker);

/**
 * @route GET /api/admin/health
 * @desc Get system health status
 * @access Admin
 */
router.get('/health', AdminController.getSystemHealth);

module.exports = router;
