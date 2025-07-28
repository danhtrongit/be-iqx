#!/usr/bin/env node

/**
 * Database Restore Tool for IQX Stock Data API
 * Khôi phục database từ backup files
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');
require('dotenv').config();

class DatabaseRestore {
  constructor() {
    this.dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'iqx_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || ''
    };

    this.backupDir = path.join(process.cwd(), 'backups');
    
    this.colors = {
      reset: '\x1b[0m',
      bright: '\x1b[1m',
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      cyan: '\x1b[36m',
      magenta: '\x1b[35m'
    };

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  log(message, color = 'reset') {
    console.log(`${this.colors[color]}${message}${this.colors.reset}`);
  }

  async askQuestion(question) {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer);
      });
    });
  }

  async checkDatabaseConnection() {
    try {
      const command = `PGPASSWORD="${this.dbConfig.password}" pg_isready -h ${this.dbConfig.host} -p ${this.dbConfig.port} -U ${this.dbConfig.user} -d ${this.dbConfig.database}`;
      execSync(command, { stdio: 'pipe' });
      this.log('✅ Database connection successful', 'green');
      return true;
    } catch (error) {
      this.log('❌ Database connection failed', 'red');
      this.log(`Error: ${error.message}`, 'red');
      return false;
    }
  }

  async checkDatabaseExists() {
    try {
      const command = `PGPASSWORD="${this.dbConfig.password}" psql -h ${this.dbConfig.host} -p ${this.dbConfig.port} -U ${this.dbConfig.user} -lqt | cut -d \\| -f 1 | grep -qw ${this.dbConfig.database}`;
      execSync(command, { stdio: 'pipe' });
      return true;
    } catch (error) {
      return false;
    }
  }

  async createDatabase() {
    this.log(`🏗️  Creating database: ${this.dbConfig.database}`, 'cyan');
    
    try {
      const command = `PGPASSWORD="${this.dbConfig.password}" createdb -h ${this.dbConfig.host} -p ${this.dbConfig.port} -U ${this.dbConfig.user} ${this.dbConfig.database}`;
      execSync(command, { stdio: 'pipe' });
      this.log(`✅ Database created: ${this.dbConfig.database}`, 'green');
      return true;
    } catch (error) {
      this.log(`❌ Failed to create database: ${error.message}`, 'red');
      return false;
    }
  }

  listBackupFiles() {
    if (!fs.existsSync(this.backupDir)) {
      this.log(`❌ Backup directory not found: ${this.backupDir}`, 'red');
      return [];
    }

    const files = fs.readdirSync(this.backupDir)
      .filter(file => file.endsWith('.sql') || file.endsWith('.dump') || file.endsWith('.tar'))
      .map(file => {
        const filePath = path.join(this.backupDir, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          path: filePath,
          size: stats.size,
          sizeFormatted: `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
          modified: stats.mtime.toISOString().slice(0, 19).replace('T', ' ')
        };
      })
      .sort((a, b) => b.modified.localeCompare(a.modified));

    return files;
  }

  async selectBackupFile() {
    const files = this.listBackupFiles();
    
    if (files.length === 0) {
      this.log('❌ No backup files found', 'red');
      return null;
    }

    this.log('\n📋 Available backup files:', 'cyan');
    this.log('=' .repeat(80), 'cyan');
    
    files.forEach((file, index) => {
      this.log(`${(index + 1).toString().padStart(2)}. ${file.name}`, 'yellow');
      this.log(`    Size: ${file.sizeFormatted} | Modified: ${file.modified}`, 'blue');
    });

    this.log('\n0. Cancel', 'red');
    
    const choice = await this.askQuestion('\nSelect backup file (number): ');
    const index = parseInt(choice) - 1;
    
    if (choice === '0') {
      return null;
    }
    
    if (index >= 0 && index < files.length) {
      return files[index];
    } else {
      this.log('❌ Invalid selection', 'red');
      return null;
    }
  }

  async confirmRestore(backupFile) {
    this.log('\n⚠️  WARNING: This will replace all data in the database!', 'red');
    this.log(`Database: ${this.dbConfig.database}`, 'yellow');
    this.log(`Backup file: ${backupFile.name}`, 'yellow');
    this.log(`File size: ${backupFile.sizeFormatted}`, 'yellow');
    
    const confirm = await this.askQuestion('\nAre you sure you want to continue? (yes/no): ');
    return confirm.toLowerCase() === 'yes' || confirm.toLowerCase() === 'y';
  }

  async createBackupBeforeRestore() {
    this.log('\n💾 Creating backup before restore...', 'cyan');
    
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const backupFile = path.join(this.backupDir, `iqx_pre_restore_backup_${timestamp}.sql`);
      
      const command = `PGPASSWORD="${this.dbConfig.password}" pg_dump -h ${this.dbConfig.host} -p ${this.dbConfig.port} -U ${this.dbConfig.user} -d ${this.dbConfig.database} --clean --no-owner --no-privileges`;
      
      const output = execSync(command, { encoding: 'utf8', maxBuffer: 1024 * 1024 * 100 });
      fs.writeFileSync(backupFile, output);
      
      this.log(`✅ Pre-restore backup created: ${path.basename(backupFile)}`, 'green');
      return backupFile;
    } catch (error) {
      this.log(`⚠️  Failed to create pre-restore backup: ${error.message}`, 'yellow');
      return null;
    }
  }

  async restoreFromSQL(backupFile) {
    this.log(`\n🔄 Restoring from SQL file: ${backupFile.name}`, 'cyan');
    
    try {
      const command = `PGPASSWORD="${this.dbConfig.password}" psql -h ${this.dbConfig.host} -p ${this.dbConfig.port} -U ${this.dbConfig.user} -d ${this.dbConfig.database} -f "${backupFile.path}"`;
      
      this.log('📝 Executing restore...', 'yellow');
      execSync(command, { stdio: 'pipe' });
      
      this.log('✅ SQL restore completed successfully', 'green');
      return true;
    } catch (error) {
      this.log(`❌ SQL restore failed: ${error.message}`, 'red');
      return false;
    }
  }

  async restoreFromCustom(backupFile) {
    this.log(`\n🔄 Restoring from custom format: ${backupFile.name}`, 'cyan');
    
    try {
      const command = `PGPASSWORD="${this.dbConfig.password}" pg_restore -h ${this.dbConfig.host} -p ${this.dbConfig.port} -U ${this.dbConfig.user} -d ${this.dbConfig.database} --clean --no-owner --no-privileges "${backupFile.path}"`;
      
      this.log('📝 Executing restore...', 'yellow');
      execSync(command, { stdio: 'pipe' });
      
      this.log('✅ Custom format restore completed successfully', 'green');
      return true;
    } catch (error) {
      this.log(`❌ Custom format restore failed: ${error.message}`, 'red');
      return false;
    }
  }

  async restoreImages() {
    this.log('\n🖼️  Looking for images backup...', 'cyan');
    
    const imageBackups = fs.readdirSync(this.backupDir)
      .filter(file => file.includes('images') && file.endsWith('.tar.gz'))
      .sort()
      .reverse();

    if (imageBackups.length === 0) {
      this.log('⚠️  No images backup found', 'yellow');
      return false;
    }

    const latestImageBackup = imageBackups[0];
    const backupPath = path.join(this.backupDir, latestImageBackup);
    const imagesDir = path.join(process.cwd(), 'src', 'uploads');

    try {
      this.log(`📝 Restoring images from: ${latestImageBackup}`, 'yellow');
      
      // Create uploads directory if it doesn't exist
      if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
      }

      const command = `tar -xzf "${backupPath}" -C "${imagesDir}"`;
      execSync(command);
      
      this.log('✅ Images restored successfully', 'green');
      return true;
    } catch (error) {
      this.log(`❌ Images restore failed: ${error.message}`, 'red');
      return false;
    }
  }

  async verifyRestore() {
    this.log('\n🔍 Verifying restore...', 'cyan');
    
    try {
      // Check if main tables exist and have data
      const tables = ['tickers', 'historical_prices', 'data_collection_logs'];
      const results = {};

      for (const table of tables) {
        try {
          const command = `PGPASSWORD="${this.dbConfig.password}" psql -h ${this.dbConfig.host} -p ${this.dbConfig.port} -U ${this.dbConfig.user} -d ${this.dbConfig.database} -t -c "SELECT COUNT(*) FROM ${table};"`;
          const output = execSync(command, { encoding: 'utf8' });
          const count = parseInt(output.trim());
          results[table] = count;
          this.log(`📊 ${table}: ${count} records`, count > 0 ? 'green' : 'yellow');
        } catch (error) {
          results[table] = 'ERROR';
          this.log(`❌ ${table}: Error checking`, 'red');
        }
      }

      const hasData = Object.values(results).some(count => count > 0);
      if (hasData) {
        this.log('✅ Restore verification successful', 'green');
        return true;
      } else {
        this.log('⚠️  Warning: No data found in main tables', 'yellow');
        return false;
      }
    } catch (error) {
      this.log(`❌ Verification failed: ${error.message}`, 'red');
      return false;
    }
  }

  showUsage() {
    console.log(`
🔄 IQX Database Restore Tool

Usage: node tools/database-restore.js [options]

Options:
  --file <path>       Restore from specific backup file
  --latest            Restore from latest backup file
  --list              List available backup files
  --images            Also restore images
  --no-backup         Skip creating backup before restore
  --help              Show this help message

Examples:
  node tools/database-restore.js
  node tools/database-restore.js --latest
  node tools/database-restore.js --file backups/iqx_full_backup_2024-01-01.sql
  node tools/database-restore.js --latest --images
    `);
  }

  async run() {
    const args = process.argv.slice(2);
    
    if (args.includes('--help')) {
      this.showUsage();
      this.rl.close();
      return;
    }

    if (args.includes('--list')) {
      this.log('📋 Available backup files:', 'cyan');
      const files = this.listBackupFiles();
      files.forEach(file => {
        this.log(`${file.name} (${file.sizeFormatted}) - ${file.modified}`, 'yellow');
      });
      this.rl.close();
      return;
    }

    this.log('🔄 IQX Database Restore Tool', 'bright');
    this.log('=' .repeat(40), 'bright');

    try {
      // Check database connection
      if (!(await this.checkDatabaseConnection())) {
        // Try to create database if it doesn't exist
        if (!(await this.checkDatabaseExists())) {
          const createDb = await this.askQuestion('Database does not exist. Create it? (yes/no): ');
          if (createDb.toLowerCase() === 'yes' || createDb.toLowerCase() === 'y') {
            if (!(await this.createDatabase())) {
              process.exit(1);
            }
          } else {
            process.exit(1);
          }
        }
      }

      let backupFile;

      if (args.includes('--file')) {
        const fileIndex = args.indexOf('--file');
        const filePath = args[fileIndex + 1];
        if (!filePath || !fs.existsSync(filePath)) {
          this.log('❌ Backup file not found', 'red');
          process.exit(1);
        }
        const stats = fs.statSync(filePath);
        backupFile = {
          name: path.basename(filePath),
          path: filePath,
          size: stats.size,
          sizeFormatted: `${(stats.size / 1024 / 1024).toFixed(2)} MB`
        };
      } else if (args.includes('--latest')) {
        const files = this.listBackupFiles();
        if (files.length === 0) {
          this.log('❌ No backup files found', 'red');
          process.exit(1);
        }
        backupFile = files[0];
        this.log(`📁 Selected latest backup: ${backupFile.name}`, 'green');
      } else {
        backupFile = await this.selectBackupFile();
        if (!backupFile) {
          this.log('❌ No backup file selected', 'red');
          this.rl.close();
          return;
        }
      }

      // Confirm restore
      if (!(await this.confirmRestore(backupFile))) {
        this.log('❌ Restore cancelled', 'yellow');
        this.rl.close();
        return;
      }

      // Create backup before restore (unless --no-backup)
      if (!args.includes('--no-backup')) {
        await this.createBackupBeforeRestore();
      }

      // Perform restore based on file type
      let success = false;
      if (backupFile.name.endsWith('.sql')) {
        success = await this.restoreFromSQL(backupFile);
      } else if (backupFile.name.endsWith('.dump')) {
        success = await this.restoreFromCustom(backupFile);
      } else {
        this.log('❌ Unsupported backup file format', 'red');
        this.rl.close();
        return;
      }

      if (!success) {
        this.log('❌ Restore failed', 'red');
        this.rl.close();
        return;
      }

      // Restore images if requested
      if (args.includes('--images')) {
        await this.restoreImages();
      }

      // Verify restore
      await this.verifyRestore();

      this.log('\n🎉 Restore completed successfully!', 'green');
      this.log('💡 You may want to restart the application to ensure everything works correctly.', 'blue');

    } catch (error) {
      this.log(`\n❌ Restore failed: ${error.message}`, 'red');
      process.exit(1);
    } finally {
      this.rl.close();
    }
  }
}

// Run the restore tool
if (require.main === module) {
  const restore = new DatabaseRestore();
  restore.run().catch(error => {
    console.error('❌ Restore tool failed:', error.message);
    process.exit(1);
  });
}

module.exports = DatabaseRestore;
