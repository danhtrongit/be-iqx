const axios = require('axios');
const HistoricalPrice = require('../models/HistoricalPrice');
const DataCollectionLog = require('../models/DataCollectionLog');
require('dotenv').config();

class HistoricalPriceService {
  constructor() {
    this.baseUrl = 'https://api2.simplize.vn/api/historical/quote/prices';
    this.maxRetries = parseInt(process.env.MAX_RETRY_ATTEMPTS) || 3;
    this.retryDelay = parseInt(process.env.RETRY_DELAY_MS) || 1000;
  }

  async fetchHistoricalPrices(ticker, page = 0, size = 5) {
    const isIndex = ticker === 'VNINDEX';
    let url = `${this.baseUrl}/${ticker}`;
    
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString()
    });

    if (isIndex) {
      params.append('type', 'index');
      params.append('domestic', 'true');
    }

    url += `?${params.toString()}`;

    let lastError = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`Fetching historical prices for ${ticker} (page ${page}, attempt ${attempt}/${this.maxRetries})`);
        
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
          const prices = response.data.data.map(price => ({
            ...price,
            ticker,
            type: isIndex ? 'index' : 'stock'
          }));

          // Save to database
          const savedPrices = [];
          for (const priceData of prices) {
            try {
              const saved = await HistoricalPrice.create(priceData);
              savedPrices.push(saved);
            } catch (error) {
              console.error(`Error saving price data for ${ticker} on ${new Date(priceData.date * 1000).toISOString()}:`, error.message);
            }
          }

          // Log success
          await DataCollectionLog.create(ticker, 'SUCCESS_HISTORICAL', null, attempt - 1);
          
          console.log(`Successfully fetched and saved ${savedPrices.length} historical prices for ${ticker}`);
          
          return {
            ticker,
            page,
            size,
            total: response.data.total,
            savedCount: savedPrices.length,
            data: savedPrices,
            hasMore: (page + 1) * size < response.data.total
          };
        } else {
          throw new Error('Invalid response structure or no data');
        }
      } catch (error) {
        lastError = error;
        console.error(`Attempt ${attempt} failed for ${ticker} historical prices:`, error.message);
        
        if (attempt < this.maxRetries) {
          console.log(`Retrying in ${this.retryDelay}ms...`);
          await this.delay(this.retryDelay);
        }
      }
    }

    // Log failure after all retries
    await DataCollectionLog.create(ticker, 'FAILED_HISTORICAL', lastError.message, this.maxRetries);
    throw new Error(`Failed to fetch historical prices for ${ticker} after ${this.maxRetries} attempts: ${lastError.message}`);
  }

  async fetchAllHistoricalPages(ticker, maxSize = 1000) {
    console.log(`Starting complete historical data collection for ${ticker}...`);
    
    let page = 0;
    let hasMore = true;
    let totalSaved = 0;
    const results = [];

    while (hasMore) {
      try {
        const result = await this.fetchHistoricalPrices(ticker, page, maxSize);
        results.push(result);
        totalSaved += result.savedCount;
        hasMore = result.hasMore;
        page++;

        console.log(`${ticker}: Page ${page} completed. Saved: ${result.savedCount}, Total: ${totalSaved}`);

        // Add delay between pages to avoid rate limiting
        if (hasMore) {
          await this.delay(500);
        }
      } catch (error) {
        console.error(`Failed to fetch page ${page} for ${ticker}:`, error.message);
        break;
      }
    }

    console.log(`Completed historical data collection for ${ticker}. Total saved: ${totalSaved} records`);
    
    return {
      ticker,
      totalPages: page,
      totalSaved,
      results
    };
  }

  async fetchRecentPrices(tickers, size = 5) {
    const results = {
      success: [],
      failed: []
    };

    console.log(`Starting recent prices collection for ${tickers.length} tickers (${size} records each)...`);

    for (let i = 0; i < tickers.length; i++) {
      const ticker = tickers[i];
      try {
        console.log(`Processing ${ticker} (${i + 1}/${tickers.length})`);
        const result = await this.fetchHistoricalPrices(ticker, 0, size);
        results.success.push(result);
        
        // Add delay between requests to avoid rate limiting
        if (i < tickers.length - 1) {
          await this.delay(200); // 200ms delay between requests
        }
      } catch (error) {
        console.error(`Failed to fetch recent prices for ${ticker}:`, error.message);
        results.failed.push({ ticker, error: error.message });
      }
    }

    console.log(`Completed recent prices collection. Success: ${results.success.length}, Failed: ${results.failed.length}`);
    return results;
  }

  async fetchAllHistoricalData(tickers) {
    const results = {
      success: [],
      failed: []
    };

    console.log(`Starting complete historical data collection for ${tickers.length} tickers...`);

    for (let i = 0; i < tickers.length; i++) {
      const ticker = tickers[i];
      try {
        console.log(`Processing complete history for ${ticker} (${i + 1}/${tickers.length})`);
        const result = await this.fetchAllHistoricalPages(ticker);
        results.success.push(result);
        
        // Add longer delay between tickers for complete data collection
        if (i < tickers.length - 1) {
          await this.delay(1000); // 1 second delay between tickers
        }
      } catch (error) {
        console.error(`Failed to fetch complete history for ${ticker}:`, error.message);
        results.failed.push({ ticker, error: error.message });
      }
    }

    console.log(`Completed all historical data collection. Success: ${results.success.length}, Failed: ${results.failed.length}`);
    return results;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = HistoricalPriceService;
