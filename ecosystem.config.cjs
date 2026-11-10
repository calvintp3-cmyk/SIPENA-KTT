const fs = require("node:fs");
const path = require("node:path");
const dotenv = require("dotenv");

const appDir = "/var/www/sipena-ktt/current";
const envFile = path.join(appDir, ".env.production");
const loadedEnv = fs.existsSync(envFile)
  ? dotenv.parse(fs.readFileSync(envFile, "utf8"))
  : {};

module.exports = {
  apps: [
    {
      name: "sipena-ktt",
      cwd: appDir,
      script: ".next/standalone/server.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "768M",
      env: {
        ...loadedEnv,
        NODE_ENV: "production",
        PORT: 3002,
        HOSTNAME: "127.0.0.1",
      },
      out_file: "/var/log/sipena/pm2-out.log",
      error_file: "/var/log/sipena/pm2-error.log",
      merge_logs: true,
      time: true,
    },
  ],
};
