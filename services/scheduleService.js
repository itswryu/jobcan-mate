const { CronJob } = require('node-cron');
const logger = require('../utils/logger');
const { User, UserSettings } = require('../database/setup');
const { executeJobcanTask } = require('./jobcanService');
const { sendNotification } = require('./telegramService');
const { checkIfUserOnLeave } = require('./calendarService'); // Updated import

const activeUserSchedules = new Map();

/**
 * Calculates cron-compatible hour and minute from base time and delay.
 * @param {string} baseTime - Time string in "HH:MM" format.
 * @param {number} delayMinutes - Delay in minutes (can be negative).
 * @returns {{ cronMinute: number, cronHour: number }}
 */
function calculateCronValues(baseTime, delayMinutes = 0) {
  if (!baseTime || !/^\d{2}:\d{2}$/.test(baseTime)) {
    logger.error(`Invalid baseTime format: ${baseTime}. Expected HH:MM.`);
    // Return a default or throw error. For now, let's default to midnight to avoid crashes if used directly.
    return { cronMinute: 0, cronHour: 0 }; 
  }

  const [baseHour, baseMinute] = baseTime.split(':').map(Number);
  let totalMinutes = baseHour * 60 + baseMinute + delayMinutes;

  // Handle rollovers for a 24-hour cycle
  const minutesInDay = 24 * 60;
  totalMinutes = (totalMinutes % minutesInDay + minutesInDay) % minutesInDay; // Ensure positive result within 0-1439

  const cronHour = Math.floor(totalMinutes / 60);
  const cronMinute = totalMinutes % 60;

  return { cronMinute, cronHour };
}

/**
 * Stops and removes scheduled tasks for a user.
 * @param {string} userId - The UUID of the user.
 */
function unscheduleUserTasks(userId) {
  const userSchedule = activeUserSchedules.get(userId);
  if (userSchedule) {
    if (userSchedule.checkInJob) {
      userSchedule.checkInJob.stop();
      logger.info(`Stopped check-in job for userId: ${userId}`);
    }
    if (userSchedule.checkOutJob) {
      userSchedule.checkOutJob.stop();
      logger.info(`Stopped check-out job for userId: ${userId}`);
    }
    activeUserSchedules.delete(userId);
    logger.info(`Removed user tasks from active schedules for userId: ${userId}`);
  }
}

/**
 * Schedules check-in and check-out tasks for a user based on their settings.
 * @param {string} userId - The UUID of the user.
 */
async function scheduleUserTasks(userId) {
  unscheduleUserTasks(userId); // Clear existing tasks first

  try {
    const settings = await UserSettings.findOne({ where: { userId }, include: [{ model: User, attributes: ['email'] }] });

    if (!settings || !settings.autoClockIn || !settings.autoClockOut || !settings.jobcanUsername || !settings.workStartTime || !settings.workEndTime) {
      logger.info(`Auto-scheduling disabled or required settings missing for userId: ${userId}. No tasks scheduled.`);
      return;
    }
    
    const userEmail = settings.User ? settings.User.email : settings.jobcanUsername; // Fallback to jobcanUsername for logs

    // Check-in Job
    const { cronMinute: checkInMinute, cronHour: checkInHour } = calculateCronValues(settings.workStartTime, settings.checkinDelayMinutes);
    const checkInCronPattern = `${checkInMinute} ${checkInHour} * * 1-5`; // Monday to Friday
    
    const checkInJob = new CronJob(
      checkInCronPattern,
      async () => {
        logger.info(`Executing scheduled check-in for userId: ${userId} (${userEmail}) at ${new Date().toISOString()}`);
        try {
          if (await checkIfUserOnLeave(userId, new Date())) { // Updated function call
            logger.info(`User ${userId} (${userEmail}) is on leave today. Skipping scheduled check-in.`);
            await sendNotification(userId, 'onLeaveSkippedCheckIn', { date: new Date().toLocaleDateString('ko-KR'), username: settings.jobcanUsername || `User ${userId}` });
            return;
          }
          const result = await executeJobcanTask(userId, 'checkIn');
          if (result.success) {
            await sendNotification(userId, 'jobcanCheckInSuccess', { time: new Date().toLocaleTimeString(), username: userEmail });
          } else {
            await sendNotification(userId, 'jobcanActionError', { taskType: 'check-in', errorMessage: result.error, username: userEmail });
          }
        } catch (jobError) {
          logger.error(`Error in scheduled check-in job for userId ${userId} (${userEmail}):`, { message: jobError.message, stack: jobError.stack });
        }
      },
      null, // onComplete
      false, // start immediately? No, we call .start()
      settings.timezone || 'Asia/Seoul' // timezone
    );
    checkInJob.start();
    logger.info(`Scheduled check-in for userId: ${userId} (${userEmail}) at ${checkInCronPattern} (${settings.timezone}). Next run: ${checkInJob.nextDate().toISOString()}`);

    // Check-out Job
    const { cronMinute: checkOutMinute, cronHour: checkOutHour } = calculateCronValues(settings.workEndTime, settings.checkoutDelayMinutes);
    const checkOutCronPattern = `${checkOutMinute} ${checkOutHour} * * 1-5`; // Monday to Friday

    const checkOutJob = new CronJob(
      checkOutCronPattern,
      async () => {
        logger.info(`Executing scheduled check-out for userId: ${userId} (${userEmail}) at ${new Date().toISOString()}`);
        try {
          if (await checkIfUserOnLeave(userId, new Date())) { // Updated function call
            logger.info(`User ${userId} (${userEmail}) is on leave today. Skipping scheduled check-out.`);
            await sendNotification(userId, 'onLeaveSkippedCheckOut', { date: new Date().toLocaleDateString('ko-KR'), username: settings.jobcanUsername || `User ${userId}` });
            return;
          }
          const result = await executeJobcanTask(userId, 'checkOut');
          if (result.success) {
            await sendNotification(userId, 'jobcanCheckOutSuccess', { time: new Date().toLocaleTimeString(), username: userEmail });
          } else {
            await sendNotification(userId, 'jobcanActionError', { taskType: 'check-out', errorMessage: result.error, username: userEmail });
          }
        } catch (jobError) {
          logger.error(`Error in scheduled check-out job for userId ${userId} (${userEmail}):`, { message: jobError.message, stack: jobError.stack });
        }
      },
      null, // onComplete
      false, // start immediately? No.
      settings.timezone || 'Asia/Seoul' // timezone
    );
    checkOutJob.start();
    logger.info(`Scheduled check-out for userId: ${userId} (${userEmail}) at ${checkOutCronPattern} (${settings.timezone}). Next run: ${checkOutJob.nextDate().toISOString()}`);

    activeUserSchedules.set(userId, { checkInJob, checkOutJob });
    await sendNotification(userId, 'jobcanTaskScheduled', { 
        taskType: '출퇴근 자동화', // Or be more specific if needed
        time: `출근 ${checkInHour}:${checkInMinute}, 퇴근 ${checkOutHour}:${checkOutMinute} (${settings.timezone})`, 
        username: userEmail 
    });

  } catch (error) {
    logger.error(`Failed to schedule tasks for userId ${userId}:`, { message: error.message, stack: error.stack });
  }
}

/**
 * Updates or creates a schedule for a specific user.
 * @param {string} userId - The UUID of the user.
 */
async function updateUserSchedule(userId) {
  logger.info(`Updating schedule for userId: ${userId}`);
  await scheduleUserTasks(userId); // This will unschedule and then reschedule if applicable
}

/**
 * Initializes the scheduler for all relevant users on application startup.
 */
async function initScheduler() {
  logger.info('Initializing scheduler: Loading and scheduling tasks for all relevant users...');
  try {
    const usersWithSettings = await UserSettings.findAll({
      where: {
        autoClockIn: true, // Or combine with autoClockOut based on your UserSettings model changes
        autoClockOut: true,
        jobcanUsername: { [require('sequelize').Op.ne]: null }, // jobcanUsername is not null
        workStartTime: { [require('sequelize').Op.ne]: null },
        workEndTime: { [require('sequelize').Op.ne]: null }
      },
      include: [{ model: User, attributes: ['id'] }] // Only need user.id
    });

    logger.info(`Found ${usersWithSettings.length} users with auto-schedule enabled.`);

    for (const settings of usersWithSettings) {
      // The settings object directly contains userId from the foreign key.
      // If you named your foreign key differently or need the User model's id, adjust accordingly.
      // Assuming settings.userId refers to the User's ID.
      if (settings.userId) {
        try {
          await scheduleUserTasks(settings.userId);
        } catch (e) {
          logger.error(`Failed to schedule tasks for user ${settings.userId} during init:`, { message: e.message, stack: e.stack });
        }
      } else if (settings.User && settings.User.id) { // Fallback if userId is not directly on settings
         try {
          await scheduleUserTasks(settings.User.id);
        } catch (e) {
          logger.error(`Failed to schedule tasks for user ${settings.User.id} (via User.id) during init:`, { message: e.message, stack: e.stack });
        }
      } else {
          logger.warn('Found UserSettings record without a clear userId for scheduling.', { settingsId: settings.id });
      }
    }
    logger.info('Scheduler initialization completed.');
  } catch (error) {
    logger.error('Error during scheduler initialization:', { message: error.message, stack: error.stack });
  }
}

module.exports = {
  initScheduler,
  updateUserSchedule,
  // For potential manual testing or admin interface later
  // scheduleUserTasks, 
  // unscheduleUserTasks 
};
