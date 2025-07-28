#!/usr/bin/env node

/**
 * Setup script for IQX Stock Data API
 * This script helps with initial setup and testing
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class SetupHelper {
  constructor() {
    this.projectRoot = process.cwd();
  }

  log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = {
      info: '📋',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    }[type] || '📋';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  checkFile(filePath, description) {
    const fullPath = path.join(this.projectRoot, filePath);
    if (fs.existsSync(fullPath)) {
      this.log(`${description} exists`, 'success');
      return true;
    } else {
      this.log(`${description} missing: ${filePath}`, 'warning');
      return false;
    }
  }

  checkDirectory(dirPath, description) {
    const fullPath = path.join(this.projectRoot, dirPath);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
      this.log(`${description} exists`, 'success');
      return true;
    } else {
      this.log(`${description} missing: ${dirPath}`, 'warning');
      return false;
    }
  }

  async checkDependencies() {
    this.log('Checking dependencies...');
    
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const dependencies = Object.keys(packageJson.dependencies || {});
      const devDependencies = Object.keys(packageJson.devDependencies || {});
      
      this.log(`Found ${dependencies.length} dependencies and ${devDependencies.length} dev dependencies`, 'success');
      
      // Check if node_modules exists
      if (this.checkDirectory('node_modules', 'Node modules directory')) {
        this.log('Dependencies appear to be installed', 'success');
      } else {
        this.log('Dependencies not installed. Run: npm install', 'warning');
      }
    } catch (error) {
      this.log('Error checking dependencies: ' + error.message, 'error');
    }
  }

  checkEnvironment() {
    this.log('Checking environment configuration...');
    
    if (this.checkFile('.env', 'Environment file')) {
      try {
        const envContent = fs.readFileSync('.env', 'utf8');
        const envVars = envContent.split('\n').filter(line => line.includes('='));
        this.log(`Found ${envVars.length} environment variables`, 'success');
        
        // Check critical variables
        const criticalVars = ['DB_HOST', 'DB_NAME', 'DB_USER', 'PORT'];
        criticalVars.forEach(varName => {
          if (envContent.includes(varName)) {
            this.log(`${varName} configured`, 'success');
          } else {
            this.log(`${varName} not found in .env`, 'warning');
          }
        });
      } catch (error) {
        this.log('Error reading .env file: ' + error.message, 'error');
      }
    } else {
      this.log('Copy .env.example to .env and configure your settings', 'warning');
    }
  }

  checkProjectStructure() {
    this.log('Checking project structure...');
    
    const requiredDirs = [
      'src',
      'src/config',
      'src/controllers',
      'src/models',
      'src/services',
      'src/routes',
      'src/middleware',
      'src/utils',
      'src/uploads',
      'src/uploads/images'
    ];
    
    const requiredFiles = [
      'src/app.js',
      'src/config/database.js',
      'tickers.json',
      'package.json',
      'README.md'
    ];
    
    let allDirsExist = true;
    let allFilesExist = true;
    
    requiredDirs.forEach(dir => {
      if (!this.checkDirectory(dir, `Directory ${dir}`)) {
        allDirsExist = false;
      }
    });
    
    requiredFiles.forEach(file => {
      if (!this.checkFile(file, `File ${file}`)) {
        allFilesExist = false;
      }
    });
    
    if (allDirsExist && allFilesExist) {
      this.log('Project structure is complete', 'success');
    } else {
      this.log('Some project files/directories are missing', 'warning');
    }
  }

  checkTickersFile() {
    this.log('Checking tickers.json...');
    
    if (this.checkFile('tickers.json', 'Tickers file')) {
      try {
        const tickers = JSON.parse(fs.readFileSync('tickers.json', 'utf8'));
        if (Array.isArray(tickers)) {
          this.log(`Found ${tickers.length} tickers in tickers.json`, 'success');
          
          // Show first few tickers as example
          const sampleTickers = tickers.slice(0, 5);
          this.log(`Sample tickers: ${sampleTickers.join(', ')}`, 'info');
        } else {
          this.log('tickers.json should contain an array of ticker symbols', 'warning');
        }
      } catch (error) {
        this.log('Error reading tickers.json: ' + error.message, 'error');
      }
    }
  }

  async testDatabaseConnection() {
    this.log('Testing database connection...');
    
    try {
      // This is a simple test - in a real scenario you'd want to test the actual connection
      const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'iqx_db',
        user: process.env.DB_USER || 'postgres'
      };
      
      this.log(`Database config: ${dbConfig.user}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`, 'info');
      this.log('Note: Actual connection test requires the server to be running', 'info');
    } catch (error) {
      this.log('Error checking database config: ' + error.message, 'error');
    }
  }

  showQuickStart() {
    this.log('Quick Start Guide:', 'info');
    console.log(`
🚀 Quick Start Commands:

1. Install dependencies (if not done):
   npm install

2. Configure environment:
   cp .env.example .env
   # Edit .env with your database settings

3. Start the server:
   npm run dev          # Development mode with auto-reload
   npm start            # Production mode

4. Test the API:
   node test_api.js     # Run basic API tests

5. Trigger data collection:
   curl -X POST http://localhost:3000/api/admin/collect-data

6. Check API status:
   curl http://localhost:3000/health

📚 Documentation:
   - README.md - Complete setup and usage guide
   - API_DOCUMENTATION.md - Detailed API reference

🔗 Key Endpoints:
   - http://localhost:3000/ - API overview
   - http://localhost:3000/api/tickers - Get all tickers
   - http://localhost:3000/api/tickers/statistics - Market statistics
   - http://localhost:3000/api/admin/health - System health

💡 Tips:
   - The scheduler runs automatically twice daily (8 AM & 8 PM)
   - Images are downloaded and stored locally
   - Check logs/ directory for detailed logging
   - Use /api/admin endpoints for management operations
`);
  }

  async run() {
    console.log('🔧 IQX Stock Data API Setup Check');
    console.log('==================================\n');
    
    this.checkProjectStructure();
    console.log('');
    
    await this.checkDependencies();
    console.log('');
    
    this.checkEnvironment();
    console.log('');
    
    this.checkTickersFile();
    console.log('');
    
    await this.testDatabaseConnection();
    console.log('');
    
    this.showQuickStart();
    
    this.log('Setup check completed!', 'success');
  }
}

// Run setup if this script is executed directly
if (require.main === module) {
  const setup = new SetupHelper();
  setup.run().catch(error => {
    console.error('❌ Setup check failed:', error.message);
    process.exit(1);
  });
}

module.exports = SetupHelper;
