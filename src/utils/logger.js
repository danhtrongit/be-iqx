const fs = require('fs');
const path = require('path');

class Logger {
  constructor() {
    this.logDir = path.join(process.cwd(), 'logs');
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...meta
    };
    return JSON.stringify(logEntry);
  }

  writeToFile(filename, message) {
    const filePath = path.join(this.logDir, filename);
    const logMessage = message + '\n';
    
    fs.appendFile(filePath, logMessage, (err) => {
      if (err) {
        console.error('Error writing to log file:', err);
      }
    });
  }

  info(message, meta = {}) {
    const formattedMessage = this.formatMessage('info', message, meta);
    console.log(formattedMessage);
    this.writeToFile('app.log', formattedMessage);
  }

  error(message, meta = {}) {
    const formattedMessage = this.formatMessage('error', message, meta);
    console.error(formattedMessage);
    this.writeToFile('error.log', formattedMessage);
  }

  warn(message, meta = {}) {
    const formattedMessage = this.formatMessage('warn', message, meta);
    console.warn(formattedMessage);
    this.writeToFile('app.log', formattedMessage);
  }

  debug(message, meta = {}) {
    if (process.env.NODE_ENV === 'development') {
      const formattedMessage = this.formatMessage('debug', message, meta);
      console.log(formattedMessage);
      this.writeToFile('debug.log', formattedMessage);
    }
  }

  // Log API requests
  logRequest(req, res, responseTime) {
    const logData = {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      contentLength: res.get('Content-Length') || 0
    };

    this.info('API Request', logData);
  }

  // Log data collection activities
  logDataCollection(ticker, status, details = {}) {
    const logData = {
      ticker,
      status,
      ...details
    };

    if (status === 'success') {
      this.info('Data collection successful', logData);
    } else {
      this.error('Data collection failed', logData);
    }
  }

  // Log scheduler activities
  logScheduler(action, details = {}) {
    this.info(`Scheduler: ${action}`, details);
  }

  // Log image operations
  logImageOperation(operation, ticker, status, details = {}) {
    const logData = {
      operation,
      ticker,
      status,
      ...details
    };

    if (status === 'success') {
      this.info('Image operation successful', logData);
    } else {
      this.error('Image operation failed', logData);
    }
  }

  // Clean old log files
  cleanOldLogs(daysToKeep = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    fs.readdir(this.logDir, (err, files) => {
      if (err) {
        this.error('Error reading log directory', { error: err.message });
        return;
      }

      files.forEach(file => {
        const filePath = path.join(this.logDir, file);
        fs.stat(filePath, (err, stats) => {
          if (err) {
            this.error('Error getting file stats', { file, error: err.message });
            return;
          }

          if (stats.mtime < cutoffDate) {
            fs.unlink(filePath, (err) => {
              if (err) {
                this.error('Error deleting old log file', { file, error: err.message });
              } else {
                this.info('Deleted old log file', { file });
              }
            });
          }
        });
      });
    });
  }
}

// Create singleton instance
const logger = new Logger();

module.exports = logger;
