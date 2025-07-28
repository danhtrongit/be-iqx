const axios = require('axios');
const Ownership = require('../models/Ownership');
const DataCollectionLog = require('../models/DataCollectionLog');
require('dotenv').config();

class OwnershipService {
  constructor() {
    this.baseUrl = 'https://api2.simplize.vn/api/company/ownership/ownership-breakdown';
    this.maxRetries = parseInt(process.env.MAX_RETRY_ATTEMPTS) || 3;
    this.retryDelay = parseInt(process.env.RETRY_DELAY_MS) || 1000;
  }

  async fetchOwnershipData(ticker) {
    const url = `${this.baseUrl}/${ticker}`;
    let lastError = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`Fetching ownership data for ${ticker} (attempt ${attempt}/${this.maxRetries})`);
        
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
          const ownershipData = response.data.data;
          
          // Process ownership breakdown
          const ownershipBreakdown = [];
          
          // Process main categories (level 1)
          for (const mainCategory of ownershipData) {
            ownershipBreakdown.push({
              ticker,
              investorType: mainCategory.investorType,
              pctOfSharesOutHeldTier: mainCategory.pctOfSharesOutHeldTier,
              parentInvestorType: null,
              level: 1
            });

            // Process subcategories (level 2)
            if (mainCategory.children && mainCategory.children.length > 0) {
              for (const subCategory of mainCategory.children) {
                ownershipBreakdown.push({
                  ticker,
                  investorType: subCategory.investorType,
                  pctOfSharesOutHeldTier: subCategory.pctOfSharesOutHeldTier,
                  parentInvestorType: mainCategory.investorType,
                  level: 2
                });
              }
            }
          }

          // Save ownership breakdown to database
          const savedOwnership = await Ownership.bulkCreateOwnershipBreakdown(ownershipBreakdown);

          // Now fetch major shareholders and fund holdings
          const shareholdersData = await this.fetchMajorShareholders(ticker);
          
          // Log success
          await DataCollectionLog.create(ticker, 'SUCCESS_OWNERSHIP', null, attempt - 1);
          
          console.log(`Successfully fetched and saved ownership data for ${ticker}`);
          
          return {
            ticker,
            ownershipBreakdown: savedOwnership,
            majorShareholders: shareholdersData.majorShareholders,
            fundHoldings: shareholdersData.fundHoldings,
            totalRecords: savedOwnership.length + shareholdersData.totalRecords
          };
        } else {
          throw new Error('Invalid response structure or no data');
        }
      } catch (error) {
        lastError = error;
        console.error(`Attempt ${attempt} failed for ${ticker} ownership:`, error.message);
        
        if (attempt < this.maxRetries) {
          console.log(`Retrying in ${this.retryDelay}ms...`);
          await this.delay(this.retryDelay);
        }
      }
    }

    // Log failure after all retries
    await DataCollectionLog.create(ticker, 'FAILED_OWNERSHIP', lastError.message, this.maxRetries);
    throw new Error(`Failed to fetch ownership data for ${ticker} after ${this.maxRetries} attempts: ${lastError.message}`);
  }

  async fetchMajorShareholders(ticker) {
    const url = `https://api2.simplize.vn/api/company/ownership/shareholder-fund-details/${ticker}`;
    
    try {
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
        let totalRecords = 0;

        // Process major shareholders
        const majorShareholders = [];
        if (data.shareholderDetails && data.shareholderDetails.length > 0) {
          for (const shareholder of data.shareholderDetails) {
            const shareholderData = {
              ticker,
              investorFullName: shareholder.investorFullName,
              pctOfSharesOutHeld: shareholder.pctOfSharesOutHeld,
              sharesHeld: shareholder.sharesHeld,
              currentValue: shareholder.currentValue,
              changeValue: shareholder.changeValue,
              countryOfInvestor: shareholder.countryOfInvestor
            };
            
            const saved = await Ownership.createMajorShareholder(shareholderData);
            majorShareholders.push(saved);
            totalRecords++;
          }
        }

        // Process fund holdings
        const fundHoldings = [];
        if (data.fundHoldings && data.fundHoldings.length > 0) {
          for (const fund of data.fundHoldings) {
            const fundData = {
              ticker,
              fundId: fund.fundId,
              fundCode: fund.fundCode,
              fundName: fund.fundName,
              issuer: fund.issuer,
              fillingDate: fund.fillingDate,
              sharesHeld: fund.sharesHeld,
              sharesHeldValueVnd: fund.sharesHeldValueVnd,
              pctPortfolio: fund.pctPortfolio,
              imageUrl: fund.imageUrl
            };
            
            const saved = await Ownership.createFundHolding(fundData);
            fundHoldings.push(saved);
            totalRecords++;
          }
        }

        return {
          majorShareholders,
          fundHoldings,
          totalRecords
        };
      } else {
        console.log(`No major shareholders data found for ${ticker}`);
        return {
          majorShareholders: [],
          fundHoldings: [],
          totalRecords: 0
        };
      }
    } catch (error) {
      console.error(`Error fetching major shareholders for ${ticker}:`, error.message);
      return {
        majorShareholders: [],
        fundHoldings: [],
        totalRecords: 0
      };
    }
  }

  async fetchOwnershipForTickers(tickers) {
    const results = {
      success: [],
      failed: []
    };

    console.log(`Starting ownership data collection for ${tickers.length} tickers...`);

    for (let i = 0; i < tickers.length; i++) {
      const ticker = tickers[i];
      try {
        console.log(`Processing ownership for ${ticker} (${i + 1}/${tickers.length})`);
        const result = await this.fetchOwnershipData(ticker);
        results.success.push(result);
        
        // Add delay between requests to avoid rate limiting
        if (i < tickers.length - 1) {
          await this.delay(500); // 500ms delay between requests
        }
      } catch (error) {
        console.error(`Failed to fetch ownership for ${ticker}:`, error.message);
        results.failed.push({ ticker, error: error.message });
      }
    }

    const totalRecords = results.success.reduce((sum, result) => sum + result.totalRecords, 0);
    
    console.log(`Completed ownership collection. Success: ${results.success.length}, Failed: ${results.failed.length}, Total records: ${totalRecords}`);
    return {
      ...results,
      totalRecords
    };
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = OwnershipService;
