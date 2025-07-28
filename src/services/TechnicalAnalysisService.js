const axios = require('axios');
const TechnicalAnalysis = require('../models/TechnicalAnalysis');
const DataCollectionLog = require('../models/DataCollectionLog');
require('dotenv').config();

class TechnicalAnalysisService {
  constructor() {
    this.baseUrl = 'https://iq.vietcap.com.vn/api/iq-insight-service/v1/company';
    this.timeFrames = ['ONE_HOUR', 'ONE_DAY', 'ONE_WEEK'];
    this.maxRetries = parseInt(process.env.MAX_RETRY_ATTEMPTS) || 3;
    this.retryDelay = parseInt(process.env.RETRY_DELAY_MS) || 1000;
  }

  async fetchTechnicalData(ticker, timeFrame) {
    const url = `${this.baseUrl}/${ticker}/technical/${timeFrame}`;
    let lastError = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`Fetching technical data for ${ticker} (${timeFrame}, attempt ${attempt}/${this.maxRetries})`);
        
        const response = await axios.get(url, {
          timeout: 15000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.9,vi;q=0.8',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });

        if (response.data && response.data.status === 200 && response.data.data) {
          const data = response.data.data;

          // Check if data has meaningful content
          const hasMovingAverages = data.movingAverages && data.movingAverages.length > 0;
          const hasOscillators = data.oscillators && data.oscillators.length > 0;
          const hasPivot = data.pivot && Object.keys(data.pivot).length > 0;

          // Skip if no meaningful data
          if (!hasMovingAverages && !hasOscillators && !hasPivot) {
            console.log(`No meaningful technical data for ${ticker} (${timeFrame}) - skipping`);
            return {
              ticker,
              timeFrame,
              technical: null,
              movingAverages: [],
              oscillators: [],
              totalRecords: 0,
              skipped: true
            };
          }

          // Prepare technical analysis data
          const technicalData = {
            ticker,
            timeFrame: data.timeFrame || timeFrame,
            serverDateTime: new Date(response.data.serverDateTime),
            gaugeMovingAverage: data.gaugeMovingAverage,
            gaugeOscillator: data.gaugeOscillator,
            gaugeSummary: data.gaugeSummary,
            pivot: data.pivot
          };

          // Save main technical analysis data
          const savedTechnical = await TechnicalAnalysis.createOrUpdate(technicalData);

          // Save moving averages if available
          let savedMovingAverages = [];
          if (hasMovingAverages) {
            // Truncate long indicator names
            const truncatedMovingAverages = data.movingAverages.map(ma => ({
              ...ma,
              name: ma.name ? ma.name.substring(0, 90) : 'unknown', // Limit to 90 chars
              rating: ma.rating ? ma.rating.substring(0, 25) : null // Limit to 25 chars
            }));

            savedMovingAverages = await TechnicalAnalysis.createMovingAverages(
              ticker, data.timeFrame || timeFrame, truncatedMovingAverages
            );
          }

          // Save oscillators if available
          let savedOscillators = [];
          if (hasOscillators) {
            // Truncate long indicator names
            const truncatedOscillators = data.oscillators.map(osc => ({
              ...osc,
              name: osc.name ? osc.name.substring(0, 90) : 'unknown', // Limit to 90 chars
              rating: osc.rating ? osc.rating.substring(0, 25) : null // Limit to 25 chars
            }));

            savedOscillators = await TechnicalAnalysis.createOscillators(
              ticker, data.timeFrame || timeFrame, truncatedOscillators
            );
          }

          // Log success
          await DataCollectionLog.create(ticker, `SUCCESS_TECHNICAL_${timeFrame}`, null, attempt - 1);

          console.log(`Successfully fetched and saved technical data for ${ticker} (${timeFrame})`);

          return {
            ticker,
            timeFrame: data.timeFrame || timeFrame,
            technical: savedTechnical,
            movingAverages: savedMovingAverages,
            oscillators: savedOscillators,
            totalRecords: 1 + savedMovingAverages.length + savedOscillators.length
          };
        } else {
          // Check if it's a 404 or no data response
          if (response.data && response.data.status === 404) {
            console.log(`No technical data available for ${ticker} (${timeFrame}) - API returned 404`);
            return {
              ticker,
              timeFrame,
              technical: null,
              movingAverages: [],
              oscillators: [],
              totalRecords: 0,
              skipped: true
            };
          }
          throw new Error(`Invalid response structure or no data. Status: ${response.data?.status || 'unknown'}`);
        }
      } catch (error) {
        lastError = error;
        console.error(`Attempt ${attempt} failed for ${ticker} (${timeFrame}):`, error.message);
        
        if (attempt < this.maxRetries) {
          console.log(`Retrying in ${this.retryDelay}ms...`);
          await this.delay(this.retryDelay);
        }
      }
    }

    // Log failure after all retries
    await DataCollectionLog.create(ticker, `FAILED_TECHNICAL_${timeFrame}`, lastError.message, this.maxRetries);
    throw new Error(`Failed to fetch technical data for ${ticker} (${timeFrame}) after ${this.maxRetries} attempts: ${lastError.message}`);
  }

  async fetchAllTimeFrames(ticker) {
    console.log(`Starting technical analysis collection for ${ticker} (all timeframes)...`);
    
    const results = {
      success: [],
      failed: []
    };

    for (const timeFrame of this.timeFrames) {
      try {
        const result = await this.fetchTechnicalData(ticker, timeFrame);
        results.success.push(result);
        
        // Add delay between timeframes
        await this.delay(200);
      } catch (error) {
        console.error(`Failed to fetch ${timeFrame} for ${ticker}:`, error.message);
        results.failed.push({ ticker, timeFrame, error: error.message });
      }
    }

    const totalRecords = results.success.reduce((sum, result) => sum + result.totalRecords, 0);
    
    console.log(`Completed technical analysis for ${ticker}. Success: ${results.success.length}/${this.timeFrames.length}, Total records: ${totalRecords}`);
    
    return {
      ticker,
      totalTimeFrames: this.timeFrames.length,
      successCount: results.success.length,
      failedCount: results.failed.length,
      totalRecords,
      results
    };
  }

  async fetchTechnicalForTickers(tickers, useWorkers = true, workerCount = 128) {
    if (useWorkers) {
      return await this.fetchTechnicalWithWorkers(tickers, workerCount);
    }

    const results = {
      success: [],
      failed: []
    };

    console.log(`Starting technical analysis collection for ${tickers.length} tickers (sequential)...`);

    for (let i = 0; i < tickers.length; i++) {
      const ticker = tickers[i];
      try {
        console.log(`Processing technical analysis for ${ticker} (${i + 1}/${tickers.length})`);
        const result = await this.fetchAllTimeFrames(ticker);
        results.success.push(result);

        // Add delay between tickers to avoid rate limiting
        if (i < tickers.length - 1) {
          await this.delay(1000); // 1 second delay between tickers
        }
      } catch (error) {
        console.error(`Failed to fetch technical analysis for ${ticker}:`, error.message);
        results.failed.push({ ticker, error: error.message });
      }
    }

    const totalRecords = results.success.reduce((sum, result) => sum + result.totalRecords, 0);

    console.log(`Completed technical analysis collection. Success: ${results.success.length}, Failed: ${results.failed.length}, Total records: ${totalRecords}`);
    return {
      ...results,
      totalRecords
    };
  }

  async fetchTechnicalWithWorkers(tickers, workerCount = 128) {
    console.log(`Starting technical analysis collection for ${tickers.length} tickers with ${workerCount} workers...`);

    const results = {
      success: [],
      failed: []
    };

    // Split tickers into chunks for workers
    const chunkSize = Math.ceil(tickers.length / workerCount);
    const chunks = [];
    for (let i = 0; i < tickers.length; i += chunkSize) {
      chunks.push(tickers.slice(i, i + chunkSize));
    }

    console.log(`Split ${tickers.length} tickers into ${chunks.length} chunks`);

    // Process chunks in parallel
    const promises = chunks.map(async (chunk, index) => {
      const chunkResults = {
        success: [],
        failed: []
      };

      console.log(`Worker ${index + 1} processing ${chunk.length} tickers...`);

      for (const ticker of chunk) {
        try {
          const result = await this.fetchAllTimeFrames(ticker);
          chunkResults.success.push(result);

          // Small delay to avoid overwhelming the API
          await this.delay(200);
        } catch (error) {
          console.error(`Worker ${index + 1} failed for ${ticker}:`, error.message);
          chunkResults.failed.push({ ticker, error: error.message });
        }
      }

      console.log(`Worker ${index + 1} completed: ${chunkResults.success.length} success, ${chunkResults.failed.length} failed`);
      return chunkResults;
    });

    // Wait for all workers to complete
    const workerResults = await Promise.all(promises);

    // Combine results from all workers
    for (const workerResult of workerResults) {
      results.success.push(...workerResult.success);
      results.failed.push(...workerResult.failed);
    }

    const totalRecords = results.success.reduce((sum, result) => sum + result.totalRecords, 0);

    console.log(`Completed technical analysis with workers. Success: ${results.success.length}, Failed: ${results.failed.length}, Total records: ${totalRecords}`);
    return {
      ...results,
      totalRecords
    };
  }

  async fetchSpecificTimeFrame(tickers, timeFrame) {
    return await this.fetchSpecificTimeFrameWithWorkers(tickers, timeFrame, 128);
  }

  async fetchSpecificTimeFrameWithWorkers(tickers, timeFrame, workerCount = 128) {
    if (!this.timeFrames.includes(timeFrame)) {
      throw new Error(`Invalid timeFrame. Valid options: ${this.timeFrames.join(', ')}`);
    }

    console.log(`Starting ${timeFrame} technical analysis for ${tickers.length} tickers with ${workerCount} workers...`);

    const results = {
      success: [],
      failed: [],
      skipped: []
    };

    // Split tickers into chunks for workers
    const chunkSize = Math.ceil(tickers.length / workerCount);
    const chunks = [];
    for (let i = 0; i < tickers.length; i += chunkSize) {
      chunks.push(tickers.slice(i, i + chunkSize));
    }

    console.log(`Split ${tickers.length} tickers into ${chunks.length} chunks for ${timeFrame}`);

    // Process chunks in parallel
    const promises = chunks.map(async (chunk, index) => {
      const chunkResults = {
        success: [],
        failed: [],
        skipped: []
      };

      console.log(`Worker ${index + 1} processing ${chunk.length} tickers for ${timeFrame}...`);

      for (const ticker of chunk) {
        try {
          const result = await this.fetchTechnicalData(ticker, timeFrame);

          if (result.skipped) {
            chunkResults.skipped.push(result);
          } else {
            chunkResults.success.push(result);
          }

          // Small delay to avoid overwhelming the API
          await this.delay(100);
        } catch (error) {
          console.error(`Worker ${index + 1} failed for ${ticker} (${timeFrame}):`, error.message);
          chunkResults.failed.push({ ticker, timeFrame, error: error.message });
        }
      }

      console.log(`Worker ${index + 1} completed ${timeFrame}: ${chunkResults.success.length} success, ${chunkResults.failed.length} failed, ${chunkResults.skipped.length} skipped`);
      return chunkResults;
    });

    // Wait for all workers to complete
    const workerResults = await Promise.all(promises);

    // Combine results from all workers
    for (const workerResult of workerResults) {
      results.success.push(...workerResult.success);
      results.failed.push(...workerResult.failed);
      results.skipped.push(...workerResult.skipped);
    }

    const totalRecords = results.success.reduce((sum, result) => sum + (result.totalRecords || 0), 0);

    console.log(`Completed ${timeFrame} collection with workers. Success: ${results.success.length}, Failed: ${results.failed.length}, Skipped: ${results.skipped.length}, Total records: ${totalRecords}`);
    return {
      timeFrame,
      ...results,
      totalRecords
    };
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = TechnicalAnalysisService;
