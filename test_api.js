#!/usr/bin/env node

/**
 * Simple API test script
 * Run this after starting the server to test basic functionality
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

class APITester {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  async test(name, testFn) {
    try {
      console.log(`🧪 Testing: ${name}`);
      await testFn();
      console.log(`✅ PASSED: ${name}`);
      this.results.passed++;
      this.results.tests.push({ name, status: 'PASSED' });
    } catch (error) {
      console.log(`❌ FAILED: ${name}`);
      console.log(`   Error: ${error.message}`);
      this.results.failed++;
      this.results.tests.push({ name, status: 'FAILED', error: error.message });
    }
  }

  async runTests() {
    console.log('🚀 Starting API Tests...\n');

    // Test 1: Health check
    await this.test('Health Check', async () => {
      const response = await axios.get(`${BASE_URL}/health`);
      if (response.status !== 200 || !response.data.success) {
        throw new Error('Health check failed');
      }
    });

    // Test 2: API root
    await this.test('API Root', async () => {
      const response = await axios.get(`${BASE_URL}/`);
      if (response.status !== 200 || !response.data.success) {
        throw new Error('API root failed');
      }
    });

    // Test 3: Get tickers (should work even with empty database)
    await this.test('Get Tickers', async () => {
      const response = await axios.get(`${BASE_URL}/api/tickers?limit=5`);
      if (response.status !== 200 || !response.data.success) {
        throw new Error('Get tickers failed');
      }
    });

    // Test 4: Get statistics
    await this.test('Get Statistics', async () => {
      const response = await axios.get(`${BASE_URL}/api/tickers/statistics`);
      if (response.status !== 200 || !response.data.success) {
        throw new Error('Get statistics failed');
      }
    });

    // Test 5: Search tickers
    await this.test('Search Tickers', async () => {
      const response = await axios.get(`${BASE_URL}/api/tickers/search?query=FPT&limit=5`);
      if (response.status !== 200 || !response.data.success) {
        throw new Error('Search tickers failed');
      }
    });

    // Test 6: Get logs
    await this.test('Get Collection Logs', async () => {
      const response = await axios.get(`${BASE_URL}/api/tickers/logs?limit=5`);
      if (response.status !== 200 || !response.data.success) {
        throw new Error('Get logs failed');
      }
    });

    // Test 7: Admin health check
    await this.test('Admin Health Check', async () => {
      const response = await axios.get(`${BASE_URL}/api/admin/health`);
      if (response.status !== 200 || !response.data.success) {
        throw new Error('Admin health check failed');
      }
    });

    // Test 8: Scheduler status
    await this.test('Scheduler Status', async () => {
      const response = await axios.get(`${BASE_URL}/api/admin/scheduler/status`);
      if (response.status !== 200 || !response.data.success) {
        throw new Error('Scheduler status failed');
      }
    });

    // Test 9: Image stats
    await this.test('Image Statistics', async () => {
      const response = await axios.get(`${BASE_URL}/api/admin/images/stats`);
      if (response.status !== 200 || !response.data.success) {
        throw new Error('Image stats failed');
      }
    });

    // Test 10: Test specific ticker (should return 404 if not found, which is OK)
    await this.test('Get Specific Ticker', async () => {
      try {
        const response = await axios.get(`${BASE_URL}/api/tickers/FPT`);
        if (response.status !== 200 || !response.data.success) {
          throw new Error('Get specific ticker failed');
        }
      } catch (error) {
        // 404 is acceptable if ticker doesn't exist yet
        if (error.response && error.response.status === 404) {
          console.log('   Note: Ticker not found (expected if database is empty)');
          return;
        }
        throw error;
      }
    });

    // Test 11: Test rate limiting (should not fail, just check headers)
    await this.test('Rate Limiting Headers', async () => {
      const response = await axios.get(`${BASE_URL}/api/tickers?limit=1`);
      if (!response.headers['x-ratelimit-limit']) {
        console.log('   Note: Rate limiting headers not found (may be disabled in development)');
      }
    });

    // Test 12: Test invalid endpoint (should return 404)
    await this.test('Invalid Endpoint (404)', async () => {
      try {
        await axios.get(`${BASE_URL}/api/invalid-endpoint`);
        throw new Error('Should have returned 404');
      } catch (error) {
        if (error.response && error.response.status === 404) {
          return; // Expected 404
        }
        throw error;
      }
    });

    this.printResults();
  }

  printResults() {
    console.log('\n📊 Test Results:');
    console.log('================');
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`📈 Success Rate: ${((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1)}%`);

    if (this.results.failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.tests
        .filter(test => test.status === 'FAILED')
        .forEach(test => {
          console.log(`   - ${test.name}: ${test.error}`);
        });
    }

    console.log('\n💡 Next Steps:');
    if (this.results.failed === 0) {
      console.log('   🎉 All tests passed! Your API is working correctly.');
      console.log('   📝 Try running data collection: curl -X POST http://localhost:3000/api/admin/collect-data');
      console.log('   📊 Check statistics after collection: curl http://localhost:3000/api/tickers/statistics');
    } else {
      console.log('   🔧 Some tests failed. Check the error messages above.');
      console.log('   🔍 Verify your database connection and configuration.');
      console.log('   📋 Check the server logs for more details.');
    }
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const tester = new APITester();
  
  console.log('🔍 API Test Suite for IQX Stock Data API');
  console.log('==========================================');
  console.log(`🌐 Testing server at: ${BASE_URL}`);
  console.log('⚠️  Make sure the server is running before running these tests!\n');

  tester.runTests().catch(error => {
    console.error('💥 Test suite failed to run:', error.message);
    process.exit(1);
  });
}

module.exports = APITester;
