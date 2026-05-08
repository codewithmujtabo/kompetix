// PM2 process supervisor config for Competzy backend.
// Usage on VPS:
//   cd /var/www/competzy/backend
//   npm install --production
//   npm run build
//   pm2 start ../deploy/pm2.config.js --env production
//   pm2 save && pm2 startup
//
// PM2 keeps the process alive across crashes and reboots and exposes
// `pm2 logs competzy-api` for tailing logs without journalctl.

module.exports = {
  apps: [
    {
      name: 'competzy-api',
      cwd: __dirname + '/../backend',
      script: 'dist/index.js',
      instances: 'max',                  // one process per CPU core
      exec_mode: 'cluster',
      max_memory_restart: '512M',        // restart if process leaks past this
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // Each instance writes to the same log file; PM2 rotates them.
      out_file: '/var/log/competzy/api-out.log',
      error_file: '/var/log/competzy/api-err.log',
      time: true,                        // prefix log lines with timestamps
    },
    {
      name: 'competzy-web',
      cwd: __dirname + '/../web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3001 -H 0.0.0.0',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        BACKEND_URL: 'http://127.0.0.1:3000',
      },
      out_file: '/var/log/competzy/web-out.log',
      error_file: '/var/log/competzy/web-err.log',
      time: true,
    },
  ],
};
