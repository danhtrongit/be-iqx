#!/usr/bin/env node

/**
 * Node.js Pure Backup Tool (không cần PostgreSQL client tools)
 * Sử dụng pg module để backup database
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

class NodeJSBackup {
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

  async testConnection() {
    const client = new Client(this.dbConfig);
    
    try {
      await client.connect();
      await client.query('SELECT 1');
      await client.end();
      this.log('✅ Database connection successful', 'green');
      return true;
    } catch (error) {
      this.log('❌ Database connection failed', 'red');
      this.log(`Error: ${error.message}`, 'red');
      return false;
    }
  }

  async getTableList() {
    const client = new Client(this.dbConfig);
    
    try {
      await client.connect();
      
      const result = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `);
      
      await client.end();
      return result.rows.map(row => row.table_name);
    } catch (error) {
      this.log(`❌ Failed to get table list: ${error.message}`, 'red');
      return [];
    }
  }

  async getTableSchema(tableName) {
    const client = new Client(this.dbConfig);
    
    try {
      await client.connect();
      
      // Get table structure
      const result = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = $1 
        AND table_schema = 'public'
        ORDER BY ordinal_position
      `, [tableName]);
      
      await client.end();
      return result.rows;
    } catch (error) {
      this.log(`❌ Failed to get schema for ${tableName}: ${error.message}`, 'red');
      return [];
    }
  }

  async getTableData(tableName, limit = null) {
    const client = new Client(this.dbConfig);
    
    try {
      await client.connect();
      
      let query = `SELECT * FROM ${tableName}`;
      if (limit) {
        query += ` LIMIT ${limit}`;
      }
      
      const result = await client.query(query);
      await client.end();
      
      return result.rows;
    } catch (error) {
      this.log(`❌ Failed to get data from ${tableName}: ${error.message}`, 'red');
      return [];
    }
  }

  generateCreateTableSQL(tableName, schema) {
    let sql = `-- Table: ${tableName}\n`;
    sql += `DROP TABLE IF EXISTS ${tableName} CASCADE;\n`;
    sql += `CREATE TABLE ${tableName} (\n`;
    
    const columns = schema.map(col => {
      let colDef = `  ${col.column_name} ${col.data_type}`;
      
      if (col.is_nullable === 'NO') {
        colDef += ' NOT NULL';
      }
      
      if (col.column_default) {
        colDef += ` DEFAULT ${col.column_default}`;
      }
      
      return colDef;
    });
    
    sql += columns.join(',\n');
    sql += '\n);\n\n';
    
    return sql;
  }

  generateInsertSQL(tableName, data) {
    if (data.length === 0) {
      return `-- No data in table ${tableName}\n\n`;
    }

    let sql = `-- Data for table: ${tableName}\n`;
    
    const columns = Object.keys(data[0]);
    const columnList = columns.join(', ');
    
    sql += `INSERT INTO ${tableName} (${columnList}) VALUES\n`;
    
    const values = data.map(row => {
      const rowValues = columns.map(col => {
        const value = row[col];
        if (value === null) return 'NULL';
        if (typeof value === 'string') {
          return `'${value.replace(/'/g, "''")}'`; // Escape single quotes
        }
        if (typeof value === 'boolean') return value ? 'true' : 'false';
        if (value instanceof Date) return `'${value.toISOString()}'`;
        return value;
      });
      return `  (${rowValues.join(', ')})`;
    });
    
    sql += values.join(',\n');
    sql += ';\n\n';
    
    return sql;
  }

  async createDataBackup() {
    this.log('\n📊 Creating data backup using Node.js...', 'cyan');
    
    const backupFile = path.join(this.backupDir, `iqx_nodejs_backup_${this.timestamp}.sql`);
    
    try {
      const tables = await this.getTableList();
      
      if (tables.length === 0) {
        throw new Error('No tables found in database');
      }

      this.log(`📋 Found ${tables.length} tables to backup`, 'blue');
      
      let sqlContent = `-- IQX Database Backup (Node.js)\n`;
      sqlContent += `-- Generated: ${new Date().toISOString()}\n`;
      sqlContent += `-- Database: ${this.dbConfig.database}\n\n`;
      
      for (const tableName of tables) {
        this.log(`   📋 Processing table: ${tableName}`, 'yellow');
        
        // Get table schema
        const schema = await this.getTableSchema(tableName);
        sqlContent += this.generateCreateTableSQL(tableName, schema);
        
        // Get table data
        const data = await this.getTableData(tableName);
        sqlContent += this.generateInsertSQL(tableName, data);
        
        this.log(`   ✅ ${tableName}: ${data.length} records`, 'green');
      }
      
      // Write to file
      fs.writeFileSync(backupFile, sqlContent);
      
      const stats = fs.statSync(backupFile);
      this.log(`✅ Backup completed: ${backupFile}`, 'green');
      this.log(`📊 File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`, 'blue');
      
      return backupFile;
    } catch (error) {
      this.log(`❌ Backup failed: ${error.message}`, 'red');
      throw error;
    }
  }

  async createTableBackup(tableName) {
    this.log(`\n📋 Creating backup for table: ${tableName}...`, 'cyan');
    
    const backupFile = path.join(this.backupDir, `iqx_${tableName}_nodejs_${this.timestamp}.sql`);
    
    try {
      // Check if table exists
      const tables = await this.getTableList();
      if (!tables.includes(tableName)) {
        throw new Error(`Table '${tableName}' not found`);
      }

      let sqlContent = `-- IQX Table Backup: ${tableName}\n`;
      sqlContent += `-- Generated: ${new Date().toISOString()}\n\n`;
      
      // Get table schema and data
      const schema = await this.getTableSchema(tableName);
      const data = await this.getTableData(tableName);
      
      sqlContent += this.generateCreateTableSQL(tableName, schema);
      sqlContent += this.generateInsertSQL(tableName, data);
      
      // Write to file
      fs.writeFileSync(backupFile, sqlContent);
      
      const stats = fs.statSync(backupFile);
      this.log(`✅ Table backup completed: ${backupFile}`, 'green');
      this.log(`📊 Records: ${data.length}, File size: ${(stats.size / 1024).toFixed(2)} KB`, 'blue');
      
      return backupFile;
    } catch (error) {
      this.log(`❌ Table backup failed: ${error.message}`, 'red');
      throw error;
    }
  }

  async getStatistics() {
    this.log('\n📊 Getting database statistics...', 'cyan');
    
    const client = new Client(this.dbConfig);
    
    try {
      await client.connect();
      
      const tables = await this.getTableList();
      const stats = {};
      
      for (const tableName of tables) {
        const result = await client.query(`SELECT COUNT(*) as count FROM ${tableName}`);
        stats[tableName] = parseInt(result.rows[0].count);
      }
      
      await client.end();
      
      this.log('📋 Database Statistics:', 'blue');
      for (const [table, count] of Object.entries(stats)) {
        this.log(`   ${table}: ${count} records`, 'green');
      }
      
      const totalRecords = Object.values(stats).reduce((sum, count) => sum + count, 0);
      this.log(`📊 Total records: ${totalRecords}`, 'blue');
      
      return stats;
    } catch (error) {
      this.log(`❌ Failed to get statistics: ${error.message}`, 'red');
      return {};
    }
  }

  showUsage() {
    console.log(`
🗄️  IQX Node.js Backup Tool (No PostgreSQL client required)

Usage: node tools/nodejs-backup.js [options]

Options:
  --data              Create data backup (default)
  --table <name>      Create backup for specific table
  --stats             Show database statistics
  --test              Test database connection
  --help              Show this help message

Examples:
  node tools/nodejs-backup.js --data
  node tools/nodejs-backup.js --table tickers
  node tools/nodejs-backup.js --stats
  node tools/nodejs-backup.js --test
    `);
  }

  async run() {
    const args = process.argv.slice(2);
    
    if (args.includes('--help')) {
      this.showUsage();
      return;
    }

    this.log('🗄️  IQX Node.js Backup Tool', 'bright');
    this.log('=' .repeat(40), 'bright');
    
    // Test connection first
    if (!(await this.testConnection())) {
      process.exit(1);
    }

    // Ensure backup directory exists
    this.ensureBackupDirectory();

    try {
      if (args.includes('--test')) {
        this.log('✅ Connection test passed!', 'green');
        
      } else if (args.includes('--stats')) {
        await this.getStatistics();
        
      } else if (args.includes('--table')) {
        const tableIndex = args.indexOf('--table');
        const tableName = args[tableIndex + 1];
        if (!tableName) {
          this.log('❌ Table name required after --table', 'red');
          process.exit(1);
        }
        await this.createTableBackup(tableName);
        
      } else {
        // Default: data backup
        await this.createDataBackup();
      }

      this.log('\n🎉 Operation completed successfully!', 'green');
      
    } catch (error) {
      this.log(`\n❌ Operation failed: ${error.message}`, 'red');
      process.exit(1);
    }
  }
}

// Run the backup tool
if (require.main === module) {
  const backup = new NodeJSBackup();
  backup.run().catch(error => {
    console.error('❌ Backup tool failed:', error.message);
    process.exit(1);
  });
}

module.exports = NodeJSBackup;
