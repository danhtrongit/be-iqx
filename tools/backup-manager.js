#!/usr/bin/env node

/**
 * Backup Manager Tool for IQX Stock Data API
 * Quản lý tổng hợp các backup: tạo, xóa, lên lịch, thống kê
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');
require('dotenv').config();

class BackupManager {
  constructor() {
    this.backupDir = path.join(process.cwd(), 'backups');
    this.configFile = path.join(this.backupDir, 'backup-config.json');
    
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

    this.defaultConfig = {
      retention: {
        daily: 7,    // Keep 7 daily backups
        weekly: 4,   // Keep 4 weekly backups
        monthly: 12  // Keep 12 monthly backups
      },
      schedule: {
        daily: '0 2 * * *',      // 2 AM daily
        weekly: '0 3 * * 0',     // 3 AM Sunday
        monthly: '0 4 1 * *'     // 4 AM 1st of month
      },
      autoCleanup: true,
      includeImages: true,
      compression: true
    };
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

  ensureBackupDirectory() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      this.log(`📁 Created backup directory: ${this.backupDir}`, 'green');
    }
  }

  loadConfig() {
    if (fs.existsSync(this.configFile)) {
      try {
        const config = JSON.parse(fs.readFileSync(this.configFile, 'utf8'));
        return { ...this.defaultConfig, ...config };
      } catch (error) {
        this.log(`⚠️  Error loading config, using defaults: ${error.message}`, 'yellow');
      }
    }
    return this.defaultConfig;
  }

  saveConfig(config) {
    try {
      fs.writeFileSync(this.configFile, JSON.stringify(config, null, 2));
      this.log('✅ Configuration saved', 'green');
    } catch (error) {
      this.log(`❌ Error saving config: ${error.message}`, 'red');
    }
  }

  listBackups() {
    if (!fs.existsSync(this.backupDir)) {
      return [];
    }

    const files = fs.readdirSync(this.backupDir)
      .filter(file => file.endsWith('.sql') || file.endsWith('.dump') || file.endsWith('.tar.gz'))
      .map(file => {
        const filePath = path.join(this.backupDir, file);
        const stats = fs.statSync(filePath);
        
        // Parse backup type from filename
        let type = 'unknown';
        if (file.includes('full')) type = 'full';
        else if (file.includes('schema')) type = 'schema';
        else if (file.includes('data')) type = 'data';
        else if (file.includes('images')) type = 'images';
        else if (file.includes('custom')) type = 'custom';

        return {
          name: file,
          path: filePath,
          type: type,
          size: stats.size,
          sizeFormatted: `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
          created: stats.birthtime,
          modified: stats.mtime,
          age: Math.floor((Date.now() - stats.birthtime.getTime()) / (1000 * 60 * 60 * 24)) // days
        };
      })
      .sort((a, b) => b.created.getTime() - a.created.getTime());

    return files;
  }

  showBackupList() {
    const backups = this.listBackups();
    
    if (backups.length === 0) {
      this.log('📋 No backups found', 'yellow');
      return;
    }

    this.log('\n📋 Backup Files:', 'cyan');
    this.log('=' .repeat(100), 'cyan');
    this.log('Type'.padEnd(10) + 'Name'.padEnd(40) + 'Size'.padEnd(12) + 'Age'.padEnd(8) + 'Created', 'blue');
    this.log('-' .repeat(100), 'blue');

    backups.forEach(backup => {
      const ageStr = backup.age === 0 ? 'Today' : `${backup.age}d ago`;
      const createdStr = backup.created.toISOString().slice(0, 19).replace('T', ' ');
      
      this.log(
        backup.type.padEnd(10) + 
        backup.name.substring(0, 39).padEnd(40) + 
        backup.sizeFormatted.padEnd(12) + 
        ageStr.padEnd(8) + 
        createdStr,
        'reset'
      );
    });

    // Summary
    const totalSize = backups.reduce((sum, backup) => sum + backup.size, 0);
    const totalSizeFormatted = `${(totalSize / 1024 / 1024).toFixed(2)} MB`;
    
    this.log('-' .repeat(100), 'blue');
    this.log(`Total: ${backups.length} files, ${totalSizeFormatted}`, 'green');
  }

  async createBackup(type = 'full') {
    this.log(`\n🗄️  Creating ${type} backup...`, 'cyan');
    
    try {
      const BackupTool = require('./database-backup');
      const backup = new BackupTool();
      
      // Run backup based on type
      const args = [`--${type}`];
      if (type === 'full') {
        args.push('--images');
      }
      
      // Simulate running backup tool
      const command = `node ${path.join(__dirname, 'database-backup.js')} ${args.join(' ')}`;
      execSync(command, { stdio: 'inherit' });
      
      this.log(`✅ ${type} backup completed`, 'green');
      return true;
    } catch (error) {
      this.log(`❌ Backup failed: ${error.message}`, 'red');
      return false;
    }
  }

  async cleanupOldBackups() {
    this.log('\n🧹 Cleaning up old backups...', 'cyan');
    
    const config = this.loadConfig();
    const backups = this.listBackups();
    
    if (!config.autoCleanup) {
      this.log('⚠️  Auto cleanup is disabled', 'yellow');
      return;
    }

    let deletedCount = 0;
    let freedSpace = 0;

    // Group backups by type
    const backupsByType = backups.reduce((groups, backup) => {
      if (!groups[backup.type]) groups[backup.type] = [];
      groups[backup.type].push(backup);
      return groups;
    }, {});

    // Apply retention policy
    for (const [type, typeBackups] of Object.entries(backupsByType)) {
      const retention = config.retention.daily; // Use daily retention for all types for now
      
      if (typeBackups.length > retention) {
        const toDelete = typeBackups.slice(retention);
        
        for (const backup of toDelete) {
          try {
            fs.unlinkSync(backup.path);
            deletedCount++;
            freedSpace += backup.size;
            this.log(`🗑️  Deleted: ${backup.name}`, 'yellow');
          } catch (error) {
            this.log(`❌ Failed to delete ${backup.name}: ${error.message}`, 'red');
          }
        }
      }
    }

    if (deletedCount > 0) {
      const freedSpaceFormatted = `${(freedSpace / 1024 / 1024).toFixed(2)} MB`;
      this.log(`✅ Cleanup completed: ${deletedCount} files deleted, ${freedSpaceFormatted} freed`, 'green');
    } else {
      this.log('✅ No cleanup needed', 'green');
    }
  }

  async deleteBackup() {
    const backups = this.listBackups();
    
    if (backups.length === 0) {
      this.log('❌ No backups found', 'red');
      return;
    }

    this.log('\n🗑️  Select backup to delete:', 'cyan');
    backups.forEach((backup, index) => {
      this.log(`${(index + 1).toString().padStart(2)}. ${backup.name} (${backup.sizeFormatted})`, 'yellow');
    });
    this.log(' 0. Cancel', 'red');

    const choice = await this.askQuestion('\nSelect backup to delete (number): ');
    const index = parseInt(choice) - 1;

    if (choice === '0') {
      this.log('❌ Cancelled', 'yellow');
      return;
    }

    if (index >= 0 && index < backups.length) {
      const backup = backups[index];
      const confirm = await this.askQuestion(`Are you sure you want to delete "${backup.name}"? (yes/no): `);
      
      if (confirm.toLowerCase() === 'yes' || confirm.toLowerCase() === 'y') {
        try {
          fs.unlinkSync(backup.path);
          this.log(`✅ Deleted: ${backup.name}`, 'green');
        } catch (error) {
          this.log(`❌ Failed to delete: ${error.message}`, 'red');
        }
      } else {
        this.log('❌ Cancelled', 'yellow');
      }
    } else {
      this.log('❌ Invalid selection', 'red');
    }
  }

  showStatistics() {
    const backups = this.listBackups();
    
    if (backups.length === 0) {
      this.log('📊 No backup statistics available', 'yellow');
      return;
    }

    this.log('\n📊 Backup Statistics:', 'cyan');
    this.log('=' .repeat(50), 'cyan');

    // Group by type
    const stats = backups.reduce((acc, backup) => {
      if (!acc[backup.type]) {
        acc[backup.type] = { count: 0, size: 0 };
      }
      acc[backup.type].count++;
      acc[backup.type].size += backup.size;
      return acc;
    }, {});

    // Display stats by type
    for (const [type, stat] of Object.entries(stats)) {
      const sizeFormatted = `${(stat.size / 1024 / 1024).toFixed(2)} MB`;
      this.log(`${type.padEnd(15)}: ${stat.count} files, ${sizeFormatted}`, 'green');
    }

    // Overall stats
    const totalFiles = backups.length;
    const totalSize = backups.reduce((sum, backup) => sum + backup.size, 0);
    const totalSizeFormatted = `${(totalSize / 1024 / 1024).toFixed(2)} MB`;
    const oldestBackup = backups[backups.length - 1];
    const newestBackup = backups[0];

    this.log('-' .repeat(50), 'blue');
    this.log(`Total files: ${totalFiles}`, 'blue');
    this.log(`Total size: ${totalSizeFormatted}`, 'blue');
    this.log(`Oldest backup: ${oldestBackup.created.toISOString().slice(0, 10)}`, 'blue');
    this.log(`Newest backup: ${newestBackup.created.toISOString().slice(0, 10)}`, 'blue');
  }

  async configureSettings() {
    this.log('\n⚙️  Backup Configuration:', 'cyan');
    
    const config = this.loadConfig();
    
    this.log('\nCurrent settings:', 'yellow');
    this.log(`Daily retention: ${config.retention.daily} backups`, 'blue');
    this.log(`Auto cleanup: ${config.autoCleanup ? 'Enabled' : 'Disabled'}`, 'blue');
    this.log(`Include images: ${config.includeImages ? 'Yes' : 'No'}`, 'blue');
    this.log(`Compression: ${config.compression ? 'Enabled' : 'Disabled'}`, 'blue');

    const modify = await this.askQuestion('\nModify settings? (yes/no): ');
    if (modify.toLowerCase() !== 'yes' && modify.toLowerCase() !== 'y') {
      return;
    }

    // Update retention
    const retention = await this.askQuestion(`Daily retention (current: ${config.retention.daily}): `);
    if (retention && !isNaN(parseInt(retention))) {
      config.retention.daily = parseInt(retention);
    }

    // Update auto cleanup
    const autoCleanup = await this.askQuestion(`Auto cleanup (current: ${config.autoCleanup}) [true/false]: `);
    if (autoCleanup === 'true' || autoCleanup === 'false') {
      config.autoCleanup = autoCleanup === 'true';
    }

    // Update include images
    const includeImages = await this.askQuestion(`Include images (current: ${config.includeImages}) [true/false]: `);
    if (includeImages === 'true' || includeImages === 'false') {
      config.includeImages = includeImages === 'true';
    }

    this.saveConfig(config);
  }

  showMenu() {
    this.log('\n🗄️  IQX Backup Manager', 'bright');
    this.log('=' .repeat(30), 'bright');
    this.log('1. List backups', 'cyan');
    this.log('2. Create full backup', 'cyan');
    this.log('3. Create schema backup', 'cyan');
    this.log('4. Create data backup', 'cyan');
    this.log('5. Delete backup', 'cyan');
    this.log('6. Cleanup old backups', 'cyan');
    this.log('7. Show statistics', 'cyan');
    this.log('8. Configure settings', 'cyan');
    this.log('9. Exit', 'red');
  }

  async run() {
    this.ensureBackupDirectory();
    
    while (true) {
      this.showMenu();
      const choice = await this.askQuestion('\nSelect option (1-9): ');

      switch (choice) {
        case '1':
          this.showBackupList();
          break;
        case '2':
          await this.createBackup('full');
          break;
        case '3':
          await this.createBackup('schema');
          break;
        case '4':
          await this.createBackup('data');
          break;
        case '5':
          await this.deleteBackup();
          break;
        case '6':
          await this.cleanupOldBackups();
          break;
        case '7':
          this.showStatistics();
          break;
        case '8':
          await this.configureSettings();
          break;
        case '9':
          this.log('👋 Goodbye!', 'green');
          this.rl.close();
          return;
        default:
          this.log('❌ Invalid option', 'red');
      }

      // Wait for user to press enter before showing menu again
      await this.askQuestion('\nPress Enter to continue...');
    }
  }

  showUsage() {
    console.log(`
🗄️  IQX Backup Manager

Usage: node tools/backup-manager.js [command]

Commands:
  list                List all backups
  create [type]       Create backup (full, schema, data)
  cleanup             Clean up old backups
  stats               Show backup statistics
  config              Configure backup settings
  interactive         Run interactive mode (default)

Examples:
  node tools/backup-manager.js list
  node tools/backup-manager.js create full
  node tools/backup-manager.js cleanup
  node tools/backup-manager.js stats
    `);
  }
}

// Run the backup manager
if (require.main === module) {
  const args = process.argv.slice(2);
  const manager = new BackupManager();

  if (args.includes('--help')) {
    manager.showUsage();
    process.exit(0);
  }

  const command = args[0];

  switch (command) {
    case 'list':
      manager.ensureBackupDirectory();
      manager.showBackupList();
      break;
    case 'create':
      const type = args[1] || 'full';
      manager.ensureBackupDirectory();
      manager.createBackup(type).then(() => process.exit(0));
      break;
    case 'cleanup':
      manager.ensureBackupDirectory();
      manager.cleanupOldBackups().then(() => process.exit(0));
      break;
    case 'stats':
      manager.ensureBackupDirectory();
      manager.showStatistics();
      break;
    case 'config':
      manager.ensureBackupDirectory();
      manager.configureSettings().then(() => process.exit(0));
      break;
    default:
      // Interactive mode
      manager.run().catch(error => {
        console.error('❌ Backup manager failed:', error.message);
        process.exit(1);
      });
  }
}

module.exports = BackupManager;
