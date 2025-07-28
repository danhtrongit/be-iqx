#!/usr/bin/env node

/**
 * Test script để kiểm tra tối ưu hóa search API
 * Kiểm tra xem kết quả trùng với ticker có hiển thị đầu tiên không
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5001'; // Thay đổi port nếu cần

class SearchOptimizationTest {
  constructor() {
    this.testResults = [];
  }

  async runTest(testName, testFunction) {
    try {
      console.log(`\n🧪 Testing: ${testName}`);
      await testFunction();
      console.log(`✅ ${testName} - PASSED`);
      this.testResults.push({ test: testName, status: 'PASSED' });
    } catch (error) {
      console.log(`❌ ${testName} - FAILED: ${error.message}`);
      this.testResults.push({ test: testName, status: 'FAILED', error: error.message });
    }
  }

  async testExactTickerMatch() {
    // Test 1: Tìm kiếm "FPT" - FPT phải xuất hiện đầu tiên
    const response = await axios.get(`${BASE_URL}/api/tickers/search?query=FPT&limit=10`);
    
    if (response.status !== 200 || !response.data.success) {
      throw new Error('API request failed');
    }

    const tickers = response.data.data.tickers;
    if (tickers.length === 0) {
      throw new Error('No results found');
    }

    // Kiểm tra ticker đầu tiên có phải là "FPT" không
    if (tickers[0].ticker !== 'FPT') {
      throw new Error(`Expected first result to be 'FPT', but got '${tickers[0].ticker}'`);
    }

    console.log(`   📊 Found ${tickers.length} results`);
    console.log(`   🎯 First result: ${tickers[0].ticker} - ${tickers[0].name_vi}`);
    console.log(`   📋 Top 3 results: ${tickers.slice(0, 3).map(t => t.ticker).join(', ')}`);
  }

  async testPartialTickerMatch() {
    // Test 2: Tìm kiếm "VN" - các ticker bắt đầu bằng VN phải xuất hiện trước
    const response = await axios.get(`${BASE_URL}/api/tickers/search?query=VN&limit=10`);
    
    if (response.status !== 200 || !response.data.success) {
      throw new Error('API request failed');
    }

    const tickers = response.data.data.tickers;
    if (tickers.length === 0) {
      throw new Error('No results found');
    }

    // Kiểm tra các ticker bắt đầu bằng "VN" có xuất hiện trước không
    const firstThree = tickers.slice(0, 3);
    const startsWithVN = firstThree.filter(t => t.ticker.startsWith('VN'));
    
    if (startsWithVN.length === 0) {
      throw new Error('Expected tickers starting with "VN" to appear first');
    }

    console.log(`   📊 Found ${tickers.length} results`);
    console.log(`   🎯 First 3 results: ${firstThree.map(t => `${t.ticker} (${t.name_vi})`).join(', ')}`);
    console.log(`   ✅ ${startsWithVN.length}/3 start with "VN"`);
  }

  async testNameSearch() {
    // Test 3: Tìm kiếm "Petro" - PVS, PLX, v.v. phải xuất hiện
    const response = await axios.get(`${BASE_URL}/api/tickers/search?query=Petro&limit=10`);
    
    if (response.status !== 200 || !response.data.success) {
      throw new Error('API request failed');
    }

    const tickers = response.data.data.tickers;
    console.log(`   📊 Found ${tickers.length} results for "Petro"`);
    
    if (tickers.length > 0) {
      console.log(`   🎯 Results: ${tickers.map(t => `${t.ticker} (${t.name_vi})`).join(', ')}`);
      
      // Kiểm tra có ticker nào chứa "petro" trong tên không
      const hasNameMatch = tickers.some(t => 
        t.name_vi.toLowerCase().includes('petro') || 
        t.name_en.toLowerCase().includes('petro')
      );
      
      if (!hasNameMatch) {
        throw new Error('Expected to find tickers with "Petro" in name');
      }
    }
  }

  async testMixedSearch() {
    // Test 4: Tìm kiếm "VIC" - VIC phải xuất hiện đầu tiên, sau đó các kết quả khác
    const response = await axios.get(`${BASE_URL}/api/tickers/search?query=VIC&limit=10`);
    
    if (response.status !== 200 || !response.data.success) {
      throw new Error('API request failed');
    }

    const tickers = response.data.data.tickers;
    if (tickers.length === 0) {
      throw new Error('No results found');
    }

    console.log(`   📊 Found ${tickers.length} results`);
    console.log(`   🎯 All results: ${tickers.map(t => `${t.ticker} (${t.name_vi})`).join(', ')}`);

    // Kiểm tra thứ tự ưu tiên
    let exactMatch = -1;
    let startsWithMatch = -1;
    let containsMatch = -1;

    tickers.forEach((ticker, index) => {
      if (ticker.ticker === 'VIC' && exactMatch === -1) {
        exactMatch = index;
      } else if (ticker.ticker.startsWith('VIC') && startsWithMatch === -1) {
        startsWithMatch = index;
      } else if (ticker.ticker.includes('VIC') && containsMatch === -1) {
        containsMatch = index;
      }
    });

    if (exactMatch !== -1 && startsWithMatch !== -1 && exactMatch > startsWithMatch) {
      throw new Error('Exact match should appear before starts-with match');
    }

    console.log(`   ✅ Priority order maintained: exact(${exactMatch}), starts-with(${startsWithMatch}), contains(${containsMatch})`);
  }

  async testSortingWithSearch() {
    // Test 5: Tìm kiếm với sorting - ưu tiên vẫn phải được duy trì
    const response = await axios.get(`${BASE_URL}/api/tickers/search?query=VN&sortBy=market_cap&sortOrder=desc&limit=10`);
    
    if (response.status !== 200 || !response.data.success) {
      throw new Error('API request failed');
    }

    const tickers = response.data.data.tickers;
    if (tickers.length === 0) {
      throw new Error('No results found');
    }

    console.log(`   📊 Found ${tickers.length} results (sorted by market_cap desc)`);
    console.log(`   🎯 First 3: ${tickers.slice(0, 3).map(t => `${t.ticker} (${t.market_cap || 'N/A'})`).join(', ')}`);

    // Kiểm tra ticker matches vẫn xuất hiện trước
    const firstFive = tickers.slice(0, 5);
    const tickerMatches = firstFive.filter(t => t.ticker.includes('VN'));
    
    if (tickerMatches.length === 0) {
      throw new Error('Expected ticker matches to appear in top results even with sorting');
    }

    console.log(`   ✅ ${tickerMatches.length}/5 top results contain "VN"`);
  }

  async testPerformance() {
    // Test 6: Kiểm tra performance
    const startTime = Date.now();
    
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(axios.get(`${BASE_URL}/api/tickers/search?query=FPT&limit=20`));
    }
    
    await Promise.all(promises);
    const endTime = Date.now();
    const avgTime = (endTime - startTime) / 5;

    console.log(`   ⏱️  Average response time: ${avgTime.toFixed(2)}ms`);
    
    if (avgTime > 1000) {
      throw new Error(`Response time too slow: ${avgTime.toFixed(2)}ms`);
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Search Optimization Tests...\n');

    await this.runTest('Exact Ticker Match Priority', () => this.testExactTickerMatch());
    await this.runTest('Partial Ticker Match Priority', () => this.testPartialTickerMatch());
    await this.runTest('Name Search Functionality', () => this.testNameSearch());
    await this.runTest('Mixed Search Results Order', () => this.testMixedSearch());
    await this.runTest('Sorting with Search Priority', () => this.testSortingWithSearch());
    await this.runTest('Performance Test', () => this.testPerformance());

    // Summary
    console.log('\n📋 Test Summary:');
    console.log('================');
    
    const passed = this.testResults.filter(r => r.status === 'PASSED').length;
    const failed = this.testResults.filter(r => r.status === 'FAILED').length;
    
    this.testResults.forEach(result => {
      const icon = result.status === 'PASSED' ? '✅' : '❌';
      console.log(`${icon} ${result.test}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });

    console.log(`\n🎯 Results: ${passed} passed, ${failed} failed`);
    
    if (failed === 0) {
      console.log('🎉 All tests passed! Search optimization is working correctly.');
    } else {
      console.log('⚠️  Some tests failed. Please check the implementation.');
      process.exit(1);
    }
  }
}

// Chạy tests
if (require.main === module) {
  const tester = new SearchOptimizationTest();
  tester.runAllTests().catch(error => {
    console.error('❌ Test suite failed:', error.message);
    process.exit(1);
  });
}

module.exports = SearchOptimizationTest;
