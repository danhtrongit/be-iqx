#!/usr/bin/env node

/**
 * Simple Backup Tool - Xử lý dữ liệu lớn không bị buffer overflow
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
require('dotenv').config();

class SimpleBackup {
  constructor() {
    this.dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'iqx_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || ''
    };

    this.backupDir = path.join(process.cwd(), 'backups');
    this.timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    
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

  ensureBackupDirectory() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      this.log(`📁 Created backup directory: ${this.backupDir}`, 'green');
    }
  }

  async runPgDump(args, outputFile) {
    return new Promise((resolve, reject) => {
      const env = { ...process.env, PGPASSWORD: this.dbConfig.password };
      
      // Base arguments
      const baseArgs = [
        '-h', this.dbConfig.host,
        '-p', this.dbConfig.port.toString(),
        '-U', this.dbConfig.user,
        '-d', this.dbConfig.database,
        '--no-owner',
        '--no-privileges'
      ];

      const allArgs = [...baseArgs, ...args, '--file=' + outputFile];
      
      this.log(`📝 Running: pg_dump ${allArgs.join(' ')}`, 'yellow');
      
      const pgDump = spawn('pg_dump', allArgs, { env });

      let errorOutput = '';
      let hasError = false;

      pgDump.stderr.on('data', (data) => {
        const message = data.toString();
        // pg_dump outputs progress info to stderr, filter real errors
        if (message.includes('error:') || message.includes('FATAL:') || message.includes('could not connect')) {
          errorOutput += message;
          hasError = true;
        } else {
          // Show progress for verbose output
          if (message.includes('reading') || message.includes('creating') || message.includes('dumping')) {
            process.stdout.write('.');
          }
        }
      });

      pgDump.on('close', (code) => {
        console.log(''); // New line after progress dots
        
        if (code === 0 && !hasError) {
          try {
            const stats = fs.statSync(outputFile);
            this.log(`✅ Backup completed: ${path.basename(outputFile)}`, 'green');
            this.log(`📊 File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`, 'blue');
            resolve(outputFile);
          } catch (err) {
            reject(new Error(`Backup file not created: ${err.message}`));
          }
        } else {
          reject(new Error(`pg_dump failed with code ${code}: ${errorOutput}`));
        }
      });

      pgDump.on('error', (error) => {
        reject(new Error(`Failed to start pg_dump: ${error.message}`));
      });
    });
  }

  async createFullBackup() {
    this.log('\n🗄️  Creating full database backup...', 'cyan');
    
    const backupFile = path.join(this.backupDir, `iqx_full_backup_${this.timestamp}.sql`);
    
    try {
      await this.runPgDump(['--clean', '--verbose'], backupFile);
      return backupFile;
    } catch (error) {
      this.log(`❌ Full backup failed: ${error.message}`, 'red');
      throw error;
    }
  }

  async createSchemaBackup() {
    this.log('\n🏗️  Creating schema-only backup...', 'cyan');
    
    const backupFile = path.join(this.backupDir, `iqx_schema_${this.timestamp}.sql`);
    
    try {
      await this.runPgDump(['--schema-only', '--clean'], backupFile);
      return backupFile;
    } catch (error) {
      this.log(`❌ Schema backup failed: ${error.message}`, 'red');
      throw error;
    }
  }

  async createDataBackup() {
    this.log('\n📊 Creating data-only backup...', 'cyan');
    
    const backupFile = path.join(this.backupDir, `iqx_data_${this.timestamp}.sql`);
    
    try {
      await this.runPgDump(['--data-only'], backupFile);
      return backupFile;
    } catch (error) {
      this.log(`❌ Data backup failed: ${error.message}`, 'red');
      throw error;
    }
  }

  async createTableBackup(tableName) {
    this.log(`\n📋 Creating backup for table: ${tableName}...`, 'cyan');
    
    const backupFile = path.join(this.backupDir, `iqx_${tableName}_${this.timestamp}.sql`);
    
    try {
      await this.runPgDump(['--table=' + tableName, '--clean'], backupFile);
      return backupFile;
    } catch (error) {
      this.log(`❌ Table backup failed: ${error.message}`, 'red');
      throw error;
    }
  }

  async createCompressedBackup() {
    this.log('\n🗜️  Creating compressed backup...', 'cyan');
    
    const backupFile = path.join(this.backupDir, `iqx_compressed_${this.timestamp}.dump`);
    
    try {
      await this.runPgDump(['--format=custom', '--compress=9'], backupFile);
      return backupFile;
    } catch (error) {
      this.log(`❌ Compressed backup failed: ${error.message}`, 'red');
      throw error;
    }
  }

  async createLargeDataBackup() {
    this.log('\n📊 Creating backup for large data (streaming)...', 'cyan');
    
    const backupFile = path.join(this.backupDir, `iqx_large_data_${this.timestamp}.sql`);
    
    try {
      // Sử dụng format custom để xử lý dữ liệu lớn hiệu quả hơn
      const customFile = backupFile.replace('.sql', '.dump');
      await this.runPgDump(['--format=custom', '--compress=6', '--verbose'], customFile);
      
      this.log('📝 Converting to SQL format...', 'yellow');
      
      // Convert custom format to SQL if needed
      return new Promise((resolve, reject) => {
        const env = { ...process.env, PGPASSWORD: this.dbConfig.password };
        const pgRestore = spawn('pg_restore', [
          '--file=' + backupFile,
          '--clean',
          '--no-owner',
          '--no-privileges',
          customFile
        ], { env });

        pgRestore.on('close', (code) => {
          if (code === 0) {
            // Keep both files, but return the SQL one
            const stats = fs.statSync(backupFile);
            this.log(`✅ Large data backup completed: ${path.basename(backupFile)}`, 'green');
            this.log(`📊 SQL file size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`, 'blue');
            
            const customStats = fs.statSync(customFile);
            this.log(`📦 Compressed file size: ${(customStats.size / 1024 / 1024).toFixed(2)} MB`, 'blue');
            
            resolve(backupFile);
          } else {
            reject(new Error(`pg_restore failed with code ${code}`));
          }
        });

        pgRestore.on('error', (error) => {
          // If pg_restore fails, still return the custom format file
          this.log('⚠️  Could not convert to SQL, keeping custom format', 'yellow');
          resolve(customFile);
        });
      });
      
    } catch (error) {
      this.log(`❌ Large data backup failed: ${error.message}`, 'red');
      throw error;
    }
  }

  showUsage() {
    console.log(`
🗄️  IQX Simple Backup Tool (Handles large data)

Usage: node tools/simple-backup.js [options]

Options:
  --full              Create full database backup (default)
  --schema            Create schema-only backup
  --data              Create data-only backup
  --table <name>      Create backup for specific table
  --compressed        Create compressed backup (custom format)
  --large             Create backup optimized for large data
  --help              Show this help message

Examples:
  node tools/simple-backup.js --full
  node tools/simple-backup.js --compressed
  node tools/simple-backup.js --large
  node tools/simple-backup.js --table historical_prices
    `);
  }

  async run() {
    const args = process.argv.slice(2);
    
    if (args.includes('--help')) {
      this.showUsage();
      return;
    }

    this.log('🗄️  IQX Simple Backup Tool', 'bright');
    this.log('=' .repeat(40), 'bright');
    
    // Ensure backup directory exists
    this.ensureBackupDirectory();

    try {
      if (args.includes('--schema')) {
        await this.createSchemaBackup();
        
      } else if (args.includes('--data')) {
        await this.createDataBackup();
        
      } else if (args.includes('--table')) {
        const tableIndex = args.indexOf('--table');
        const tableName = args[tableIndex + 1];
        if (!tableName) {
          this.log('❌ Table name required after --table', 'red');
          process.exit(1);
        }
        await this.createTableBackup(tableName);
        
      } else if (args.includes('--compressed')) {
        await this.createCompressedBackup();
        
      } else if (args.includes('--large')) {
        await this.createLargeDataBackup();
        
      } else {
        // Default: full backup
        await this.createFullBackup();
      }

      this.log('\n🎉 Backup completed successfully!', 'green');
      this.log(`📁 Backup directory: ${this.backupDir}`, 'blue');
      
    } catch (error) {
      this.log(`\n❌ Backup failed: ${error.message}`, 'red');
      process.exit(1);
    }
  }
}

// Run the backup tool
if (require.main === module) {
  const backup = new SimpleBackup();
  backup.run().catch(error => {
    console.error('❌ Backup tool failed:', error.message);
    process.exit(1);
  });
}

module.exports = SimpleBackup;
