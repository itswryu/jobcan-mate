// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'jobcan-mate-webapp',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    combine_logs: true,
    out_file: './pm2_logs/app-out.log', // Renamed to avoid conflict if logs/ also used by winston
    error_file: './pm2_logs/app-error.log',
    merge_logs: true,
    env_production: {
      NODE_ENV: 'production',
      // PORT: 3000, // Usually set by Docker or host environment
    },
  }]
};
