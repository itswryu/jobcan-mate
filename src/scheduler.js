const cron = require('node-cron');
const { exec } = require('child_process');
const path = require('path');
// getConfig also initializes notificationService, so sendNotification can be used directly here.
// getMessage is now also exported from jobcan.js
const { getConfig, getMessage } = require('./jobcan');
const { checkIfTodayIsOffDay } = require('./calendarService'); // Updated to use checkIfTodayIsOffDay
const { sendNotification } = require('./notificationService'); // sendNotification is already initialized by getConfig

const mainScriptPath = path.join(__dirname, 'main.js');

// appConfig will be loaded when the scheduler starts.
// This reduces the need to call getConfig separately in runJob or cron job callbacks.
let appConfig = null;

// Helper function to calculate cron time based on base time, delay, and weekdaysOnly flag
function calculateCronTime(baseTime, delayMinutes, weekdaysOnly) {
  const [hours, minutes] = baseTime.split(':').map(Number);
  const date = new Date();
  date.setHours(hours);
  date.setMinutes(minutes + delayMinutes); // Add delay (can be negative)

  const cronMinutes = date.getMinutes();
  const cronHours = date.getHours();
  const dayOfWeek = weekdaysOnly ? '1-5' : '*'; // Monday-Friday or Any day

  // Cron format: "minute hour * * dayOfWeek"
  return `${cronMinutes} ${cronHours} * * ${dayOfWeek}`;
}

async function runJob(action) {
  // Ensure appConfig is loaded, though it should be by startScheduler
  if (!appConfig) {
    console.warn('[Scheduler] appConfig not loaded in runJob. Attempting to load now.');
    try {
      appConfig = await getConfig();
    } catch (e) {
      console.error('[Scheduler] Failed to load config in runJob:', e.message);
      // Cannot send localized message if config (and thus lang) is unavailable
      await sendNotification(`[CRITICAL] Scheduler: Failed to load config in runJob: ${e.message}`, true);
      return;
    }
  }
  const lang = appConfig.appSettings.messageLanguage; // Changed from appConfig.telegram.messageLanguage

  console.log(`[${new Date().toISOString()}] Running ${action} job...`);
  exec(`node ${mainScriptPath} ${action}`, async (error, stdout, stderr) => {
    if (error) {
      const errorMessage = `Error executing scheduled ${action} job: ${error.message}`;
      console.error(`[${new Date().toISOString()}] ${errorMessage}`);
      // Use getMessage for notification
      await sendNotification(getMessage(lang, 'schedulerExecError', { action, errorMsg: error.message }), true);
      return;
    }
    if (stderr) {
      const stderrMessage = `Stderr during scheduled ${action} job: ${stderr}`;
      console.warn(`[${new Date().toISOString()}] ${stderrMessage}`); // Changed to warn as stderr is not always a critical error
      // Notify for stderr, as it might indicate issues.
      await sendNotification(getMessage(lang, 'schedulerExecStdErr', { action, stderrMsg: stderr }), true);
    }
    console.log(`[${new Date().toISOString()}] Stdout for ${action} job:`, stdout);
    console.log(`[${new Date().toISOString()}] ${action} job finished.`);
    // Success notifications are handled within checkIn/checkOut in main.js, so no duplicate notification here.
  });
}

async function startScheduler() {
  try {
    appConfig = await getConfig(); // Load config and initialize notificationService via getConfig
    const lang = appConfig.appSettings.messageLanguage; // Changed from appConfig.telegram.messageLanguage

    const { scheduler, workHours, calendar } = appConfig;

    if (!scheduler?.enabled) {
      console.log('Scheduler is disabled in config.json.');
      return;
    }

    const { timezone, delayInMinutes } = scheduler;
    const { checkInTime, checkOutTime, weekdaysOnly } = workHours;

    if (!checkInTime || !checkOutTime) {
      const message = 'Check-in or Check-out time is not defined in workHours config.';
      console.error(message);
      await sendNotification(getMessage(lang, 'schedulerConfigError', { errorMsg: message }), true);
      return;
    }

    const checkInDelay = delayInMinutes?.checkIn || 0;
    const checkOutDelay = delayInMinutes?.checkOut || 0;

    const checkInCron = calculateCronTime(checkInTime, checkInDelay, weekdaysOnly);
    const checkOutCron = calculateCronTime(checkOutTime, checkOutDelay, weekdaysOnly);

    if (!cron.validate(checkInCron)) {
      const message = `Invalid cron expression for check-in: ${checkInCron}`;
      console.error(message);
      await sendNotification(getMessage(lang, 'schedulerInvalidCron', { cronExpr: checkInCron, type: 'check-in' }), true);
      return;
    }
    if (!cron.validate(checkOutCron)) {
      const message = `Invalid cron expression for check-out: ${checkOutCron}`;
      console.error(message);
      await sendNotification(getMessage(lang, 'schedulerInvalidCron', { cronExpr: checkOutCron, type: 'check-out' }), true);
      return;
    }

    const schedulerInitMessage = `Scheduler started. Timezone: ${timezone || 'System Default'}`;
    console.log(schedulerInitMessage);
    // Notification for scheduler start is deemed sufficient by log.

    cron.schedule(checkInCron, async () => {
      const today = new Date();
      const dateString = today.toISOString();
      console.log(`[${dateString}] Scheduled check-in: ${checkInCron} (Base: ${checkInTime}, Delay: ${checkInDelay}m)`);

      if (weekdaysOnly && (today.getDay() === 0 || today.getDay() === 6)) {
        const message = 'Today is a weekend. Skipping check-in job.';
        console.log(`[${dateString}] ${message}`);
        // Weekend skip notification is deemed sufficient by log.
        return;
      }

      // Use checkIfTodayIsOffDay instead of isTodayHoliday
      const offDayInfo = await checkIfTodayIsOffDay(calendar);
      if (offDayInfo) {
        let reason = '';
        if (offDayInfo.type === 'annualLeave') {
          reason = getMessage(lang, 'schedulerSkipAnnualLeave', { holidayName: offDayInfo.name });
        } else if (offDayInfo.type === 'publicHoliday') {
          reason = getMessage(lang, 'schedulerSkipPublicHoliday', { holidayName: offDayInfo.name });
        }
        const message = getMessage(lang, 'schedulerSkipReason', { reason });
        console.log(`[${dateString}] ${message}`);
        // Consider sending a notification for skipped job due to off-day
        // await sendNotification(message, false); // Example: false for non-critical
        return;
      }
      runJob('checkIn');
    }, {
      timezone: timezone
    });
    console.log(`Check-in job scheduled with cron: ${checkInCron}`);

    cron.schedule(checkOutCron, async () => {
      const today = new Date();
      const dateString = today.toISOString();
      console.log(`[${dateString}] Scheduled check-out: ${checkOutCron} (Base: ${checkOutTime}, Delay: ${checkOutDelay}m)`);

      if (weekdaysOnly && (today.getDay() === 0 || today.getDay() === 6)) {
        const message = 'Today is a weekend. Skipping check-out job.';
        console.log(`[${dateString}] ${message}`);
        // Weekend skip notification is deemed sufficient by log.
        return;
      }

      // Use checkIfTodayIsOffDay instead of isTodayHoliday
      const offDayInfo = await checkIfTodayIsOffDay(calendar);
      if (offDayInfo) {
        let reason = '';
        if (offDayInfo.type === 'annualLeave') {
          reason = getMessage(lang, 'schedulerSkipAnnualLeave', { holidayName: offDayInfo.name });
        } else if (offDayInfo.type === 'publicHoliday') {
          reason = getMessage(lang, 'schedulerSkipPublicHoliday', { holidayName: offDayInfo.name });
        }
        const message = getMessage(lang, 'schedulerSkipReason', { reason });
        console.log(`[${dateString}] ${message}`);
        // Consider sending a notification for skipped job due to off-day
        // await sendNotification(message, false);
        return;
      }
      runJob('checkOut');
    }, {
      timezone: timezone
    });
    console.log(`Check-out job scheduled with cron: ${checkOutCron}`);

  } catch (error) {
    const errorMessage = `Error starting scheduler: ${error.message}`;
    console.error(errorMessage);
    // If getConfig() fails, appConfig might be null, and notificationService might not be initialized.
    // sendNotification will internally log a warning and not send if service is uninitialized.
    // Fallback language to 'en' if config or lang is somehow undefined before this point.
    const currentLang = appConfig?.appSettings?.messageLanguage || 'en'; // Changed from appConfig.telegram.messageLanguage
    await sendNotification(getMessage(currentLang, 'schedulerStartError', { errorMsg: errorMessage }), true);
  }
}

startScheduler();
