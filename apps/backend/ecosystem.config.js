
module.exports = {
  apps: [{
    name: 'mao-backend',
    script: './dist/index.js',
    cwd: '/home/ubuntu/mao-clinics/apps/backend',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: '/home/ubuntu/logs/mao-backend-error.log',
    out_file: '/home/ubuntu/logs/mao-backend-out.log',
    merge_logs: true
  }]
}
