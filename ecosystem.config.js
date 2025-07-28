module.exports = {
  apps: [
    {
      name: 'be-iqx',
      script: 'src/app.js',
      cwd: '/Users/danhtrongtran/Documents/iqx/final/be-iqx',
      instances: 1,
      exec_mode: 'fork',
      
      // Environment variables
      env: {
        NODE_ENV: 'development',
        PORT: 5001
      },
      
      env_production: {
        NODE_ENV: 'production',
        PORT: 5001
      },
      
      // Logging
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Auto restart settings
      watch: false,
      ignore_watch: [
        'node_modules',
        'logs',
        'backups',
        '.git'
      ],
      
      // Restart settings
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '1G',
      
      // Advanced settings
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 3000,
      
      // Auto restart on file changes (for development)
      watch_delay: 1000,
      
      // Merge logs from all instances
      merge_logs: true,
      
      // Time zone
      time: true,
      
      // Source map support
      source_map_support: true,
      
      // Instance variables
      instance_var: 'INSTANCE_ID',
      
      // Graceful shutdown
      shutdown_with_message: true,
      
      // Health check
      health_check_grace_period: 3000
    }
  ],

  deploy: {
    production: {
      user: 'node',
      host: 'localhost',
      ref: 'origin/main',
      repo: 'git@github.com:your-repo/be-iqx.git',
      path: '/var/www/be-iqx',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};
