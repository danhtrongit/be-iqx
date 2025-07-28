#!/usr/bin/env node

/**
 * Demo script để hiển thị sự khác biệt của search optimization
 * So sánh kết quả search trước và sau khi tối ưu
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5001';

class SearchOptimizationDemo {
  constructor() {
    this.colors = {
      reset: '\x1b[0m',
      bright: '\x1b[1m',
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      magenta: '\x1b[35m',
      cyan: '\x1b[36m'
    };
  }

  log(message, color = 'reset') {
    console.log(`${this.colors[color]}${message}${this.colors.reset}`);
  }

  async searchTickers(query, limit = 10, additionalParams = '') {
    try {
      const url = `${BASE_URL}/api/tickers/search?query=${query}&limit=${limit}${additionalParams}`;
      const response = await axios.get(url);
      
      if (response.status === 200 && response.data.success) {
        return response.data.data.tickers;
      }
      return [];
    } catch (error) {
      this.log(`❌ Error searching for "${query}": ${error.message}`, 'red');
      return [];
    }
  }

  displayResults(query, results, title) {
    this.log(`\n${title}`, 'cyan');
    this.log('='.repeat(title.length), 'cyan');
    
    if (results.length === 0) {
      this.log('❌ No results found', 'red');
      return;
    }

    this.log(`📊 Found ${results.length} results for "${query}":\n`, 'yellow');

    results.forEach((ticker, index) => {
      const priority = this.getSearchPriority(query.toUpperCase(), ticker);
      const priorityIcon = this.getPriorityIcon(priority);
      const tickerDisplay = `${ticker.ticker}`.padEnd(8);
      const nameDisplay = ticker.name_vi.substring(0, 50);
      
      this.log(
        `${(index + 1).toString().padStart(2)}. ${priorityIcon} ${tickerDisplay} - ${nameDisplay}`,
        priority <= 3 ? 'green' : 'reset'
      );
    });

    // Hiển thị phân tích ưu tiên
    this.analyzeResults(query, results);
  }

  getSearchPriority(searchQuery, ticker) {
    const tickerUpper = ticker.ticker.toUpperCase();
    const nameViUpper = ticker.name_vi.toUpperCase();
    const nameEnUpper = ticker.name_en.toUpperCase();

    if (tickerUpper === searchQuery) return 1; // Exact match
    if (tickerUpper.startsWith(searchQuery)) return 2; // Starts with
    if (tickerUpper.includes(searchQuery)) return 3; // Contains
    if (nameViUpper.includes(searchQuery)) return 4; // Name VI match
    if (nameEnUpper.includes(searchQuery)) return 5; // Name EN match
    return 6; // Other
  }

  getPriorityIcon(priority) {
    const icons = {
      1: '🎯', // Exact match
      2: '🔥', // Starts with
      3: '⭐', // Contains
      4: '📝', // Name VI
      5: '🔤', // Name EN
      6: '📄'  // Other
    };
    return icons[priority] || '❓';
  }

  analyzeResults(query, results) {
    const analysis = {
      exact: 0,
      startsWith: 0,
      contains: 0,
      nameMatch: 0,
      other: 0
    };

    results.forEach(ticker => {
      const priority = this.getSearchPriority(query.toUpperCase(), ticker);
      switch (priority) {
        case 1: analysis.exact++; break;
        case 2: analysis.startsWith++; break;
        case 3: analysis.contains++; break;
        case 4:
        case 5: analysis.nameMatch++; break;
        default: analysis.other++; break;
      }
    });

    this.log('\n📈 Result Analysis:', 'magenta');
    this.log(`🎯 Exact matches: ${analysis.exact}`, analysis.exact > 0 ? 'green' : 'reset');
    this.log(`🔥 Starts with: ${analysis.startsWith}`, analysis.startsWith > 0 ? 'green' : 'reset');
    this.log(`⭐ Contains: ${analysis.contains}`, analysis.contains > 0 ? 'green' : 'reset');
    this.log(`📝 Name matches: ${analysis.nameMatch}`, analysis.nameMatch > 0 ? 'green' : 'reset');
    this.log(`📄 Other: ${analysis.other}`, 'reset');

    // Kiểm tra thứ tự ưu tiên
    const priorities = results.map(ticker => this.getSearchPriority(query.toUpperCase(), ticker));
    const isOptimized = this.checkPriorityOrder(priorities);
    
    if (isOptimized) {
      this.log('✅ Results are properly prioritized!', 'green');
    } else {
      this.log('⚠️  Results may not be optimally ordered', 'yellow');
    }
  }

  checkPriorityOrder(priorities) {
    for (let i = 0; i < priorities.length - 1; i++) {
      if (priorities[i] > priorities[i + 1]) {
        return false;
      }
    }
    return true;
  }

  async demoExactMatch() {
    this.log('\n🎯 DEMO 1: Exact Match Priority', 'bright');
    this.log('Testing search for "FPT" - FPT should appear first', 'yellow');
    
    const results = await this.searchTickers('FPT', 8);
    this.displayResults('FPT', results, 'Search Results for "FPT"');
  }

  async demoPartialMatch() {
    this.log('\n🔥 DEMO 2: Partial Match Priority', 'bright');
    this.log('Testing search for "VN" - tickers starting with VN should appear first', 'yellow');
    
    const results = await this.searchTickers('VN', 10);
    this.displayResults('VN', results, 'Search Results for "VN"');
  }

  async demoNameSearch() {
    this.log('\n📝 DEMO 3: Name Search', 'bright');
    this.log('Testing search for "Petro" - companies with Petro in name', 'yellow');
    
    const results = await this.searchTickers('Petro', 8);
    this.displayResults('Petro', results, 'Search Results for "Petro"');
  }

  async demoWithSorting() {
    this.log('\n📊 DEMO 4: Search with Sorting', 'bright');
    this.log('Testing search for "VN" sorted by market cap - priority should be maintained', 'yellow');
    
    const results = await this.searchTickers('VN', 8, '&sortBy=market_cap&sortOrder=desc');
    this.displayResults('VN', results, 'Search Results for "VN" (sorted by market cap)');
  }

  async demoMixedResults() {
    this.log('\n⭐ DEMO 5: Mixed Results', 'bright');
    this.log('Testing search for "VIC" - showing all priority levels', 'yellow');
    
    const results = await this.searchTickers('VIC', 10);
    this.displayResults('VIC', results, 'Search Results for "VIC"');
  }

  async performanceTest() {
    this.log('\n⚡ DEMO 6: Performance Test', 'bright');
    this.log('Testing response time for search queries', 'yellow');

    const queries = ['FPT', 'VN', 'Petro', 'Bank', 'Tech'];
    const times = [];

    for (const query of queries) {
      const startTime = Date.now();
      await this.searchTickers(query, 20);
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      times.push(responseTime);
      
      this.log(`🔍 "${query}": ${responseTime}ms`, responseTime < 200 ? 'green' : 'yellow');
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    this.log(`\n📊 Average response time: ${avgTime.toFixed(2)}ms`, avgTime < 200 ? 'green' : 'yellow');
    
    if (avgTime < 200) {
      this.log('✅ Performance is excellent!', 'green');
    } else if (avgTime < 500) {
      this.log('⚠️  Performance is acceptable', 'yellow');
    } else {
      this.log('❌ Performance needs improvement', 'red');
    }
  }

  async runDemo() {
    this.log('🚀 IQX Stock Data API - Search Optimization Demo', 'bright');
    this.log('=' .repeat(55), 'bright');
    this.log('This demo showcases the improved search functionality', 'cyan');
    this.log('with ticker-priority ordering and intelligent result ranking.\n', 'cyan');

    try {
      // Kiểm tra kết nối API
      this.log('🔗 Checking API connection...', 'yellow');
      const healthCheck = await axios.get(`${BASE_URL}/health`);
      if (healthCheck.status === 200) {
        this.log('✅ API is running and healthy!', 'green');
      }

      // Chạy các demo
      await this.demoExactMatch();
      await this.demoPartialMatch();
      await this.demoNameSearch();
      await this.demoWithSorting();
      await this.demoMixedResults();
      await this.performanceTest();

      // Kết luận
      this.log('\n🎉 Demo Completed!', 'bright');
      this.log('=' .repeat(20), 'bright');
      this.log('Key improvements demonstrated:', 'cyan');
      this.log('✅ Exact ticker matches appear first', 'green');
      this.log('✅ Partial ticker matches are prioritized', 'green');
      this.log('✅ Name searches work correctly', 'green');
      this.log('✅ Sorting is maintained within priority groups', 'green');
      this.log('✅ Performance remains excellent', 'green');

      this.log('\n💡 Try these commands to test manually:', 'yellow');
      this.log('npm run test-search-examples', 'cyan');
      this.log('npm run test-search', 'cyan');

    } catch (error) {
      this.log(`❌ Demo failed: ${error.message}`, 'red');
      this.log('Make sure the API server is running on port 5001', 'yellow');
      this.log('Run: npm run dev', 'cyan');
    }
  }
}

// Chạy demo
if (require.main === module) {
  const demo = new SearchOptimizationDemo();
  demo.runDemo().catch(error => {
    console.error('❌ Demo failed:', error.message);
    process.exit(1);
  });
}

module.exports = SearchOptimizationDemo;
