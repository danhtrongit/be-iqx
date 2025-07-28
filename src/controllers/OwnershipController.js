const Ownership = require('../models/Ownership');
const OwnershipService = require('../services/OwnershipService');
const { validationResult } = require('express-validator');

class OwnershipController {
  // Get ownership breakdown for a ticker
  static async getOwnershipBreakdown(req, res) {
    try {
      const { ticker } = req.params;

      if (!ticker) {
        return res.status(400).json({
          success: false,
          error: 'Ticker symbol is required'
        });
      }

      const ownershipData = await Ownership.findOwnershipBreakdownByTicker(ticker.toUpperCase());

      if (ownershipData.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'No ownership data found for this ticker'
        });
      }

      // Group by level for better structure
      const level1 = ownershipData.filter(item => item.level === 1);
      const level2 = ownershipData.filter(item => item.level === 2);

      // Structure the response similar to API format
      const structuredData = level1.map(parent => ({
        investorType: parent.investor_type,
        pctOfSharesOutHeldTier: parseFloat(parent.pct_of_shares_out_held_tier),
        children: level2
          .filter(child => child.parent_investor_type === parent.investor_type)
          .map(child => ({
            investorType: child.investor_type,
            pctOfSharesOutHeldTier: parseFloat(child.pct_of_shares_out_held_tier)
          }))
      }));

      res.json({
        success: true,
        data: {
          ticker: ticker.toUpperCase(),
          ownershipBreakdown: structuredData,
          lastUpdated: ownershipData[0]?.updated_at
        }
      });
    } catch (error) {
      console.error('Error getting ownership breakdown:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  // Get major shareholders for a ticker
  static async getMajorShareholders(req, res) {
    try {
      const { ticker } = req.params;
      const limit = Math.min(parseInt(req.query.limit) || 20, 100);

      if (!ticker) {
        return res.status(400).json({
          success: false,
          error: 'Ticker symbol is required'
        });
      }

      const shareholders = await Ownership.findMajorShareholdersByTicker(ticker.toUpperCase(), limit);

      res.json({
        success: true,
        data: {
          ticker: ticker.toUpperCase(),
          count: shareholders.length,
          shareholders: shareholders.map(shareholder => ({
            investorFullName: shareholder.investor_full_name,
            pctOfSharesOutHeld: parseFloat(shareholder.pct_of_shares_out_held),
            sharesHeld: parseInt(shareholder.shares_held),
            currentValue: parseInt(shareholder.current_value),
            changeValue: shareholder.change_value,
            countryOfInvestor: shareholder.country_of_investor
          }))
        }
      });
    } catch (error) {
      console.error('Error getting major shareholders:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  // Get fund holdings for a ticker
  static async getFundHoldings(req, res) {
    try {
      const { ticker } = req.params;
      const limit = Math.min(parseInt(req.query.limit) || 50, 100);

      if (!ticker) {
        return res.status(400).json({
          success: false,
          error: 'Ticker symbol is required'
        });
      }

      const fundHoldings = await Ownership.findFundHoldingsByTicker(ticker.toUpperCase(), limit);

      res.json({
        success: true,
        data: {
          ticker: ticker.toUpperCase(),
          count: fundHoldings.length,
          fundHoldings: fundHoldings.map(fund => ({
            fundId: fund.fund_id,
            fundCode: fund.fund_code,
            fundName: fund.fund_name,
            issuer: fund.issuer,
            fillingDate: fund.filling_date,
            sharesHeld: parseInt(fund.shares_held),
            sharesHeldValueVnd: parseInt(fund.shares_held_value_vnd),
            pctPortfolio: parseFloat(fund.pct_portfolio),
            imageUrl: fund.image_url
          }))
        }
      });
    } catch (error) {
      console.error('Error getting fund holdings:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  // Get complete ownership data for a ticker
  static async getCompleteOwnership(req, res) {
    try {
      const { ticker } = req.params;

      if (!ticker) {
        return res.status(400).json({
          success: false,
          error: 'Ticker symbol is required'
        });
      }

      const tickerUpper = ticker.toUpperCase();

      // Get all ownership data
      const [ownershipBreakdown, majorShareholders, fundHoldings] = await Promise.all([
        Ownership.findOwnershipBreakdownByTicker(tickerUpper),
        Ownership.findMajorShareholdersByTicker(tickerUpper, 20),
        Ownership.findFundHoldingsByTicker(tickerUpper, 50)
      ]);

      if (ownershipBreakdown.length === 0 && majorShareholders.length === 0 && fundHoldings.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'No ownership data found for this ticker'
        });
      }

      // Structure ownership breakdown
      const level1 = ownershipBreakdown.filter(item => item.level === 1);
      const level2 = ownershipBreakdown.filter(item => item.level === 2);

      const structuredOwnership = level1.map(parent => ({
        investorType: parent.investor_type,
        pctOfSharesOutHeldTier: parseFloat(parent.pct_of_shares_out_held_tier),
        children: level2
          .filter(child => child.parent_investor_type === parent.investor_type)
          .map(child => ({
            investorType: child.investor_type,
            pctOfSharesOutHeldTier: parseFloat(child.pct_of_shares_out_held_tier)
          }))
      }));

      res.json({
        success: true,
        data: {
          ticker: tickerUpper,
          ownershipBreakdown: structuredOwnership,
          majorShareholders: majorShareholders.map(shareholder => ({
            investorFullName: shareholder.investor_full_name,
            pctOfSharesOutHeld: parseFloat(shareholder.pct_of_shares_out_held),
            sharesHeld: parseInt(shareholder.shares_held),
            currentValue: parseInt(shareholder.current_value),
            changeValue: shareholder.change_value,
            countryOfInvestor: shareholder.country_of_investor
          })),
          fundHoldings: fundHoldings.map(fund => ({
            fundId: fund.fund_id,
            fundCode: fund.fund_code,
            fundName: fund.fund_name,
            issuer: fund.issuer,
            fillingDate: fund.filling_date,
            sharesHeld: parseInt(fund.shares_held),
            sharesHeldValueVnd: parseInt(fund.shares_held_value_vnd),
            pctPortfolio: parseFloat(fund.pct_portfolio),
            imageUrl: fund.image_url
          })),
          summary: {
            hasOwnershipBreakdown: structuredOwnership.length > 0,
            majorShareholdersCount: majorShareholders.length,
            fundHoldingsCount: fundHoldings.length
          }
        }
      });
    } catch (error) {
      console.error('Error getting complete ownership:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  // Get ownership statistics
  static async getStatistics(req, res) {
    try {
      const stats = await Ownership.getOwnershipStatistics();
      const tickersWithData = await Ownership.getTickersWithOwnershipData();

      res.json({
        success: true,
        data: {
          totalTickersWithOwnership: parseInt(stats.total_tickers_with_ownership),
          totalOwnershipRecords: parseInt(stats.total_ownership_records),
          tickersWithShareholders: parseInt(stats.tickers_with_shareholders),
          totalShareholders: parseInt(stats.total_shareholders),
          tickersWithFunds: parseInt(stats.tickers_with_funds),
          totalFundHoldings: parseInt(stats.total_fund_holdings),
          tickersWithData: tickersWithData
        }
      });
    } catch (error) {
      console.error('Error getting ownership statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  // Trigger ownership data collection
  static async triggerOwnershipCollection(req, res) {
    try {
      const { tickers } = req.body;

      if (!tickers || !Array.isArray(tickers)) {
        return res.status(400).json({
          success: false,
          error: 'Tickers array is required'
        });
      }

      const ownershipService = new OwnershipService();
      const result = await ownershipService.fetchOwnershipForTickers(tickers);

      res.json({
        success: true,
        message: 'Ownership data collection completed',
        data: {
          totalTickers: tickers.length,
          successCount: result.success.length,
          failedCount: result.failed.length,
          totalRecords: result.totalRecords,
          results: result
        }
      });
    } catch (error) {
      console.error('Error during ownership collection:', error);
      res.status(500).json({
        success: false,
        error: 'Ownership collection failed',
        message: error.message
      });
    }
  }
}

module.exports = OwnershipController;
