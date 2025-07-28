#!/usr/bin/env node

/**
 * Database Backup Tool for IQX Stock Data API
 * Tạo backup database với nhiều tùy chọn khác nhau
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
require('dotenv').config();

class DatabaseBackup {
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

  async createFullBackup() {
    this.log('\n🗄️  Creating full database backup...', 'cyan');
    
    const backupFile = path.join(this.backupDir, `iqx_full_backup_${this.timestamp}.sql`);
    
    try {
      const command = `PGPASSWORD="${this.dbConfig.password}" pg_dump -h ${this.dbConfig.host} -p ${this.dbConfig.port} -U ${this.dbConfig.user} -d ${this.dbConfig.database} --verbose --clean --no-owner --no-privileges`;
      
      this.log(`📝 Executing: pg_dump to ${backupFile}`, 'yellow');
      
      const output = execSync(command, { encoding: 'utf8', maxBuffer: 1024 * 1024 * 100 });
      fs.writeFileSync(backupFile, output);
      
      const stats = fs.statSync(backupFile);
      this.log(`✅ Full backup completed: ${backupFile}`, 'green');
      this.log(`📊 File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`, 'blue');
      
      return backupFile;
    } catch (error) {
      this.log(`❌ Full backup failed: ${error.message}`, 'red');
      throw error;
    }
  }

  async createSchemaOnlyBackup() {
    this.log('\n🏗️  Creating schema-only backup...', 'cyan');
    
    const backupFile = path.join(this.backupDir, `iqx_schema_${this.timestamp}.sql`);
    
    try {
      const command = `PGPASSWORD="${this.dbConfig.password}" pg_dump -h ${this.dbConfig.host} -p ${this.dbConfig.port} -U ${this.dbConfig.user} -d ${this.dbConfig.database} --schema-only --verbose --clean --no-owner --no-privileges`;
      
      this.log(`📝 Executing: pg_dump schema-only to ${backupFile}`, 'yellow');
      
      const output = execSync(command, { encoding: 'utf8' });
      fs.writeFileSync(backupFile, output);
      
      const stats = fs.statSync(backupFile);
      this.log(`✅ Schema backup completed: ${backupFile}`, 'green');
      this.log(`📊 File size: ${(stats.size / 1024).toFixed(2)} KB`, 'blue');
      
      return backupFile;
    } catch (error) {
      this.log(`❌ Schema backup failed: ${error.message}`, 'red');
      throw error;
    }
  }

  async createDataOnlyBackup() {
    this.log('\n📊 Creating data-only backup...', 'cyan');
    
    const backupFile = path.join(this.backupDir, `iqx_data_${this.timestamp}.sql`);
    
    try {
      const command = `PGPASSWORD="${this.dbConfig.password}" pg_dump -h ${this.dbConfig.host} -p ${this.dbConfig.port} -U ${this.dbConfig.user} -d ${this.dbConfig.database} --data-only --verbose --no-owner --no-privileges`;
      
      this.log(`📝 Executing: pg_dump data-only to ${backupFile}`, 'yellow');
      
      const output = execSync(command, { encoding: 'utf8', maxBuffer: 1024 * 1024 * 100 });
      fs.writeFileSync(backupFile, output);
      
      const stats = fs.statSync(backupFile);
      this.log(`✅ Data backup completed: ${backupFile}`, 'green');
      this.log(`📊 File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`, 'blue');
      
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
      const command = `PGPASSWORD="${this.dbConfig.password}" pg_dump -h ${this.dbConfig.host} -p ${this.dbConfig.port} -U ${this.dbConfig.user} -d ${this.dbConfig.database} --table=${tableName} --verbose --clean --no-owner --no-privileges`;
      
      this.log(`📝 Executing: pg_dump table ${tableName} to ${backupFile}`, 'yellow');
      
      const output = execSync(command, { encoding: 'utf8' });
      fs.writeFileSync(backupFile, output);
      
      const stats = fs.statSync(backupFile);
      this.log(`✅ Table backup completed: ${backupFile}`, 'green');
      this.log(`📊 File size: ${(stats.size / 1024).toFixed(2)} KB`, 'blue');
      
      return backupFile;
    } catch (error) {
      this.log(`❌ Table backup failed: ${error.message}`, 'red');
      throw error;
    }
  }

  async createCustomBackup(options = {}) {
    this.log('\n🔧 Creating custom backup...', 'cyan');
    
    const {
      tables = [],
      excludeTables = [],
      format = 'plain', // plain, custom, directory, tar
      compress = false
    } = options;

    let backupFile;
    let command = `PGPASSWORD="${this.dbConfig.password}" pg_dump -h ${this.dbConfig.host} -p ${this.dbConfig.port} -U ${this.dbConfig.user} -d ${this.dbConfig.database}`;

    // Add format
    if (format !== 'plain') {
      command += ` --format=${format}`;
      const extension = format === 'custom' ? 'dump' : format === 'tar' ? 'tar' : 'sql';
      backupFile = path.join(this.backupDir, `iqx_custom_${this.timestamp}.${extension}`);
      command += ` --file="${backupFile}"`;
    } else {
      backupFile = path.join(this.backupDir, `iqx_custom_${this.timestamp}.sql`);
    }

    // Add compression
    if (compress && format === 'plain') {
      command += ' --compress=9';
      backupFile += '.gz';
    }

    // Add specific tables
    if (tables.length > 0) {
      tables.forEach(table => {
        command += ` --table=${table}`;
      });
    }

    // Exclude tables
    if (excludeTables.length > 0) {
      excludeTables.forEach(table => {
        command += ` --exclude-table=${table}`;
      });
    }

    command += ' --verbose --clean --no-owner --no-privileges';

    try {
      this.log(`📝 Executing custom backup: ${command}`, 'yellow');
      
      if (format === 'plain') {
        const output = execSync(command, { encoding: 'utf8', maxBuffer: 1024 * 1024 * 100 });
        if (!compress) {
          fs.writeFileSync(backupFile, output);
        }
      } else {
        execSync(command, { stdio: 'pipe' });
      }
      
      const stats = fs.statSync(backupFile);
      this.log(`✅ Custom backup completed: ${backupFile}`, 'green');
      this.log(`📊 File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`, 'blue');
      
      return backupFile;
    } catch (error) {
      this.log(`❌ Custom backup failed: ${error.message}`, 'red');
      throw error;
    }
  }

  async backupImages() {
    this.log('\n🖼️  Creating images backup...', 'cyan');
    
    const imagesDir = path.join(process.cwd(), 'src', 'uploads', 'images');
    const backupFile = path.join(this.backupDir, `iqx_images_${this.timestamp}.tar.gz`);
    
    try {
      if (!fs.existsSync(imagesDir)) {
        this.log('⚠️  Images directory not found, skipping...', 'yellow');
        return null;
      }

      const command = `tar -czf "${backupFile}" -C "${path.dirname(imagesDir)}" "${path.basename(imagesDir)}"`;
      
      this.log(`📝 Executing: ${command}`, 'yellow');
      execSync(command);
      
      const stats = fs.statSync(backupFile);
      this.log(`✅ Images backup completed: ${backupFile}`, 'green');
      this.log(`📊 File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`, 'blue');
      
      return backupFile;
    } catch (error) {
      this.log(`❌ Images backup failed: ${error.message}`, 'red');
      throw error;
    }
  }

  async createManifest(backupFiles) {
    const manifestFile = path.join(this.backupDir, `iqx_backup_manifest_${this.timestamp}.json`);
    
    const manifest = {
      timestamp: new Date().toISOString(),
      database: this.dbConfig.database,
      host: this.dbConfig.host,
      backupFiles: backupFiles.filter(file => file !== null).map(file => {
        const stats = fs.statSync(file);
        return {
          filename: path.basename(file),
          fullPath: file,
          size: stats.size,
          sizeFormatted: `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
          created: stats.birthtime.toISOString()
        };
      }),
      totalSize: backupFiles.filter(file => file !== null).reduce((total, file) => {
        return total + fs.statSync(file).size;
      }, 0)
    };

    fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));
    this.log(`📋 Backup manifest created: ${manifestFile}`, 'green');
    
    return manifestFile;
  }

  showUsage() {
    console.log(`
🗄️  IQX Database Backup Tool

Usage: node tools/database-backup.js [options]

Options:
  --full              Create full database backup (default)
  --schema            Create schema-only backup
  --data              Create data-only backup
  --table <name>      Create backup for specific table
  --custom            Create custom backup with options
  --images            Include images backup
  --all               Create all types of backups
  --help              Show this help message

Examples:
  node tools/database-backup.js --full
  node tools/database-backup.js --schema
  node tools/database-backup.js --table tickers
  node tools/database-backup.js --all
  node tools/database-backup.js --custom --images
    `);
  }

  async run() {
    const args = process.argv.slice(2);
    
    if (args.includes('--help')) {
      this.showUsage();
      return;
    }

    this.log('🗄️  IQX Database Backup Tool', 'bright');
    this.log('=' .repeat(40), 'bright');
    
    // Check database connection
    if (!(await this.checkDatabaseConnection())) {
      process.exit(1);
    }

    // Ensure backup directory exists
    this.ensureBackupDirectory();

    const backupFiles = [];

    try {
      if (args.includes('--all')) {
        // Create all types of backups
        backupFiles.push(await this.createFullBackup());
        backupFiles.push(await this.createSchemaOnlyBackup());
        backupFiles.push(await this.createDataOnlyBackup());
        backupFiles.push(await this.backupImages());
        
      } else if (args.includes('--schema')) {
        backupFiles.push(await this.createSchemaOnlyBackup());
        
      } else if (args.includes('--data')) {
        backupFiles.push(await this.createDataOnlyBackup());
        
      } else if (args.includes('--table')) {
        const tableIndex = args.indexOf('--table');
        const tableName = args[tableIndex + 1];
        if (!tableName) {
          this.log('❌ Table name required after --table', 'red');
          process.exit(1);
        }
        backupFiles.push(await this.createTableBackup(tableName));
        
      } else if (args.includes('--custom')) {
        // Custom backup with options
        const options = {
          format: 'custom',
          compress: true
        };
        backupFiles.push(await this.createCustomBackup(options));
        
      } else {
        // Default: full backup
        backupFiles.push(await this.createFullBackup());
      }

      // Include images if requested
      if (args.includes('--images')) {
        backupFiles.push(await this.backupImages());
      }

      // Create manifest
      await this.createManifest(backupFiles);

      // Summary
      this.log('\n🎉 Backup completed successfully!', 'green');
      this.log(`📁 Backup directory: ${this.backupDir}`, 'blue');
      this.log(`📋 Files created: ${backupFiles.filter(f => f !== null).length}`, 'blue');
      
    } catch (error) {
      this.log(`\n❌ Backup failed: ${error.message}`, 'red');
      process.exit(1);
    }
  }
}

// Run the backup tool
if (require.main === module) {
  const backup = new DatabaseBackup();
  backup.run().catch(error => {
    console.error('❌ Backup tool failed:', error.message);
    process.exit(1);
  });
}

module.exports = DatabaseBackup;
