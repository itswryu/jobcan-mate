const cron = require('node-cron');
const { exec } = require('child_process');
const path = require('path');
const { getConfig } = require('./jobcan'); // getConfig 함수를 jobcan.js에서 가져옵니다.

const mainScriptPath = path.join(__dirname, 'main.js');

async function runJob(action) {
  console.log(`[${new Date().toISOString()}] Running ${action} job...`);
  exec(`node ${mainScriptPath} ${action}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`[${new Date().toISOString()}] Error executing ${action} job:`, error);
      return;
    }
    if (stderr) {
      console.error(`[${new Date().toISOString()}] Stderr for ${action} job:`, stderr);
    }
    console.log(`[${new Date().toISOString()}] Stdout for ${action} job:`, stdout);
    console.log(`[${new Date().toISOString()}] ${action} job finished.`);
  });
}

async function startScheduler() {
  try {
    const config = await getConfig();
    const { scheduler } = config;

    if (!scheduler || !scheduler.enabled) {
      console.log('Scheduler is disabled in config.json.');
      return;
    }

    const { checkInCron, checkOutCron, timezone } = scheduler;

    if (!cron.validate(checkInCron)) {
      console.error(`Invalid cron expression for check-in: ${checkInCron}`);
      return;
    }
    if (!cron.validate(checkOutCron)) {
      console.error(`Invalid cron expression for check-out: ${checkOutCron}`);
      return;
    }

    console.log(`Scheduler started. Timezone: ${timezone || 'System Default'}`);

    cron.schedule(checkInCron, () => {
      console.log(`[${new Date().toISOString()}] Triggering check-in job as per schedule: ${checkInCron}`);
      runJob('checkIn');
    }, {
      timezone: timezone
    });
    console.log(`Scheduled check-in job with cron: ${checkInCron}`);

    cron.schedule(checkOutCron, () => {
      console.log(`[${new Date().toISOString()}] Triggering check-out job as per schedule: ${checkOutCron}`);
      runJob('checkOut');
    }, {
      timezone: timezone
    });
    console.log(`Scheduled check-out job with cron: ${checkOutCron}`);

  } catch (error) {
    console.error('Error starting scheduler:', error);
  }
}

startScheduler();
