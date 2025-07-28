#!/usr/bin/env node

/**
 * Convert Backup Format Tool
 * Convert custom format backup to SQL format for compatibility
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
require('dotenv').config();

class BackupConverter {
  constructor() {
    this.backupDir = path.join(process.cwd(), 'backups');
    
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

  listCustomBackups() {
    if (!fs.existsSync(this.backupDir)) {
      return [];
    }

    const files = fs.readdirSync(this.backupDir)
      .filter(file => file.endsWith('.dump'))
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

  async convertToSQL(dumpFile, outputFile) {
    return new Promise((resolve, reject) => {
      this.log(`🔄 Converting ${path.basename(dumpFile)} to SQL format...`, 'cyan');
      
      const pgRestore = spawn('pg_restore', [
        '--file=' + outputFile,
        '--clean',
        '--no-owner',
        '--no-privileges',
        '--verbose',
        dumpFile
      ]);

      let errorOutput = '';

      pgRestore.stderr.on('data', (data) => {
        const message = data.toString();
        if (message.includes('error:') || message.includes('FATAL:')) {
          errorOutput += message;
        } else {
          // Show progress
          process.stdout.write('.');
        }
      });

      pgRestore.on('close', (code) => {
        console.log(''); // New line after progress dots
        
        if (code === 0) {
          try {
            const stats = fs.statSync(outputFile);
            this.log(`✅ Conversion completed: ${path.basename(outputFile)}`, 'green');
            this.log(`📊 SQL file size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`, 'blue');
            resolve(outputFile);
          } catch (err) {
            reject(new Error(`Output file not created: ${err.message}`));
          }
        } else {
          reject(new Error(`pg_restore failed with code ${code}: ${errorOutput}`));
        }
      });

      pgRestore.on('error', (error) => {
        reject(new Error(`Failed to start pg_restore: ${error.message}`));
      });
    });
  }

  async convertAllCustomBackups() {
    const customBackups = this.listCustomBackups();
    
    if (customBackups.length === 0) {
      this.log('📋 No custom format backups found', 'yellow');
      return;
    }

    this.log(`📋 Found ${customBackups.length} custom format backup(s)`, 'blue');
    
    for (const backup of customBackups) {
      const sqlFileName = backup.name.replace('.dump', '.sql');
      const sqlFilePath = path.join(this.backupDir, sqlFileName);
      
      // Skip if SQL version already exists
      if (fs.existsSync(sqlFilePath)) {
        this.log(`⏭️  Skipping ${backup.name} (SQL version exists)`, 'yellow');
        continue;
      }

      try {
        await this.convertToSQL(backup.path, sqlFilePath);
      } catch (error) {
        this.log(`❌ Failed to convert ${backup.name}: ${error.message}`, 'red');
      }
    }
  }

  async convertSpecificFile(fileName) {
    const dumpPath = path.join(this.backupDir, fileName);
    
    if (!fs.existsSync(dumpPath)) {
      throw new Error(`File not found: ${fileName}`);
    }

    const sqlFileName = fileName.replace('.dump', '.sql');
    const sqlPath = path.join(this.backupDir, sqlFileName);
    
    await this.convertToSQL(dumpPath, sqlPath);
    return sqlPath;
  }

  showUsage() {
    console.log(`
🔄 Backup Format Converter

Usage: node tools/convert-backup-format.js [options]

Options:
  --all                Convert all .dump files to .sql
  --file <filename>    Convert specific .dump file
  --list              List available .dump files
  --help              Show this help message

Examples:
  node tools/convert-backup-format.js --all
  node tools/convert-backup-format.js --file iqx_compressed_2025-07-28T10-21-31.dump
  node tools/convert-backup-format.js --list
    `);
  }

  async run() {
    const args = process.argv.slice(2);
    
    if (args.includes('--help')) {
      this.showUsage();
      return;
    }

    this.log('🔄 Backup Format Converter', 'bright');
    this.log('=' .repeat(30), 'bright');

    try {
      if (args.includes('--list')) {
        const customBackups = this.listCustomBackups();
        
        if (customBackups.length === 0) {
          this.log('📋 No custom format backups found', 'yellow');
        } else {
          this.log('\n📋 Available custom format backups:', 'cyan');
          customBackups.forEach((backup, index) => {
            this.log(`${(index + 1).toString().padStart(2)}. ${backup.name}`, 'yellow');
            this.log(`    Size: ${backup.sizeFormatted} | Modified: ${backup.modified}`, 'blue');
          });
        }
        
      } else if (args.includes('--file')) {
        const fileIndex = args.indexOf('--file');
        const fileName = args[fileIndex + 1];
        
        if (!fileName) {
          this.log('❌ File name required after --file', 'red');
          process.exit(1);
        }
        
        await this.convertSpecificFile(fileName);
        
      } else if (args.includes('--all')) {
        await this.convertAllCustomBackups();
        
      } else {
        // Default: show available files and ask
        const customBackups = this.listCustomBackups();
        
        if (customBackups.length === 0) {
          this.log('📋 No custom format backups found to convert', 'yellow');
          this.log('💡 Use npm run backup-simple to create SQL format backups', 'blue');
        } else {
          this.log('\n📋 Available custom format backups:', 'cyan');
          customBackups.forEach((backup, index) => {
            this.log(`${(index + 1).toString().padStart(2)}. ${backup.name}`, 'yellow');
            this.log(`    Size: ${backup.sizeFormatted} | Modified: ${backup.modified}`, 'blue');
          });
          
          this.log('\n💡 Use --all to convert all files or --file <filename> for specific file', 'blue');
        }
      }

      this.log('\n🎉 Conversion completed!', 'green');
      
    } catch (error) {
      this.log(`\n❌ Conversion failed: ${error.message}`, 'red');
      process.exit(1);
    }
  }
}

// Run the converter
if (require.main === module) {
  const converter = new BackupConverter();
  converter.run().catch(error => {
    console.error('❌ Converter failed:', error.message);
    process.exit(1);
  });
}

module.exports = BackupConverter;
