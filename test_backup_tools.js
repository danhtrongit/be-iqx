#!/usr/bin/env node

/**
 * Test script cho các backup tools
 * Kiểm tra tính năng backup và restore
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class BackupToolsTest {
  constructor() {
    this.testResults = [];
    this.backupDir = path.join(process.cwd(), 'backups');
    this.testDbName = 'iqx_test_backup';
    
    this.colors = {
      reset: '\x1b[0m',
      bright: '\x1b[1m',
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      cyan: '\x1b[36m'
    };
  }

  log(message, color = 'reset') {
    console.log(`${this.colors[color]}${message}${this.colors.reset}`);
  }

  async runTest(testName, testFunction) {
    try {
      this.log(`\n🧪 Testing: ${testName}`, 'cyan');
      await testFunction();
      this.log(`✅ ${testName} - PASSED`, 'green');
      this.testResults.push({ test: testName, status: 'PASSED' });
    } catch (error) {
      this.log(`❌ ${testName} - FAILED: ${error.message}`, 'red');
      this.testResults.push({ test: testName, status: 'FAILED', error: error.message });
    }
  }

  async testDatabaseConnection() {
    try {
      const command = `PGPASSWORD="${process.env.DB_PASSWORD || ''}" pg_isready -h ${process.env.DB_HOST || 'localhost'} -p ${process.env.DB_PORT || 5432} -U ${process.env.DB_USER || 'postgres'} -d ${process.env.DB_NAME || 'iqx_db'}`;
      execSync(command, { stdio: 'pipe' });
      this.log('   ✅ Database connection successful', 'green');
    } catch (error) {
      throw new Error('Database connection failed');
    }
  }

  async testBackupDirectoryCreation() {
    // Test if backup directory is created
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
    
    if (!fs.existsSync(this.backupDir)) {
      throw new Error('Failed to create backup directory');
    }
    
    this.log(`   📁 Backup directory exists: ${this.backupDir}`, 'blue');
  }

  async testSchemaBackup() {
    try {
      const command = 'node tools/database-backup.js --schema';
      execSync(command, { stdio: 'pipe' });
      
      // Check if schema backup file was created
      const files = fs.readdirSync(this.backupDir)
        .filter(file => file.includes('schema') && file.endsWith('.sql'))
        .sort()
        .reverse();
      
      if (files.length === 0) {
        throw new Error('Schema backup file not found');
      }
      
      const latestFile = files[0];
      const filePath = path.join(this.backupDir, latestFile);
      const stats = fs.statSync(filePath);
      
      if (stats.size === 0) {
        throw new Error('Schema backup file is empty');
      }
      
      this.log(`   📄 Schema backup created: ${latestFile} (${(stats.size / 1024).toFixed(2)} KB)`, 'blue');
    } catch (error) {
      throw new Error(`Schema backup failed: ${error.message}`);
    }
  }

  async testDataBackup() {
    try {
      const command = 'node tools/database-backup.js --data';
      execSync(command, { stdio: 'pipe' });
      
      // Check if data backup file was created
      const files = fs.readdirSync(this.backupDir)
        .filter(file => file.includes('data') && file.endsWith('.sql'))
        .sort()
        .reverse();
      
      if (files.length === 0) {
        throw new Error('Data backup file not found');
      }
      
      const latestFile = files[0];
      const filePath = path.join(this.backupDir, latestFile);
      const stats = fs.statSync(filePath);
      
      this.log(`   📊 Data backup created: ${latestFile} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`, 'blue');
    } catch (error) {
      throw new Error(`Data backup failed: ${error.message}`);
    }
  }

  async testFullBackup() {
    try {
      const command = 'node tools/database-backup.js --full';
      execSync(command, { stdio: 'pipe' });
      
      // Check if full backup file was created
      const files = fs.readdirSync(this.backupDir)
        .filter(file => file.includes('full') && file.endsWith('.sql'))
        .sort()
        .reverse();
      
      if (files.length === 0) {
        throw new Error('Full backup file not found');
      }
      
      const latestFile = files[0];
      const filePath = path.join(this.backupDir, latestFile);
      const stats = fs.statSync(filePath);
      
      this.log(`   💾 Full backup created: ${latestFile} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`, 'blue');
    } catch (error) {
      throw new Error(`Full backup failed: ${error.message}`);
    }
  }

  async testTableBackup() {
    try {
      const command = 'node tools/database-backup.js --table tickers';
      execSync(command, { stdio: 'pipe' });
      
      // Check if table backup file was created
      const files = fs.readdirSync(this.backupDir)
        .filter(file => file.includes('tickers') && file.endsWith('.sql'))
        .sort()
        .reverse();
      
      if (files.length === 0) {
        throw new Error('Table backup file not found');
      }
      
      const latestFile = files[0];
      const filePath = path.join(this.backupDir, latestFile);
      const stats = fs.statSync(filePath);
      
      this.log(`   📋 Table backup created: ${latestFile} (${(stats.size / 1024).toFixed(2)} KB)`, 'blue');
    } catch (error) {
      throw new Error(`Table backup failed: ${error.message}`);
    }
  }

  async testBackupList() {
    try {
      const command = 'node tools/backup-manager.js list';
      const output = execSync(command, { encoding: 'utf8' });
      
      if (!output.includes('Backup Files') && !output.includes('No backups found')) {
        throw new Error('Backup list command failed');
      }
      
      this.log('   📋 Backup list command works', 'blue');
    } catch (error) {
      throw new Error(`Backup list failed: ${error.message}`);
    }
  }

  async testBackupStats() {
    try {
      const command = 'node tools/backup-manager.js stats';
      const output = execSync(command, { encoding: 'utf8' });
      
      if (!output.includes('Backup Statistics') && !output.includes('No backup statistics')) {
        throw new Error('Backup stats command failed');
      }
      
      this.log('   📊 Backup stats command works', 'blue');
    } catch (error) {
      throw new Error(`Backup stats failed: ${error.message}`);
    }
  }

  async testRestoreListBackups() {
    try {
      const command = 'node tools/database-restore.js --list';
      const output = execSync(command, { encoding: 'utf8' });
      
      if (!output.includes('Available backup files') && !output.includes('No backup files found')) {
        throw new Error('Restore list command failed');
      }
      
      this.log('   📋 Restore list command works', 'blue');
    } catch (error) {
      throw new Error(`Restore list failed: ${error.message}`);
    }
  }

  async testBackupFileIntegrity() {
    const backupFiles = fs.readdirSync(this.backupDir)
      .filter(file => file.endsWith('.sql'))
      .map(file => path.join(this.backupDir, file));
    
    if (backupFiles.length === 0) {
      throw new Error('No backup files found for integrity test');
    }
    
    let validFiles = 0;
    
    for (const file of backupFiles.slice(0, 3)) { // Test first 3 files
      try {
        const content = fs.readFileSync(file, 'utf8');
        
        // Basic SQL file validation
        if (content.includes('PostgreSQL database dump') || 
            content.includes('CREATE TABLE') || 
            content.includes('INSERT INTO') ||
            content.includes('COPY ')) {
          validFiles++;
        }
      } catch (error) {
        // File might be corrupted
      }
    }
    
    if (validFiles === 0) {
      throw new Error('No valid backup files found');
    }
    
    this.log(`   ✅ ${validFiles} backup files are valid`, 'blue');
  }

  async testNpmScripts() {
    const scripts = [
      'backup-list',
      'backup-stats'
    ];
    
    for (const script of scripts) {
      try {
        execSync(`npm run ${script}`, { stdio: 'pipe' });
        this.log(`   ✅ npm run ${script} works`, 'blue');
      } catch (error) {
        throw new Error(`npm run ${script} failed`);
      }
    }
  }

  async testBackupCleanup() {
    try {
      // Create some old test files
      const oldFile1 = path.join(this.backupDir, 'test_old_backup_1.sql');
      const oldFile2 = path.join(this.backupDir, 'test_old_backup_2.sql');
      
      fs.writeFileSync(oldFile1, '-- Test backup file 1');
      fs.writeFileSync(oldFile2, '-- Test backup file 2');
      
      // Run cleanup (this might not delete our test files due to retention policy)
      const command = 'node tools/backup-manager.js cleanup';
      execSync(command, { stdio: 'pipe' });
      
      // Clean up our test files
      if (fs.existsSync(oldFile1)) fs.unlinkSync(oldFile1);
      if (fs.existsSync(oldFile2)) fs.unlinkSync(oldFile2);
      
      this.log('   🧹 Backup cleanup command works', 'blue');
    } catch (error) {
      throw new Error(`Backup cleanup failed: ${error.message}`);
    }
  }

  async testPerformance() {
    const startTime = Date.now();
    
    try {
      // Test schema backup performance (should be fast)
      const command = 'node tools/database-backup.js --schema';
      execSync(command, { stdio: 'pipe' });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      if (duration > 30000) { // 30 seconds
        throw new Error(`Schema backup too slow: ${duration}ms`);
      }
      
      this.log(`   ⚡ Schema backup completed in ${duration}ms`, 'blue');
    } catch (error) {
      throw new Error(`Performance test failed: ${error.message}`);
    }
  }

  async runAllTests() {
    this.log('🚀 Starting Backup Tools Tests...', 'bright');
    this.log('=' .repeat(50), 'bright');

    await this.runTest('Database Connection', () => this.testDatabaseConnection());
    await this.runTest('Backup Directory Creation', () => this.testBackupDirectoryCreation());
    await this.runTest('Schema Backup', () => this.testSchemaBackup());
    await this.runTest('Data Backup', () => this.testDataBackup());
    await this.runTest('Full Backup', () => this.testFullBackup());
    await this.runTest('Table Backup', () => this.testTableBackup());
    await this.runTest('Backup List Command', () => this.testBackupList());
    await this.runTest('Backup Stats Command', () => this.testBackupStats());
    await this.runTest('Restore List Command', () => this.testRestoreListBackups());
    await this.runTest('Backup File Integrity', () => this.testBackupFileIntegrity());
    await this.runTest('NPM Scripts', () => this.testNpmScripts());
    await this.runTest('Backup Cleanup', () => this.testBackupCleanup());
    await this.runTest('Performance Test', () => this.testPerformance());

    // Summary
    this.log('\n📋 Test Summary:', 'bright');
    this.log('=' .repeat(30), 'bright');
    
    const passed = this.testResults.filter(r => r.status === 'PASSED').length;
    const failed = this.testResults.filter(r => r.status === 'FAILED').length;
    
    this.testResults.forEach(result => {
      const icon = result.status === 'PASSED' ? '✅' : '❌';
      this.log(`${icon} ${result.test}`, result.status === 'PASSED' ? 'green' : 'red');
      if (result.error) {
        this.log(`   Error: ${result.error}`, 'red');
      }
    });

    this.log(`\n🎯 Results: ${passed} passed, ${failed} failed`, 'bright');
    
    if (failed === 0) {
      this.log('🎉 All backup tools are working correctly!', 'green');
      this.log('\n💡 You can now use:', 'cyan');
      this.log('   npm run backup', 'blue');
      this.log('   npm run restore', 'blue');
      this.log('   npm run backup-manager', 'blue');
    } else {
      this.log('⚠️  Some tests failed. Please check the implementation.', 'yellow');
      process.exit(1);
    }
  }
}

// Run tests
if (require.main === module) {
  const tester = new BackupToolsTest();
  tester.runAllTests().catch(error => {
    console.error('❌ Test suite failed:', error.message);
    process.exit(1);
  });
}

module.exports = BackupToolsTest;
