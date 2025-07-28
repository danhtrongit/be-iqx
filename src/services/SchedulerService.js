const cron = require('node-cron');
const fs = require('fs').promises;
const path = require('path');
const SimplizeApiService = require('./SimplizeApiService');
const WorkerPoolService = require('./WorkerPoolService');
const HistoricalPriceService = require('./HistoricalPriceService');
const OwnershipService = require('./OwnershipService');
const TechnicalAnalysisService = require('./TechnicalAnalysisService');
const ImpactIndexService = require('./ImpactIndexService');
const ForeignTradingService = require('./ForeignTradingService');
require('dotenv').config();

class SchedulerService {
  constructor() {
    this.simplizeApiService = new SimplizeApiService();
    this.workerPoolService = new WorkerPoolService(128); // 128 workers
    this.historicalPriceService = new HistoricalPriceService();
    this.ownershipService = new OwnershipService();
    this.technicalAnalysisService = new TechnicalAnalysisService();
    this.impactIndexService = new ImpactIndexService();
    this.foreignTradingService = new ForeignTradingService();
    this.morningSchedule = process.env.CRON_SCHEDULE_MORNING || '0 8 * * *'; // 8:00 AM
    this.eveningSchedule = process.env.CRON_SCHEDULE_EVENING || '0 20 * * *'; // 8:00 PM
    this.tickersFilePath = path.join(process.cwd(), 'tickers.json');
    this.isRunning = false;
    this.jobs = [];
  }

  async loadTickers() {
    try {
      const data = await fs.readFile(this.tickersFilePath, 'utf8');
      const tickers = JSON.parse(data);
      
      if (!Array.isArray(tickers)) {
        throw new Error('Tickers file must contain an array of ticker symbols');
      }
      
      console.log(`Loaded ${tickers.length} tickers from ${this.tickersFilePath}`);
      return tickers;
    } catch (error) {
      console.error('Error loading tickers:', error.message);
      throw error;
    }
  }

  async collectAllData() {
    if (this.isRunning) {
      console.log('Data collection is already running, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = new Date();
    console.log(`\n=== Starting data collection at ${startTime.toISOString()} ===`);

    try {
      // Load tickers
      const tickers = await this.loadTickers();
      
      // Collect ticker data using worker pool
      console.log('\n--- Phase 1: Collecting ticker data with 128 workers ---');
      const apiResults = await this.workerPoolService.fetchAllTickers(tickers);

      // Collect recent historical prices (5 records per ticker)
      console.log('\n--- Phase 2: Collecting recent historical prices ---');
      const successfulTickers = apiResults.success.map(result => result.ticker);
      const historicalResults = await this.historicalPriceService.fetchRecentPrices(successfulTickers, 5);

      // Collect impact index data from Google Sheets
      console.log('\n--- Phase 3: Collecting impact index data ---');
      let impactIndexResults = { totalRecords: 0, error: null };
      try {
        impactIndexResults = await this.impactIndexService.fetchImpactIndexData();
      } catch (error) {
        console.error('Impact index collection failed:', error.message);
        impactIndexResults.error = error.message;
      }

      // Collect foreign trading data from Google Sheets
      console.log('\n--- Phase 4: Collecting foreign trading data ---');
      let foreignTradingResults = { totalRecords: 0, error: null };
      try {
        foreignTradingResults = await this.foreignTradingService.fetchForeignTradingData();
      } catch (error) {
        console.error('Foreign trading collection failed:', error.message);
        foreignTradingResults.error = error.message;
      }

      // Skip image download phase
      console.log('\n--- Phase 5: Image download skipped (using original URLs) ---');
      const imageResults = { success: [], failed: [], skipped: [] };
      
      // Generate summary report
      const endTime = new Date();
      const duration = Math.round((endTime - startTime) / 1000);
      
      const summary = {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        durationSeconds: duration,
        totalTickers: tickers.length,
        apiResults: {
          success: apiResults.success.length,
          failed: apiResults.failed.length,
          failedTickers: apiResults.failed.map(f => ({ ticker: f.ticker, error: f.error }))
        },
        historicalResults: {
          success: historicalResults.success.length,
          failed: historicalResults.failed.length,
          totalRecords: historicalResults.success.reduce((sum, result) => sum + result.savedCount, 0)
        },
        impactIndexResults: {
          totalRecords: impactIndexResults.totalRecords,
          success: impactIndexResults.error ? false : true,
          error: impactIndexResults.error
        },
        foreignTradingResults: {
          totalRecords: foreignTradingResults.totalRecords,
          success: foreignTradingResults.error ? false : true,
          error: foreignTradingResults.error
        },
        imageResults: {
          success: imageResults.success.length,
          failed: imageResults.failed.length,
          skipped: imageResults.skipped.length,
          failedImages: imageResults.failed.map(f => ({ ticker: f.ticker, error: f.error }))
        }
      };

      console.log('\n=== Data Collection Summary ===');
      console.log(`Duration: ${duration} seconds`);
      console.log(`Total tickers: ${summary.totalTickers}`);
      console.log(`API - Success: ${summary.apiResults.success}, Failed: ${summary.apiResults.failed}`);
      console.log(`Images - Success: ${summary.imageResults.success}, Failed: ${summary.imageResults.failed}, Skipped: ${summary.imageResults.skipped}`);
      
      if (summary.apiResults.failed > 0) {
        console.log('\nFailed API calls:');
        summary.apiResults.failedTickers.forEach(item => {
          console.log(`  - ${item.ticker}: ${item.error}`);
        });
      }

      if (summary.imageResults.failed > 0) {
        console.log('\nFailed image downloads:');
        summary.imageResults.failedImages.forEach(item => {
          console.log(`  - ${item.ticker}: ${item.error}`);
        });
      }

      console.log(`\n=== Data collection completed at ${endTime.toISOString()} ===\n`);
      
      return summary;
    } catch (error) {
      console.error('Error during data collection:', error.message);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  async runTechnicalAnalysis() {
    console.log('\n=== Technical Analysis Collection Started ===');
    const startTime = new Date();

    try {
      // Load tickers
      const tickers = await this.loadTickers();
      console.log(`Starting technical analysis for ${tickers.length} tickers...`);

      // Collect ONE_HOUR technical data with 128 workers (most frequent updates)
      const result = await this.technicalAnalysisService.fetchSpecificTimeFrameWithWorkers(tickers, 'ONE_HOUR', 128);

      const endTime = new Date();
      const duration = Math.round((endTime - startTime) / 1000);

      const summary = {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        durationSeconds: duration,
        totalTickers: tickers.length,
        timeFrame: 'ONE_HOUR',
        successCount: result.success.length,
        failedCount: result.failed.length,
        totalRecords: result.totalRecords
      };

      console.log('\n=== Technical Analysis Summary ===');
      console.log(`Duration: ${duration} seconds`);
      console.log(`Total tickers: ${summary.totalTickers}`);
      console.log(`Success: ${summary.successCount}, Failed: ${summary.failedCount}`);
      console.log(`Total records: ${summary.totalRecords}`);
      console.log('=== Technical Analysis Completed ===\n');

      return summary;
    } catch (error) {
      console.error('Error during technical analysis collection:', error.message);
      throw error;
    }
  }

  startScheduler() {
    console.log('Starting scheduler service...');
    console.log(`Morning schedule: ${this.morningSchedule} (${this.getCronDescription(this.morningSchedule)})`);
    console.log(`Evening schedule: ${this.eveningSchedule} (${this.getCronDescription(this.eveningSchedule)})`);

    // Morning job
    const morningJob = cron.schedule(this.morningSchedule, async () => {
      console.log('\n🌅 Morning data collection triggered');
      try {
        await this.collectAllData();
      } catch (error) {
        console.error('Morning data collection failed:', error.message);
      }
    }, {
      scheduled: false,
      timezone: 'Asia/Ho_Chi_Minh'
    });

    // Evening job
    const eveningJob = cron.schedule(this.eveningSchedule, async () => {
      console.log('\n🌙 Evening data collection triggered');
      try {
        await this.collectAllData();
      } catch (error) {
        console.error('Evening data collection failed:', error.message);
      }
    }, {
      scheduled: false,
      timezone: 'Asia/Ho_Chi_Minh'
    });

    // Technical analysis job (every 30 minutes during market hours: 9 AM - 3 PM, Mon-Fri)
    const technicalJob = cron.schedule('*/30 9-15 * * 1-5', async () => {
      console.log('\n📊 Technical analysis collection triggered');
      try {
        await this.runTechnicalAnalysis();
      } catch (error) {
        console.error('Technical analysis collection failed:', error.message);
      }
    }, {
      scheduled: false,
      timezone: 'Asia/Ho_Chi_Minh'
    });

    // Start the jobs
    morningJob.start();
    eveningJob.start();
    technicalJob.start();

    this.jobs = [
      { name: 'morning', job: morningJob, schedule: this.morningSchedule },
      { name: 'evening', job: eveningJob, schedule: this.eveningSchedule },
      { name: 'technical', job: technicalJob, schedule: '*/30 9-15 * * 1-5' }
    ];

    console.log('Scheduler started successfully!');
    console.log('Jobs will run automatically according to the schedule.');
    console.log('Use stopScheduler() to stop all scheduled jobs.');
  }

  stopScheduler() {
    console.log('Stopping scheduler service...');
    
    this.jobs.forEach(jobInfo => {
      if (jobInfo.job) {
        jobInfo.job.stop();
        console.log(`Stopped ${jobInfo.name} job`);
      }
    });

    this.jobs = [];
    console.log('Scheduler stopped successfully!');
  }

  getSchedulerStatus() {
    return {
      isRunning: this.jobs.length > 0,
      jobs: this.jobs.map(jobInfo => ({
        name: jobInfo.name,
        schedule: jobInfo.schedule,
        description: this.getCronDescription(jobInfo.schedule),
        isRunning: jobInfo.job ? jobInfo.job.running : false
      })),
      dataCollectionInProgress: this.isRunning,
      nextRuns: this.getNextRunTimes()
    };
  }

  getNextRunTimes() {
    if (this.jobs.length === 0) return [];

    const now = new Date();
    const nextRuns = [];

    this.jobs.forEach(jobInfo => {
      if (jobInfo.job && jobInfo.job.running) {
        try {
          // This is a simplified calculation - in production you might want to use a more robust cron parser
          const nextRun = this.calculateNextRun(jobInfo.schedule, now);
          nextRuns.push({
            name: jobInfo.name,
            nextRun: nextRun.toISOString(),
            timeUntil: this.getTimeUntil(nextRun)
          });
        } catch (error) {
          console.error(`Error calculating next run for ${jobInfo.name}:`, error.message);
        }
      }
    });

    return nextRuns.sort((a, b) => new Date(a.nextRun) - new Date(b.nextRun));
  }

  calculateNextRun(cronExpression, fromDate) {
    // Simplified calculation for common patterns
    // For production, consider using a proper cron parser library
    const [minute, hour] = cronExpression.split(' ');
    const targetHour = parseInt(hour);
    const targetMinute = parseInt(minute);
    
    const nextRun = new Date(fromDate);
    nextRun.setHours(targetHour, targetMinute, 0, 0);
    
    // If the time has passed today, schedule for tomorrow
    if (nextRun <= fromDate) {
      nextRun.setDate(nextRun.getDate() + 1);
    }
    
    return nextRun;
  }

  getTimeUntil(targetDate) {
    const now = new Date();
    const diff = targetDate - now;
    
    if (diff <= 0) return 'Past due';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  getCronDescription(cronExpression) {
    const [minute, hour] = cronExpression.split(' ');
    return `Daily at ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
  }

  // Manual trigger for testing
  async triggerManualCollection() {
    console.log('🔧 Manual data collection triggered');
    return await this.collectAllData();
  }
}

module.exports = SchedulerService;
