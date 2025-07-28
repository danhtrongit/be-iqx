const TechnicalAnalysis = require('../models/TechnicalAnalysis');
const TechnicalAnalysisService = require('../services/TechnicalAnalysisService');
const { validationResult } = require('express-validator');

class TechnicalAnalysisController {
  // Get technical analysis for a ticker (all timeframes)
  static async getTechnicalAnalysis(req, res) {
    try {
      const { ticker } = req.params;

      if (!ticker) {
        return res.status(400).json({
          success: false,
          error: 'Ticker symbol is required'
        });
      }

      const technicalData = await TechnicalAnalysis.findByTicker(ticker.toUpperCase());

      if (technicalData.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'No technical analysis data found for this ticker'
        });
      }

      // Get detailed data for each timeframe
      const detailedData = [];
      for (const tech of technicalData) {
        const movingAverages = await TechnicalAnalysis.getMovingAverages(tech.ticker, tech.time_frame);
        const oscillators = await TechnicalAnalysis.getOscillators(tech.ticker, tech.time_frame);

        detailedData.push({
          timeFrame: tech.time_frame,
          serverDateTime: tech.server_date_time,
          gaugeMovingAverage: {
            rating: tech.gauge_moving_average_rating,
            values: tech.gauge_moving_average_values
          },
          gaugeOscillator: {
            rating: tech.gauge_oscillator_rating,
            values: tech.gauge_oscillator_values
          },
          gaugeSummary: {
            rating: tech.gauge_summary_rating,
            values: tech.gauge_summary_values
          },
          pivot: {
            pivotPoint: parseFloat(tech.pivot_point),
            resistance1: parseFloat(tech.resistance1),
            resistance2: parseFloat(tech.resistance2),
            resistance3: parseFloat(tech.resistance3),
            support1: parseFloat(tech.support1),
            support2: parseFloat(tech.support2),
            support3: parseFloat(tech.support3),
            fibResistance1: parseFloat(tech.fib_resistance1),
            fibResistance2: parseFloat(tech.fib_resistance2),
            fibResistance3: parseFloat(tech.fib_resistance3),
            fibSupport1: parseFloat(tech.fib_support1),
            fibSupport2: parseFloat(tech.fib_support2),
            fibSupport3: parseFloat(tech.fib_support3)
          },
          movingAverages: movingAverages.map(ma => ({
            name: ma.name,
            value: parseFloat(ma.value),
            rating: ma.rating
          })),
          oscillators: oscillators.map(osc => ({
            name: osc.name,
            value: parseFloat(osc.value),
            rating: osc.rating
          })),
          lastUpdated: tech.updated_at
        });
      }

      res.json({
        success: true,
        data: {
          ticker: ticker.toUpperCase(),
          timeFrames: detailedData
        }
      });
    } catch (error) {
      console.error('Error getting technical analysis:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  // Get technical analysis for specific timeframe
  static async getTechnicalAnalysisByTimeFrame(req, res) {
    try {
      const { ticker, timeFrame } = req.params;

      if (!ticker || !timeFrame) {
        return res.status(400).json({
          success: false,
          error: 'Ticker symbol and timeFrame are required'
        });
      }

      const validTimeFrames = ['ONE_HOUR', 'ONE_DAY', 'ONE_WEEK'];
      if (!validTimeFrames.includes(timeFrame.toUpperCase())) {
        return res.status(400).json({
          success: false,
          error: `Invalid timeFrame. Valid options: ${validTimeFrames.join(', ')}`
        });
      }

      const technicalData = await TechnicalAnalysis.findByTickerAndTimeFrame(
        ticker.toUpperCase(), 
        timeFrame.toUpperCase()
      );

      if (!technicalData) {
        return res.status(404).json({
          success: false,
          error: `No technical analysis data found for ${ticker.toUpperCase()} (${timeFrame.toUpperCase()})`
        });
      }

      // Get moving averages and oscillators
      const movingAverages = await TechnicalAnalysis.getMovingAverages(
        technicalData.ticker, 
        technicalData.time_frame
      );
      const oscillators = await TechnicalAnalysis.getOscillators(
        technicalData.ticker, 
        technicalData.time_frame
      );

      const response = {
        ticker: technicalData.ticker,
        timeFrame: technicalData.time_frame,
        serverDateTime: technicalData.server_date_time,
        gaugeMovingAverage: {
          rating: technicalData.gauge_moving_average_rating,
          values: technicalData.gauge_moving_average_values
        },
        gaugeOscillator: {
          rating: technicalData.gauge_oscillator_rating,
          values: technicalData.gauge_oscillator_values
        },
        gaugeSummary: {
          rating: technicalData.gauge_summary_rating,
          values: technicalData.gauge_summary_values
        },
        pivot: {
          pivotPoint: parseFloat(technicalData.pivot_point),
          resistance1: parseFloat(technicalData.resistance1),
          resistance2: parseFloat(technicalData.resistance2),
          resistance3: parseFloat(technicalData.resistance3),
          support1: parseFloat(technicalData.support1),
          support2: parseFloat(technicalData.support2),
          support3: parseFloat(technicalData.support3),
          fibResistance1: parseFloat(technicalData.fib_resistance1),
          fibResistance2: parseFloat(technicalData.fib_resistance2),
          fibResistance3: parseFloat(technicalData.fib_resistance3),
          fibSupport1: parseFloat(technicalData.fib_support1),
          fibSupport2: parseFloat(technicalData.fib_support2),
          fibSupport3: parseFloat(technicalData.fib_support3)
        },
        movingAverages: movingAverages.map(ma => ({
          name: ma.name,
          value: parseFloat(ma.value),
          rating: ma.rating
        })),
        oscillators: oscillators.map(osc => ({
          name: osc.name,
          value: parseFloat(osc.value),
          rating: osc.rating
        })),
        lastUpdated: technicalData.updated_at
      };

      res.json({
        success: true,
        data: response
      });
    } catch (error) {
      console.error('Error getting technical analysis by timeframe:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  // Get technical analysis statistics
  static async getStatistics(req, res) {
    try {
      const stats = await TechnicalAnalysis.getStatistics();
      const tickersWithData = await TechnicalAnalysis.getTickersWithData();

      res.json({
        success: true,
        data: {
          totalTickers: parseInt(stats.total_tickers),
          totalRecords: parseInt(stats.total_records),
          oneHourRecords: parseInt(stats.one_hour_records),
          oneDayRecords: parseInt(stats.one_day_records),
          oneWeekRecords: parseInt(stats.one_week_records),
          totalMovingAverages: parseInt(stats.total_moving_averages),
          totalOscillators: parseInt(stats.total_oscillators),
          tickersWithData: tickersWithData.map(ticker => ({
            ticker: ticker.ticker,
            timeframesCount: parseInt(ticker.timeframes_count),
            timeframes: ticker.timeframes,
            lastUpdated: ticker.last_updated
          }))
        }
      });
    } catch (error) {
      console.error('Error getting technical analysis statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  // Trigger technical analysis collection
  static async triggerTechnicalCollection(req, res) {
    try {
      const { tickers, timeFrame, useWorkers, workerCount } = req.body;

      if (!tickers || !Array.isArray(tickers)) {
        return res.status(400).json({
          success: false,
          error: 'Tickers array is required'
        });
      }

      const technicalService = new TechnicalAnalysisService();
      const workers = useWorkers !== false; // Default to true
      const numWorkers = workerCount || 128; // Default 128 workers
      let result;

      if (timeFrame) {
        // Collect specific timeframe
        result = await technicalService.fetchSpecificTimeFrame(tickers, timeFrame.toUpperCase());
      } else {
        // Collect all timeframes
        result = await technicalService.fetchTechnicalForTickers(tickers, workers, numWorkers);
      }

      res.json({
        success: true,
        message: 'Technical analysis collection completed',
        data: {
          totalTickers: tickers.length,
          timeFrame: timeFrame || 'ALL',
          useWorkers: workers,
          workerCount: numWorkers,
          successCount: result.success.length,
          failedCount: result.failed.length,
          totalRecords: result.totalRecords,
          results: result
        }
      });
    } catch (error) {
      console.error('Error during technical analysis collection:', error);
      res.status(500).json({
        success: false,
        error: 'Technical analysis collection failed',
        message: error.message
      });
    }
  }
}

module.exports = TechnicalAnalysisController;
