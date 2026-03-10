module.exports = {
  apps: [
    {
      name: "vote-rutherford",
      script: "./dist/server/entry.mjs",
      instances: "max",
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
      },
      // Give enough time for the database to sync during startup if necessary
      listen_timeout: 30000,
      kill_timeout: 5000,
    },
    {
      name: "email-worker",
      script: "./src/lib/jobs/emailWorker.ts",
      interpreter: "tsx", // Since tsx is in dependencies
      env: {
        NODE_ENV: "production",
      },
      restart_delay: 5000,
    },
  ],
};
