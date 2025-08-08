module.exports = {
  apps: [{
    name: 'trading-app',
    script: 'dist/index.js',
    cwd: '/var/www/kaib.net/newv',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      DATABASE_URL: 'postgresql://root:111723@localhost:5432/trading_app',
      PGHOST: 'localhost',
        PGPORT: 5432,
        PGDATABASE: 'trading_app',
        PGUSER: 'root',
        PGPASSWORD: '111723'
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};

