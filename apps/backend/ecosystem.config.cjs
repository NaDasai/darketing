// PM2 ecosystem for the Eagle Eyes backend.
//
// Usage on the VPS (run from the apps/backend directory):
//   pnpm install               # workspace deps + tsup
//   pnpm build                 # produces dist/
//   pm2 start ecosystem.config.cjs --env production
//   pm2 save && pm2 startup    # persist across reboots
//
// Both processes load environment variables from apps/backend/.env via dotenv
// inside the app itself, so PM2 doesn't need to inject them.

module.exports = {
  apps: [
    {
      name: 'eagle-eyes-api',
      script: 'dist/server.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      kill_timeout: 5000,
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'eagle-eyes-worker',
      script: 'dist/workers/pipeline.worker.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      kill_timeout: 10000,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
