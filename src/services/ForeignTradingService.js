const axios = require('axios');
const ForeignTrading = require('../models/ForeignTrading');
const DataCollectionLog = require('../models/DataCollectionLog');
require('dotenv').config();

class ForeignTradingService {
  constructor() {
    this.spreadsheetId = '1ekb2bYAQJZbtmqMUzsagb4uWBdtkAzTq3kuIMHQ22RI';
    this.range = 'ChartMuaBan!A1:Z1605';
    this.apiKey = 'AIzaSyB9PPBCGbWFv1TxH_8s_AsiqiChLs9MqXU';
    this.baseUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
    this.maxRetries = parseInt(process.env.MAX_RETRY_ATTEMPTS) || 3;
    this.retryDelay = parseInt(process.env.RETRY_DELAY_MS) || 1000;
  }

  async fetchForeignTradingData() {
    const url = `${this.baseUrl}/${this.spreadsheetId}/values/${this.range}?key=${this.apiKey}`;
    let lastError = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`Fetching foreign trading data from Google Sheets (attempt ${attempt}/${this.maxRetries})`);
        
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
          const foreignData = [];
          for (let i = 1; i < values.length; i++) {
            const row = values[i];
            if (row && row.length >= 5 && row[0]) {
              const symbol = row[0].toString().trim().toUpperCase();
              
              // Parse foreign trading values
              const foreignBuyVolume = this.parseNumber(row[1]);
              const foreignBuyValue = this.parseNumber(row[2]);
              const foreignSellVolume = this.parseNumber(row[3]);
              const foreignSellValue = this.parseNumber(row[4]);

              foreignData.push({
                symbol,
                foreignBuyVolume,
                foreignBuyValue,
                foreignSellVolume,
                foreignSellValue,
                dataSource: 'google_sheets',
                sheetRange: this.range
              });
            }
          }

          // Save to database
          console.log(`Processing ${foreignData.length} foreign trading records...`);
          const savedData = await ForeignTrading.bulkCreateOrUpdate(foreignData);

          // Log success
          await DataCollectionLog.create('FOREIGN_TRADING', 'SUCCESS_SHEETS', null, attempt - 1);
          
          console.log(`Successfully fetched and saved ${savedData.length} foreign trading records`);
          
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
        console.error(`Attempt ${attempt} failed for foreign trading data:`, error.message);
        
        if (attempt < this.maxRetries) {
          console.log(`Retrying in ${this.retryDelay}ms...`);
          await this.delay(this.retryDelay);
        }
      }
    }

    // Log failure after all retries
    await DataCollectionLog.create('FOREIGN_TRADING', 'FAILED_SHEETS', lastError.message, this.maxRetries);
    throw new Error(`Failed to fetch foreign trading data after ${this.maxRetries} attempts: ${lastError.message}`);
  }

  parseNumber(value) {
    if (!value || value === '0' || value === '') {
      return 0;
    }
    
    try {
      // Remove commas and parse as integer
      const cleanValue = value.toString().replace(/,/g, '');
      const parsed = parseInt(cleanValue);
      return isNaN(parsed) ? 0 : parsed;
    } catch (error) {
      console.warn(`Error parsing number: ${value}`, error.message);
      return 0;
    }
  }

  async calculateStatistics(data) {
    const totalBuyValue = data.reduce((sum, item) => sum + (item.foreign_buy_value || 0), 0);
    const totalSellValue = data.reduce((sum, item) => sum + (item.foreign_sell_value || 0), 0);
    const totalBuyVolume = data.reduce((sum, item) => sum + (item.foreign_buy_volume || 0), 0);
    const totalSellVolume = data.reduce((sum, item) => sum + (item.foreign_sell_volume || 0), 0);
    
    const netBuySymbols = data.filter(item => (item.foreign_buy_value || 0) > (item.foreign_sell_value || 0)).length;
    const netSellSymbols = data.filter(item => (item.foreign_sell_value || 0) > (item.foreign_buy_value || 0)).length;
    const neutralSymbols = data.filter(item => (item.foreign_buy_value || 0) === (item.foreign_sell_value || 0)).length;

    return {
      totalSymbols: data.length,
      netBuySymbols,
      netSellSymbols,
      neutralSymbols,
      totalBuyValue,
      totalSellValue,
      totalBuyVolume,
      totalSellVolume,
      netValue: totalBuyValue - totalSellValue,
      netVolume: totalBuyVolume - totalSellVolume,
      avgBuyValue: data.length > 0 ? Math.round(totalBuyValue / data.length) : 0,
      avgSellValue: data.length > 0 ? Math.round(totalSellValue / data.length) : 0,
      distribution: {
        netBuyPercent: parseFloat(((netBuySymbols / data.length) * 100).toFixed(2)),
        netSellPercent: parseFloat(((netSellSymbols / data.length) * 100).toFixed(2)),
        neutralPercent: parseFloat(((neutralSymbols / data.length) * 100).toFixed(2))
      }
    };
  }

  async getTopNetBuyers(limit = 20, stockExchange = null) {
    try {
      const topBuyers = await ForeignTrading.getTopNetBuyers(limit, stockExchange);
      return {
        type: 'net_buyers',
        limit,
        stockExchange,
        count: topBuyers.length,
        symbols: topBuyers.map(item => ({
          symbol: item.symbol,
          foreignBuyVolume: parseInt(item.foreign_buy_volume),
          foreignBuyValue: parseInt(item.foreign_buy_value),
          foreignSellVolume: parseInt(item.foreign_sell_volume),
          foreignSellValue: parseInt(item.foreign_sell_value),
          netValue: parseInt(item.net_value),
          netVolume: parseInt(item.net_volume),
          stockExchange: item.stock_exchange,
          nameVi: item.name_vi,
          priceClose: item.price_close ? parseFloat(item.price_close) : null,
          lastUpdated: item.updated_at
        }))
      };
    } catch (error) {
      console.error('Error getting top net buyers:', error);
      throw error;
    }
  }

  async getTopNetSellers(limit = 20, stockExchange = null) {
    try {
      const topSellers = await ForeignTrading.getTopNetSellers(limit, stockExchange);
      return {
        type: 'net_sellers',
        limit,
        stockExchange,
        count: topSellers.length,
        symbols: topSellers.map(item => ({
          symbol: item.symbol,
          foreignBuyVolume: parseInt(item.foreign_buy_volume),
          foreignBuyValue: parseInt(item.foreign_buy_value),
          foreignSellVolume: parseInt(item.foreign_sell_volume),
          foreignSellValue: parseInt(item.foreign_sell_value),
          netSellValue: parseInt(item.net_sell_value),
          netSellVolume: parseInt(item.net_sell_volume),
          stockExchange: item.stock_exchange,
          nameVi: item.name_vi,
          priceClose: item.price_close ? parseFloat(item.price_close) : null,
          lastUpdated: item.updated_at
        }))
      };
    } catch (error) {
      console.error('Error getting top net sellers:', error);
      throw error;
    }
  }

  async getForeignTradingStatistics() {
    try {
      const stats = await ForeignTrading.getStatistics();
      return {
        totalSymbols: parseInt(stats.total_symbols),
        netBuySymbols: parseInt(stats.net_buy_symbols),
        netSellSymbols: parseInt(stats.net_sell_symbols),
        neutralSymbols: parseInt(stats.neutral_symbols),
        totalBuyValue: parseInt(stats.total_buy_value || 0),
        totalSellValue: parseInt(stats.total_sell_value || 0),
        totalBuyVolume: parseInt(stats.total_buy_volume || 0),
        totalSellVolume: parseInt(stats.total_sell_volume || 0),
        totalNetValue: parseInt(stats.total_net_value || 0),
        totalNetVolume: parseInt(stats.total_net_volume || 0),
        avgBuyValue: parseFloat(stats.avg_buy_value || 0),
        avgSellValue: parseFloat(stats.avg_sell_value || 0),
        maxBuyValue: parseInt(stats.max_buy_value || 0),
        maxSellValue: parseInt(stats.max_sell_value || 0),
        lastUpdated: stats.last_updated,
        distribution: {
          netBuyPercent: parseFloat(((parseInt(stats.net_buy_symbols) / parseInt(stats.total_symbols)) * 100).toFixed(2)),
          netSellPercent: parseFloat(((parseInt(stats.net_sell_symbols) / parseInt(stats.total_symbols)) * 100).toFixed(2)),
          neutralPercent: parseFloat(((parseInt(stats.neutral_symbols) / parseInt(stats.total_symbols)) * 100).toFixed(2))
        }
      };
    } catch (error) {
      console.error('Error getting foreign trading statistics:', error);
      throw error;
    }
  }

  async getStatisticsByExchange(stockExchange = null) {
    try {
      const stats = await ForeignTrading.getStatisticsByExchange(stockExchange);
      return {
        stockExchange: stats.stock_exchange,
        totalSymbols: parseInt(stats.total_symbols),
        netBuySymbols: parseInt(stats.net_buy_symbols),
        netSellSymbols: parseInt(stats.net_sell_symbols),
        neutralSymbols: parseInt(stats.neutral_symbols),
        totalBuyValue: parseInt(stats.total_buy_value || 0),
        totalSellValue: parseInt(stats.total_sell_value || 0),
        totalNetValue: parseInt(stats.total_net_value || 0),
        avgBuyValue: parseFloat(stats.avg_buy_value || 0),
        avgSellValue: parseFloat(stats.avg_sell_value || 0),
        lastUpdated: stats.last_updated,
        distribution: {
          netBuyPercent: parseFloat(((parseInt(stats.net_buy_symbols) / parseInt(stats.total_symbols)) * 100).toFixed(2)),
          netSellPercent: parseFloat(((parseInt(stats.net_sell_symbols) / parseInt(stats.total_symbols)) * 100).toFixed(2)),
          neutralPercent: parseFloat(((parseInt(stats.neutral_symbols) / parseInt(stats.total_symbols)) * 100).toFixed(2))
        }
      };
    } catch (error) {
      console.error('Error getting statistics by exchange:', error);
      throw error;
    }
  }

  async searchByValueRange(minValue, maxValue, type = 'net', limit = 100) {
    try {
      const results = await ForeignTrading.findByValueRange(minValue, maxValue, type, limit);
      return {
        range: { min: minValue, max: maxValue, type },
        count: results.length,
        symbols: results.map(item => ({
          symbol: item.symbol,
          foreignBuyVolume: parseInt(item.foreign_buy_volume),
          foreignBuyValue: parseInt(item.foreign_buy_value),
          foreignSellVolume: parseInt(item.foreign_sell_volume),
          foreignSellValue: parseInt(item.foreign_sell_value),
          netValue: parseInt(item.net_value),
          netVolume: parseInt(item.net_volume),
          stockExchange: item.stock_exchange,
          nameVi: item.name_vi,
          priceClose: item.price_close ? parseFloat(item.price_close) : null,
          lastUpdated: item.updated_at
        }))
      };
    } catch (error) {
      console.error('Error searching by value range:', error);
      throw error;
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = ForeignTradingService;
