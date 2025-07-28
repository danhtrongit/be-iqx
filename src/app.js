const express = require('express');
const compression = require('compression');
const cors = require('cors');
require('dotenv').config();

// Import middleware
const { 
  globalErrorHandler, 
  handleNotFound, 
  requestLogger, 
  devLogger 
} = require('./middleware/errorHandler');

const {
  generalLimiter,
  adminLimiter,
  dataCollectionLimiter,
  corsOptions,
  helmetConfig,
  sanitizeInput,
  validateRequest,
  ipWhitelist
} = require('./middleware/security');

// Import routes
const indexRoutes = require('./routes/index');
const tickerRoutes = require('./routes/tickers');
const adminRoutes = require('./routes/admin');
const historicalPricesRoutes = require('./routes/historicalPrices');
const ownershipRoutes = require('./routes/ownership');
const technicalRoutes = require('./routes/technical');
const impactIndexRoutes = require('./routes/impactIndex');
const foreignTradingRoutes = require('./routes/foreignTrading');

// Import services
const { initializeDatabase } = require('./config/database');
const SchedulerService = require('./services/SchedulerService');
const logger = require('./utils/logger');

// Create Express app
const app = express();

// Trust proxy (important for rate limiting and IP detection)
app.set('trust proxy', 1);

// Security middleware
app.use(helmetConfig);
app.use(cors(corsOptions));

// Request parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Request validation and sanitization
app.use(validateRequest);
app.use(sanitizeInput);

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(devLogger);
} else {
  app.use(requestLogger);
}

// Rate limiting
app.use('/api', generalLimiter);
app.use('/api/admin', adminLimiter);
app.use('/api/admin/collect-data', dataCollectionLimiter);

// IP whitelist for admin endpoints in production
if (process.env.NODE_ENV === 'production') {
  app.use('/api/admin', ipWhitelist);
}

// Routes
app.use('/', indexRoutes);
app.use('/api/tickers', tickerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/historical-prices', historicalPricesRoutes);
app.use('/api/ownership', ownershipRoutes);
app.use('/api/technical', technicalRoutes);
app.use('/api/impact-index', impactIndexRoutes);
app.use('/api/foreign-trading', foreignTradingRoutes);

// Handle 404 errors
app.use(handleNotFound);

// Global error handler
app.use(globalErrorHandler);

// Initialize application
const initializeApp = async () => {
  try {
    logger.info('Starting IQX Stock Data API...');
    
    // Initialize database
    logger.info('Initializing database...');
    await initializeDatabase();
    logger.info('Database initialized successfully');
    
    // Start scheduler if enabled
    if (process.env.ENABLE_SCHEDULER !== 'false') {
      logger.info('Starting scheduler service...');
      const schedulerService = new SchedulerService();
      schedulerService.startScheduler();
      logger.info('Scheduler service started');
      
      // Store scheduler instance for graceful shutdown
      app.locals.schedulerService = schedulerService;
    } else {
      logger.info('Scheduler service disabled');
    }
    
    logger.info('Application initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize application', { error: error.message });
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  // Stop scheduler if running
  if (app.locals.schedulerService) {
    logger.info('Stopping scheduler service...');
    app.locals.schedulerService.stopScheduler();
  }
  
  // Close database connections
  const { pool } = require('./config/database');
  pool.end(() => {
    logger.info('Database connections closed');
    process.exit(0);
  });
};

// Handle process signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection', { error: err.message, stack: err.stack });
  process.exit(1);
});

// Start server
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  await initializeApp();
  
  const server = app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`, {
      environment: process.env.NODE_ENV || 'development',
      port: PORT
    });
    
    // Log available endpoints
    console.log('\n🚀 IQX Stock Data API is running!');
    console.log(`📍 Server: http://localhost:${PORT}`);
    console.log('📋 Available endpoints:');
    console.log('   GET  /                           - API information');
    console.log('   GET  /health                     - Health check');
    console.log('   GET  /api/tickers                - Get all tickers');
    console.log('   GET  /api/tickers/:ticker        - Get specific ticker');
    console.log('   GET  /api/tickers/search         - Search tickers');
    console.log('   GET  /api/tickers/statistics     - Get statistics');
    console.log('   GET  /api/historical-prices/statistics - Historical price stats');
    console.log('   GET  /api/historical-prices/:ticker - Get historical prices');
    console.log('   GET  /api/historical-prices/:ticker/period/:period - Get prices by period');
    console.log('   GET  /api/ownership/:ticker      - Get ownership data');
    console.log('   GET  /api/ownership/statistics   - Ownership statistics');
    console.log('   GET  /api/technical/:ticker      - Get technical analysis');
    console.log('   GET  /api/technical/statistics   - Technical analysis stats');
    console.log('   POST /api/technical/collect      - Collect technical data (128 workers)');
    console.log('   GET  /api/impact-index/:symbol   - Get impact index for symbol');
    console.log('   GET  /api/impact-index/statistics - Impact index statistics');
    console.log('   GET  /api/impact-index/top?exchange=HSX - Top impact by exchange');
    console.log('   GET  /api/foreign-trading/:symbol - Get foreign trading data');
    console.log('   GET  /api/foreign-trading/statistics - Foreign trading statistics');
    console.log('   GET  /api/admin/health           - System health');
    console.log('   POST /api/admin/collect-data     - Trigger data collection (128 workers)');
    console.log('   GET  /api/admin/scheduler/status - Scheduler status');

    console.log('\n💡 Use /api/admin endpoints for management operations');
    console.log('🔄 Scheduler will automatically collect data twice daily');
    console.log('📊 Check /api/tickers/statistics for data overview\n');
  });
  
  // Store server instance for graceful shutdown
  app.locals.server = server;
};

// Start the application
if (require.main === module) {
  startServer().catch((error) => {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  });
}

module.exports = app;
