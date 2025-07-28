const axios = require('axios');
const Ticker = require('../models/Ticker');
const DataCollectionLog = require('../models/DataCollectionLog');
require('dotenv').config();

class SimplizeApiService {
  constructor() {
    this.baseUrl = process.env.SIMPLIZE_API_BASE_URL || 'https://simplize.vn/_next/data/n0EN5WraCn9Bbeck4Eik9/co-phieu';
    this.endpoint = process.env.SIMPLIZE_API_ENDPOINT || '/ho-so-doanh-nghiep.json';
    this.maxRetries = parseInt(process.env.MAX_RETRY_ATTEMPTS) || 3;
    this.retryDelay = parseInt(process.env.RETRY_DELAY_MS) || 1000;
  }

  async fetchTickerData(ticker) {
    const url = `${this.baseUrl}/${ticker}${this.endpoint}`;
    let lastError = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`Fetching data for ${ticker} (attempt ${attempt}/${this.maxRetries})`);
        
        const response = await axios.get(url, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.9,vi;q=0.8',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });

        if (response.data && response.data.pageProps && response.data.pageProps.summary) {
          const summary = response.data.pageProps.summary;
          
          // Transform data to match our database schema
          const tickerData = this.transformApiData(summary);
          
          // Save to database
          const savedTicker = await Ticker.create(tickerData);
          
          // Log success
          await DataCollectionLog.create(ticker, 'SUCCESS', null, attempt - 1);
          
          console.log(`Successfully fetched and saved data for ${ticker}`);
          return savedTicker;
        } else {
          throw new Error('Invalid response structure');
        }
      } catch (error) {
        lastError = error;
        console.error(`Attempt ${attempt} failed for ${ticker}:`, error.message);
        
        if (attempt < this.maxRetries) {
          console.log(`Retrying in ${this.retryDelay}ms...`);
          await this.delay(this.retryDelay);
        }
      }
    }

    // Log failure after all retries
    await DataCollectionLog.create(ticker, 'FAILED', lastError.message, this.maxRetries);
    throw new Error(`Failed to fetch data for ${ticker} after ${this.maxRetries} attempts: ${lastError.message}`);
  }

  transformApiData(summary) {
    return {
      ticker: summary.ticker,
      nameVi: summary.nameVi || summary.name,
      nameEn: summary.nameEn,
      industryActivity: summary.industryActivity,
      bcIndustryGroupId: summary.bcIndustryGroupId,
      bcIndustryGroupSlug: summary.bcIndustryGroupSlug,
      bcIndustryGroupCode: summary.bcIndustryGroupCode,
      bcIndustryGroupType: summary.bcIndustryGroupType,
      bcEconomicSectorId: summary.bcEconomicSectorId,
      bcEconomicSectorSlug: summary.bcEconomicSectorSlug,
      bcEconomicSectorName: summary.bcEconomicSectorName,
      website: summary.website,
      mainService: summary.mainService,
      businessLine: summary.businessLine,
      businessStrategy: summary.businessStrategy,
      businessRisk: summary.businessRisk,
      businessOverall: summary.businessOverall,
      detailInfo: summary.detailInfo,
      marketCap: summary.marketCap,
      outstandingSharesValue: summary.outstandingSharesValue,
      analysisUpdated: summary.analysisUpdated,
      stockExchange: summary.stockExchange,
      noOfRecommendations: summary.noOfRecommendations,
      priceClose: summary.priceClose,
      isInWatchlist: summary.isInWatchlist,
      netChange: summary.netChange,
      pctChange: summary.pctChange,
      priceReferrance: summary.priceReferrance,
      priceOpen: summary.priceOpen,
      priceFloor: summary.priceFloor,
      priceLow: summary.priceLow,
      priceHigh: summary.priceHigh,
      priceCeiling: summary.priceCeiling,
      priceTimeStamp: summary.priceTimeStamp,
      priceType: summary.priceType,
      volume10dAvg: summary.volume10dAvg,
      volume: summary.volume,
      peRatio: summary.peRatio,
      pbRatio: summary.pbRatio,
      epsRatio: summary.epsRatio,
      evEbitdaRatio: summary.evEbitdaRatio,
      bookValue: summary.bookValue,
      freeFloatRate: summary.freeFloatRate,
      valuationPoint: summary.valuationPoint,
      growthPoint: summary.growthPoint,
      passPerformancePoint: summary.passPerformancePoint,
      financialHealthPoint: summary.financialHealthPoint,
      dividendPoint: summary.dividendPoint,
      imageUrl: summary.imageUrl,
      dividendYieldCurrent: summary.dividendYieldCurrent,
      beta5y: summary.beta5y,
      pricePctChg7d: summary.pricePctChg7d,
      pricePctChg30d: summary.pricePctChg30d,
      pricePctChgYtd: summary.pricePctChgYtd,
      pricePctChg1y: summary.pricePctChg1y,
      pricePctChg3y: summary.pricePctChg3y,
      pricePctChg5y: summary.pricePctChg5y,
      companyQuality: summary.companyQuality,
      overallRiskLevel: summary.overallRiskLevel,
      qualityValuation: summary.qualityValuation,
      taSignal1d: summary.taSignal1d,
      watchlistCount: summary.watchlistCount,
      roe: summary.roe,
      roa: summary.roa,
      revenue5yGrowth: summary.revenue5yGrowth,
      netIncome5yGrowth: summary.netIncome5yGrowth,
      revenueLtmGrowth: summary.revenueLtmGrowth,
      netIncomeLtmGrowth: summary.netIncomeLtmGrowth,
      revenueGrowthQoq: summary.revenueGrowthQoq,
      netIncomeGrowthQoq: summary.netIncomeGrowthQoq,
      type: summary.type,
      country: summary.country
    };
  }

  async fetchAllTickers(tickers) {
    const results = {
      success: [],
      failed: []
    };

    console.log(`Starting to fetch data for ${tickers.length} tickers`);

    for (let i = 0; i < tickers.length; i++) {
      const ticker = tickers[i];
      try {
        console.log(`Processing ${ticker} (${i + 1}/${tickers.length})`);
        const result = await this.fetchTickerData(ticker);
        results.success.push({ ticker, data: result });
        
        // Add delay between requests to avoid rate limiting
        if (i < tickers.length - 1) {
          await this.delay(500); // 500ms delay between requests
        }
      } catch (error) {
        console.error(`Failed to fetch ${ticker}:`, error.message);
        results.failed.push({ ticker, error: error.message });
      }
    }

    console.log(`Completed fetching data. Success: ${results.success.length}, Failed: ${results.failed.length}`);
    return results;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = SimplizeApiService;
