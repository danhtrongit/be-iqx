const axios = require('axios');
const ImpactIndex = require('../models/ImpactIndex');
const DataCollectionLog = require('../models/DataCollectionLog');
require('dotenv').config();

class ImpactIndexService {
  constructor() {
    this.spreadsheetId = '1ekb2bYAQJZbtmqMUzsagb4uWBdtkAzTq3kuIMHQ22RI';
    this.range = 'CoPhieuAnhHuong!A1:Z1605';
    this.apiKey = 'AIzaSyB9PPBCGbWFv1TxH_8s_AsiqiChLs9MqXU';
    this.baseUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
    this.maxRetries = parseInt(process.env.MAX_RETRY_ATTEMPTS) || 3;
    this.retryDelay = parseInt(process.env.RETRY_DELAY_MS) || 1000;
  }

  async fetchImpactIndexData() {
    const url = `${this.baseUrl}/${this.spreadsheetId}/values/${this.range}?key=${this.apiKey}`;
    let lastError = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`Fetching impact index data from Google Sheets (attempt ${attempt}/${this.maxRetries})`);
        
        const response = await axios.get(url, {
          timeout: 30000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'application/json',
            'Accept-Language': 'en-US,en;q=0.9,vi;q=0.8'
          }
        });

        if (response.data && response.data.values) {
          const values = response.data.values;
          
          // Skip header row and process data
          const impactData = [];
          for (let i = 1; i < values.length; i++) {
            const row = values[i];
            if (row && row.length >= 2 && row[0] && row[1] !== undefined) {
              const symbol = row[0].toString().trim().toUpperCase();
              const impactIndexStr = row[1].toString().trim();
              
              // Parse impact index (handle comma as decimal separator)
              let impactIndex = 0;
              if (impactIndexStr && impactIndexStr !== '0') {
                try {
                  // Replace comma with dot for decimal parsing
                  const normalizedValue = impactIndexStr.replace(',', '.');
                  impactIndex = parseFloat(normalizedValue);
                  
                  // Validate the parsed value
                  if (isNaN(impactIndex)) {
                    console.warn(`Invalid impact index for ${symbol}: ${impactIndexStr}`);
                    impactIndex = 0;
                  }
                } catch (error) {
                  console.warn(`Error parsing impact index for ${symbol}: ${impactIndexStr}`, error.message);
                  impactIndex = 0;
                }
              }

              impactData.push({
                symbol,
                impactIndex,
                dataSource: 'google_sheets',
                sheetRange: this.range
              });
            }
          }

          // Save to database
          console.log(`Processing ${impactData.length} impact index records...`);
          const savedData = await ImpactIndex.bulkCreateOrUpdate(impactData);

          // Log success
          await DataCollectionLog.create('IMPACT_INDEX', 'SUCCESS_SHEETS', null, attempt - 1);
          
          console.log(`Successfully fetched and saved ${savedData.length} impact index records`);
          
          return {
            totalRecords: savedData.length,
            range: response.data.range,
            majorDimension: response.data.majorDimension,
            dataSource: 'google_sheets',
            spreadsheetId: this.spreadsheetId,
            savedData: savedData.slice(0, 10), // Return first 10 for preview
            statistics: await this.calculateStatistics(savedData)
          };
        } else {
          throw new Error('Invalid response structure or no data');
        }
      } catch (error) {
        lastError = error;
        console.error(`Attempt ${attempt} failed for impact index data:`, error.message);
        
        if (attempt < this.maxRetries) {
          console.log(`Retrying in ${this.retryDelay}ms...`);
          await this.delay(this.retryDelay);
        }
      }
    }

    // Log failure after all retries
    await DataCollectionLog.create('IMPACT_INDEX', 'FAILED_SHEETS', lastError.message, this.maxRetries);
    throw new Error(`Failed to fetch impact index data after ${this.maxRetries} attempts: ${lastError.message}`);
  }

  async calculateStatistics(data) {
    const values = data.map(item => item.impact_index || 0).filter(val => !isNaN(val));
    
    if (values.length === 0) {
      return {
        count: 0,
        positive: 0,
        negative: 0,
        neutral: 0,
        max: 0,
        min: 0,
        average: 0
      };
    }

    const positive = values.filter(v => v > 0).length;
    const negative = values.filter(v => v < 0).length;
    const neutral = values.filter(v => v === 0).length;
    const max = Math.max(...values);
    const min = Math.min(...values);
    const average = values.reduce((sum, val) => sum + val, 0) / values.length;

    return {
      count: values.length,
      positive,
      negative,
      neutral,
      max: parseFloat(max.toFixed(8)),
      min: parseFloat(min.toFixed(8)),
      average: parseFloat(average.toFixed(8)),
      positivePercent: parseFloat(((positive / values.length) * 100).toFixed(2)),
      negativePercent: parseFloat(((negative / values.length) * 100).toFixed(2)),
      neutralPercent: parseFloat(((neutral / values.length) * 100).toFixed(2))
    };
  }

  async getTopImpactSymbols(limit = 20, type = 'positive', stockExchange = null) {
    try {
      const topSymbols = await ImpactIndex.getTopImpact(limit, type, stockExchange);
      return {
        type,
        limit,
        stockExchange,
        count: topSymbols.length,
        symbols: topSymbols.map(item => ({
          symbol: item.symbol,
          impactIndex: parseFloat(item.impact_index),
          absImpact: parseFloat(item.abs_impact),
          stockExchange: item.stock_exchange,
          nameVi: item.name_vi,
          priceClose: item.price_close ? parseFloat(item.price_close) : null,
          lastUpdated: item.updated_at
        }))
      };
    } catch (error) {
      console.error('Error getting top impact symbols:', error);
      throw error;
    }
  }

  async getImpactStatistics() {
    try {
      const stats = await ImpactIndex.getStatistics();
      return {
        totalSymbols: parseInt(stats.total_symbols),
        positiveImpact: parseInt(stats.positive_impact),
        negativeImpact: parseInt(stats.negative_impact),
        neutralImpact: parseInt(stats.neutral_impact),
        maxImpact: parseFloat(stats.max_impact || 0),
        minImpact: parseFloat(stats.min_impact || 0),
        avgImpact: parseFloat(stats.avg_impact || 0),
        stddevImpact: parseFloat(stats.stddev_impact || 0),
        lastUpdated: stats.last_updated,
        distribution: {
          positivePercent: parseFloat(((parseInt(stats.positive_impact) / parseInt(stats.total_symbols)) * 100).toFixed(2)),
          negativePercent: parseFloat(((parseInt(stats.negative_impact) / parseInt(stats.total_symbols)) * 100).toFixed(2)),
          neutralPercent: parseFloat(((parseInt(stats.neutral_impact) / parseInt(stats.total_symbols)) * 100).toFixed(2))
        }
      };
    } catch (error) {
      console.error('Error getting impact statistics:', error);
      throw error;
    }
  }

  async searchByImpactRange(minImpact, maxImpact, limit = 100) {
    try {
      const results = await ImpactIndex.findByImpactRange(minImpact, maxImpact, limit);
      return {
        range: { min: minImpact, max: maxImpact },
        count: results.length,
        symbols: results.map(item => ({
          symbol: item.symbol,
          impactIndex: parseFloat(item.impact_index),
          lastUpdated: item.updated_at
        }))
      };
    } catch (error) {
      console.error('Error searching by impact range:', error);
      throw error;
    }
  }

  async getVolatileSymbols(limit = 20, stockExchange = null) {
    try {
      const volatileSymbols = await ImpactIndex.getVolatileSymbols(limit, stockExchange);
      return {
        limit,
        stockExchange,
        count: volatileSymbols.length,
        symbols: volatileSymbols.map(item => ({
          symbol: item.symbol,
          impactIndex: parseFloat(item.impact_index),
          absImpact: parseFloat(item.abs_impact),
          volatilityLevel: item.volatility_level,
          stockExchange: item.stock_exchange,
          nameVi: item.name_vi,
          priceClose: item.price_close ? parseFloat(item.price_close) : null,
          lastUpdated: item.updated_at
        }))
      };
    } catch (error) {
      console.error('Error getting volatile symbols:', error);
      throw error;
    }
  }

  async getStatisticsByExchange(stockExchange = null) {
    try {
      const stats = await ImpactIndex.getStatisticsByExchange(stockExchange);
      return {
        stockExchange: stats.stock_exchange,
        totalSymbols: parseInt(stats.total_symbols),
        positiveImpact: parseInt(stats.positive_impact),
        negativeImpact: parseInt(stats.negative_impact),
        neutralImpact: parseInt(stats.neutral_impact),
        maxImpact: parseFloat(stats.max_impact || 0),
        minImpact: parseFloat(stats.min_impact || 0),
        avgImpact: parseFloat(stats.avg_impact || 0),
        stddevImpact: parseFloat(stats.stddev_impact || 0),
        lastUpdated: stats.last_updated,
        distribution: {
          positivePercent: parseFloat(((parseInt(stats.positive_impact) / parseInt(stats.total_symbols)) * 100).toFixed(2)),
          negativePercent: parseFloat(((parseInt(stats.negative_impact) / parseInt(stats.total_symbols)) * 100).toFixed(2)),
          neutralPercent: parseFloat(((parseInt(stats.neutral_impact) / parseInt(stats.total_symbols)) * 100).toFixed(2))
        }
      };
    } catch (error) {
      console.error('Error getting statistics by exchange:', error);
      throw error;
    }
  }

  async getAvailableExchanges() {
    try {
      const exchanges = await ImpactIndex.getAvailableExchanges();
      return {
        count: exchanges.length,
        exchanges: exchanges.map(exchange => ({
          stockExchange: exchange.stock_exchange,
          symbolCount: parseInt(exchange.symbol_count),
          positiveCount: parseInt(exchange.positive_count),
          negativeCount: parseInt(exchange.negative_count),
          neutralCount: parseInt(exchange.neutral_count),
          avgImpact: parseFloat(exchange.avg_impact || 0),
          maxAbsImpact: parseFloat(exchange.max_abs_impact || 0),
          distribution: {
            positivePercent: parseFloat(((parseInt(exchange.positive_count) / parseInt(exchange.symbol_count)) * 100).toFixed(2)),
            negativePercent: parseFloat(((parseInt(exchange.negative_count) / parseInt(exchange.symbol_count)) * 100).toFixed(2)),
            neutralPercent: parseFloat(((parseInt(exchange.neutral_count) / parseInt(exchange.symbol_count)) * 100).toFixed(2))
          }
        }))
      };
    } catch (error) {
      console.error('Error getting available exchanges:', error);
      throw error;
    }
  }

  async getSymbolRanking(symbol, stockExchange) {
    try {
      const ranking = await ImpactIndex.getRankingByExchange(symbol, stockExchange);
      if (!ranking) {
        return null;
      }

      return {
        symbol: ranking.symbol,
        stockExchange: stockExchange.toUpperCase(),
        impactIndex: parseFloat(ranking.impact_index),
        totalSymbols: parseInt(ranking.total_symbols),
        rankings: {
          positive: {
            rank: parseInt(ranking.positive_rank),
            percentile: parseFloat(ranking.positive_percentile)
          },
          negative: {
            rank: parseInt(ranking.negative_rank),
            percentile: parseFloat(ranking.negative_percentile)
          },
          absolute: {
            rank: parseInt(ranking.absolute_rank),
            percentile: parseFloat(ranking.absolute_percentile)
          }
        }
      };
    } catch (error) {
      console.error('Error getting symbol ranking:', error);
      throw error;
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = ImpactIndexService;
