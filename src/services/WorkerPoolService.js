const { Worker } = require('worker_threads');
const path = require('path');
const os = require('os');

class WorkerPoolService {
  constructor(workerCount = 128) {
    this.workerCount = Math.min(workerCount, os.cpus().length * 4); // Limit based on CPU cores
    this.workers = [];
    this.queue = [];
    this.activeJobs = new Map();
    this.results = {
      success: [],
      failed: []
    };
    this.isInitialized = false;
    this.jobIdCounter = 0;
  }

  async initialize() {
    if (this.isInitialized) return;

    console.log(`Initializing worker pool with ${this.workerCount} workers...`);
    
    for (let i = 0; i < this.workerCount; i++) {
      await this.createWorker(i);
    }
    
    this.isInitialized = true;
    console.log(`Worker pool initialized with ${this.workers.length} workers`);
  }

  async createWorker(workerId) {
    return new Promise((resolve, reject) => {
      const workerPath = path.join(__dirname, 'tickerWorker.js');
      const worker = new Worker(workerPath, {
        workerData: { workerId }
      });

      worker.on('message', (message) => {
        this.handleWorkerMessage(workerId, message);
      });

      worker.on('error', (error) => {
        console.error(`Worker ${workerId} error:`, error);
        this.handleWorkerError(workerId, error);
      });

      worker.on('exit', (code) => {
        if (code !== 0) {
          console.error(`Worker ${workerId} stopped with exit code ${code}`);
        }
        this.handleWorkerExit(workerId);
      });

      // Test worker is ready
      worker.postMessage({ type: 'ping' });
      
      const timeout = setTimeout(() => {
        reject(new Error(`Worker ${workerId} failed to initialize within timeout`));
      }, 5000);

      const onReady = (message) => {
        if (message.type === 'pong') {
          clearTimeout(timeout);
          worker.removeListener('message', onReady);
          
          this.workers[workerId] = {
            worker,
            busy: false,
            currentJob: null
          };
          
          resolve();
        }
      };

      worker.on('message', onReady);
    });
  }

  handleWorkerMessage(workerId, message) {
    const workerInfo = this.workers[workerId];
    if (!workerInfo) return;

    switch (message.type) {
      case 'pong':
        // Worker is ready
        break;
        
      case 'job_complete':
        this.handleJobComplete(workerId, message);
        break;
        
      case 'job_error':
        this.handleJobError(workerId, message);
        break;
        
      case 'progress':
        console.log(`Worker ${workerId}: ${message.message}`);
        break;
    }
  }

  handleJobComplete(workerId, message) {
    const workerInfo = this.workers[workerId];
    const job = this.activeJobs.get(message.jobId);
    
    if (job) {
      this.results.success.push({
        ticker: job.ticker,
        data: message.result,
        workerId,
        duration: Date.now() - job.startTime
      });
      
      this.activeJobs.delete(message.jobId);
      job.resolve(message.result);
    }
    
    workerInfo.busy = false;
    workerInfo.currentJob = null;
    
    // Process next job in queue
    this.processQueue();
  }

  handleJobError(workerId, message) {
    const workerInfo = this.workers[workerId];
    const job = this.activeJobs.get(message.jobId);
    
    if (job) {
      this.results.failed.push({
        ticker: job.ticker,
        error: message.error,
        workerId,
        duration: Date.now() - job.startTime
      });
      
      this.activeJobs.delete(message.jobId);
      job.reject(new Error(message.error));
    }
    
    workerInfo.busy = false;
    workerInfo.currentJob = null;
    
    // Process next job in queue
    this.processQueue();
  }

  handleWorkerError(workerId, error) {
    const workerInfo = this.workers[workerId];
    if (workerInfo && workerInfo.currentJob) {
      const job = this.activeJobs.get(workerInfo.currentJob);
      if (job) {
        this.results.failed.push({
          ticker: job.ticker,
          error: error.message,
          workerId,
          duration: Date.now() - job.startTime
        });
        
        this.activeJobs.delete(workerInfo.currentJob);
        job.reject(error);
      }
    }
    
    // Recreate worker
    this.recreateWorker(workerId);
  }

  handleWorkerExit(workerId) {
    // Worker exited, recreate if needed
    if (this.isInitialized) {
      this.recreateWorker(workerId);
    }
  }

  async recreateWorker(workerId) {
    console.log(`Recreating worker ${workerId}...`);
    try {
      if (this.workers[workerId]) {
        this.workers[workerId].worker.terminate();
      }
      await this.createWorker(workerId);
      console.log(`Worker ${workerId} recreated successfully`);
    } catch (error) {
      console.error(`Failed to recreate worker ${workerId}:`, error);
    }
  }

  async fetchTicker(ticker) {
    return new Promise((resolve, reject) => {
      const jobId = ++this.jobIdCounter;
      const job = {
        jobId,
        ticker,
        resolve,
        reject,
        startTime: Date.now()
      };

      this.activeJobs.set(jobId, job);
      this.queue.push(job);
      
      this.processQueue();
    });
  }

  processQueue() {
    if (this.queue.length === 0) return;

    // Find available worker
    const availableWorker = this.workers.find(w => w && !w.busy);
    if (!availableWorker) return;

    const job = this.queue.shift();
    const workerId = this.workers.indexOf(availableWorker);
    
    availableWorker.busy = true;
    availableWorker.currentJob = job.jobId;
    
    // Send job to worker
    availableWorker.worker.postMessage({
      type: 'fetch_ticker',
      jobId: job.jobId,
      ticker: job.ticker
    });
  }

  async fetchAllTickers(tickers) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    console.log(`Starting parallel fetch for ${tickers.length} tickers using ${this.workerCount} workers...`);
    
    const startTime = Date.now();
    this.results = { success: [], failed: [] };
    
    // Create promises for all tickers
    const promises = tickers.map(ticker => 
      this.fetchTicker(ticker).catch(error => ({
        ticker,
        error: error.message
      }))
    );
    
    // Wait for all to complete
    await Promise.all(promises);
    
    const duration = Date.now() - startTime;
    
    console.log(`Parallel fetch completed in ${Math.round(duration / 1000)}s`);
    console.log(`Success: ${this.results.success.length}, Failed: ${this.results.failed.length}`);
    
    return {
      success: this.results.success,
      failed: this.results.failed,
      duration,
      totalTickers: tickers.length,
      workersUsed: this.workerCount
    };
  }

  getStats() {
    const busyWorkers = this.workers.filter(w => w && w.busy).length;
    return {
      totalWorkers: this.workerCount,
      busyWorkers,
      availableWorkers: this.workerCount - busyWorkers,
      queueLength: this.queue.length,
      activeJobs: this.activeJobs.size,
      successCount: this.results.success.length,
      failedCount: this.results.failed.length
    };
  }

  async terminate() {
    console.log('Terminating worker pool...');
    
    const terminatePromises = this.workers.map(workerInfo => {
      if (workerInfo && workerInfo.worker) {
        return workerInfo.worker.terminate();
      }
      return Promise.resolve();
    });
    
    await Promise.all(terminatePromises);
    
    this.workers = [];
    this.queue = [];
    this.activeJobs.clear();
    this.isInitialized = false;
    
    console.log('Worker pool terminated');
  }
}

module.exports = WorkerPoolService;
