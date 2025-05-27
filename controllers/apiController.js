const { User, UserSettings } = require('../database/setup');
const logger = require('../utils/logger');
const { updateSensitiveUserSettings } = require('../services/settingsService');
const { decrypt } = require('../services/cryptoService'); // For checking if tokens are set
const { updateUserSchedule } = require('../services/scheduleService'); // Import schedule service

// GET /api/user/settings
exports.getUserSettings = async (req, res, next) => {
  const userId = req.user ? req.user.id : 'N/A';
  logger.info(`Fetching settings for userId: ${userId}`);
  try {
    const settings = await UserSettings.findOne({ where: { userId } });

    if (!settings) {
      logger.warn(`No UserSettings found for userId: ${userId}`);
      return res.status(404).json({ error: { message: 'Settings not found.' } });
    }

    // Decrypt and check if sensitive fields are set (for boolean flags)
    // This is a simplified check; actual decryption for use would be done elsewhere or carefully.
    let isJobcanPasswordSet = false;
    if (settings.encryptedJobcanPassword && settings.jobcanPasswordSalt) {
        // A more robust check might try to decrypt a tiny portion or just check for presence
        isJobcanPasswordSet = true; // Assume set if encrypted value and salt exist
    }

    let isTelegramBotTokenSet = false;
    if (settings.encryptedTelegramBotToken && settings.telegramBotTokenSalt) {
        isTelegramBotTokenSet = true; // Assume set if encrypted value and salt exist
    }
    
    // Construct response with non-sensitive fields and boolean flags
    const responseSettings = {
      jobcanUsername: settings.jobcanUsername,
      jobcanClerkCode: settings.jobcanClerkCode,
      telegramChatId: settings.telegramChatId, // Assuming this is not super sensitive
      workStartTime: settings.workStartTime,
      workEndTime: settings.workEndTime,
      checkinDelayMinutes: settings.checkinDelayMinutes, // Assuming this was added to model
      checkoutDelayMinutes: settings.checkoutDelayMinutes, // Assuming this was added to model
      calendarUrl: settings.annualLeaveCalendarUrl, // From model
      isCalendarEnabled: !!settings.annualLeaveCalendarUrl, // Example logic for this flag
      isTestMode: settings.isTestMode !== undefined ? settings.isTestMode : false, // Assuming this was added
      isNotificationsEnabled: settings.notifyOnAutoAction !== undefined ? settings.notifyOnAutoAction : true, // From model
      isAutoScheduleEnabled: settings.autoClockIn || settings.autoClockOut, // Example logic
      timezone: settings.timezone || 'Asia/Seoul', // Assuming this was added

      // Boolean flags for sensitive data
      isJobcanPasswordSet: isJobcanPasswordSet,
      isTelegramBotTokenSet: isTelegramBotTokenSet,
    };

    logger.debug(`Successfully fetched settings for userId: ${userId}`, { settingsKeys: Object.keys(responseSettings || {}) });
    res.status(200).json({ status: 'success', data: { settings: responseSettings } });
  } catch (error) {
    logger.error('Error fetching user settings:', { message: error.message, stack: error.stack, userId: userId });
    next(error);
  }
};

// POST /api/user/settings
exports.saveUserSettings = async (req, res, next) => {
  const userId = req.user ? req.user.id : 'N/A';
  logger.info(`Attempting to save settings for userId: ${userId}`);
  
  try {
    const data = req.body;
    // Sanitize req.body for logging by excluding sensitive fields
    const { jobcanPassword, telegramBotToken, ...loggableBody } = data;
    logger.debug(`Attempting to save settings for userId: ${userId}`, { receivedSettings: loggableBody });


    let settings = await UserSettings.findOne({ where: { userId } });
    if (!settings) {
      logger.error(`Critical: UserSettings not found for userId: ${userId} during save operation.`);
      return res.status(404).json({ error: { message: 'Settings not found for user.' } });
    }

    // Store original schedule-related settings for comparison
    const scheduleRelatedFields = [
      'autoClockIn', 'autoClockOut', 'workStartTime', 'workEndTime', 
      'checkinDelayMinutes', 'checkoutDelayMinutes', 'timezone', 'isAutoScheduleEnabled' 
      // 'isAutoScheduleEnabled' is a synthetic field from frontend, maps to autoClockIn/Out
    ];
    const originalScheduleSettings = {};
    scheduleRelatedFields.forEach(field => {
        if (field === 'isAutoScheduleEnabled') { // Handle the synthetic field
            originalScheduleSettings.autoClockIn = settings.autoClockIn;
            originalScheduleSettings.autoClockOut = settings.autoClockOut;
        } else {
            originalScheduleSettings[field] = settings[field];
        }
    });


    const sensitiveDataToUpdate = {};
    if (data.jobcanPassword && data.jobcanPassword.trim() !== '') {
      sensitiveDataToUpdate.jobcanPassword = data.jobcanPassword;
    } else if (data.jobcanPassword === '') { // Explicitly clearing
        sensitiveDataToUpdate.jobcanPassword = null;
    }

    if (data.telegramBotToken && data.telegramBotToken.trim() !== '') {
      sensitiveDataToUpdate.telegramBotToken = data.telegramBotToken;
    } else if (data.telegramBotToken === '') { // Explicitly clearing
        sensitiveDataToUpdate.telegramBotToken = null;
    }

    // Update sensitive settings using the service
    if (Object.keys(sensitiveDataToUpdate).length > 0) {
      const updatedSensitive = await updateSensitiveUserSettings(userId, sensitiveDataToUpdate);
      if (!updatedSensitive) {
        // Error already logged by service, but we should respond
        return res.status(500).json({ error: { message: 'Failed to update sensitive settings.' } });
      }
      logger.info(`Sensitive settings updated for userId: ${userId}`);
    }
    
    // Refresh settings instance after sensitive updates to avoid stale data
    settings = await UserSettings.findOne({ where: { userId } });

    // Update non-sensitive fields directly
    const nonSensitiveFields = [
      'jobcanUsername', 'jobcanClerkCode', 'telegramChatId',
      'workStartTime', 'workEndTime', 'checkinDelayMinutes', 'checkoutDelayMinutes',
      'annualLeaveCalendarUrl', 'isTestMode', 'notifyOnAutoAction', 'autoClockIn', 'autoClockOut', 'timezone'
    ];
    
    let changedNonSensitive = false;
    const nonSensitiveDataForLog = {}; // For logging non-sensitive keys being processed

    nonSensitiveFields.forEach(field => {
      if (data[field] !== undefined) {
        // Handle boolean fields from checkbox potentially not being 'true'
        if (typeof settings[field] === 'boolean') {
            settings[field] = (data[field] === true || data[field] === 'true');
        } else {
            settings[field] = data[field];
        }
        nonSensitiveDataForLog[field] = settings[field]; // Log the value being set
        changedNonSensitive = true;
      }
    });
    if (Object.keys(nonSensitiveDataForLog).length > 0) {
        logger.debug(`Processing non-sensitive settings update for userId: ${userId}`, { nonSensitiveData: nonSensitiveDataForLog });
    }
    
    // Specific logic for combined fields if needed, e.g. autoClockIn/Out from isAutoScheduleEnabled
    // This needs to be handled carefully to correctly compare with originalScheduleSettings
    let currentAutoClockIn = settings.autoClockIn;
    let currentAutoClockOut = settings.autoClockOut;

    if (data.isAutoScheduleEnabled !== undefined) {
        currentAutoClockIn = data.isAutoScheduleEnabled;
        currentAutoClockOut = data.isAutoScheduleEnabled;
        settings.autoClockIn = data.isAutoScheduleEnabled;
        settings.autoClockOut = data.isAutoScheduleEnabled;
        changedNonSensitive = true;
    }
    if (data.isCalendarEnabled !== undefined && data.annualLeaveCalendarUrl === '') {
        // If calendar is disabled by unchecking, or URL is cleared, clear the URL
        if (!data.isCalendarEnabled || data.annualLeaveCalendarUrl === '') {
            settings.annualLeaveCalendarUrl = null;
            changedNonSensitive = true;
        }
    }


    if (changedNonSensitive) {
        await settings.save();
        logger.info(`Non-sensitive settings updated for userId: ${userId}`);
    }

    // Determine if schedule-related fields actually changed
    let scheduleChanged = false;
    for (const field of scheduleRelatedFields) {
        if (field === 'isAutoScheduleEnabled') { // Special handling for synthetic field
            if (currentAutoClockIn !== originalScheduleSettings.autoClockIn || currentAutoClockOut !== originalScheduleSettings.autoClockOut) {
                scheduleChanged = true;
                break;
            }
        } else if (data[field] !== undefined && data[field] !== originalScheduleSettings[field]) {
            // For time fields, ensure consistent format if necessary, though direct string comparison might be okay if format is fixed
            scheduleChanged = true;
            break;
        }
    }
    
    if (scheduleChanged) {
      logger.info(`Schedule-related settings changed for userId: ${userId}. Updating schedule.`);
      await updateUserSchedule(userId); // Update cron jobs
    } else {
      logger.info(`No schedule-related settings changed for userId: ${userId}. Schedule not updated.`);
    }
    
    logger.info(`Successfully saved settings for userId: ${userId}`);
    res.status(200).json({ status: 'success', data: { message: 'Settings updated successfully.' } });
  } catch (error) {
    logger.error('Error saving user settings:', { message: error.message, stack: error.stack, userId: userId });
    next(error);
  }
};

// POST /api/test/jobcan
exports.testJobcanConnection = async (req, res, next) => {
  logger.info('Jobcan connection test requested (placeholder).', { userId: req.user?.id, body: req.body });
  // In a real implementation, you would:
  // 1. Get Jobcan username and password (potentially decrypting it from UserSettings).
  // 2. Attempt to login to Jobcan using Playwright or similar.
  // 3. Return success/failure based on the attempt.
  res.status(200).json({ status: 'success', data: { message: 'Jobcan connection test endpoint hit. Not implemented yet.' } });
};

// POST /api/test/telegram
exports.testTelegramConnection = async (req, res, next) => {
  logger.info('Telegram connection test requested (placeholder).', { userId: req.user?.id, body: req.body });
  // In a real implementation, you would:
  // 1. Get Telegram Bot Token and Chat ID (potentially decrypting token).
  // 2. Attempt to send a test message using node-telegram-bot-api.
  // 3. Return success/failure.
  res.status(200).json({ status: 'success', data: { message: 'Telegram connection test endpoint hit. Not implemented yet.' } });
};

// GET /api/csrf-token
exports.getCsrfToken = (req, res) => {
  if (typeof req.generateCsrfToken !== 'function') {
    logger.error('req.generateCsrfToken is not a function. CSRF middleware might be misconfigured.');
    return res.status(500).json({ error: { message: 'CSRF token generation is not available.' } });
  }
  const token = req.generateCsrfToken();
  logger.debug('CSRF token generated and sent to client.');
  res.status(200).json({ status: 'success', data: { csrfToken: token } });
};

// Ensure all functions are exported
module.exports = {
  getUserSettings,
  saveUserSettings,
  testJobcanConnection,
  testTelegramConnection,
  getCsrfToken,
};
