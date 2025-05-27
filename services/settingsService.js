const { UserSettings } = require('../database/setup'); // Assuming models are exported from setup
const { generateSalt, encrypt } = require('./cryptoService'); // Import crypto functions
const logger = require('../utils/logger'); // Import Winston logger

/**
 * Retrieves UserSettings for a given userId.
 * @param {string} userId - The UUID of the user.
 * @returns {Promise<UserSettings|null>} The UserSettings instance or null if not found.
 */
async function getSettingsByUserId(userId) {
  try {
    const settings = await UserSettings.findOne({ where: { userId } });
    if (!settings) {
      logger.warn(`No UserSettings found for userId: ${userId}`);
      return null;
    }
    logger.debug(`UserSettings retrieved for userId: ${userId}`);
    return settings;
  } catch (error) {
    logger.error(`Error retrieving UserSettings for userId ${userId}:`, { message: error.message, stack: error.stack });
    throw error; // Re-throw to be handled by caller
  }
}

/**
 * Updates sensitive UserSettings, encrypting fields as necessary.
 * @param {string} userId - The UUID of the user.
 * @param {object} data - An object containing fields to update.
 * @param {string} [data.jobcanPassword] - The Jobcan password to encrypt and update.
 * @param {string} [data.telegramBotToken] - The Telegram bot token to encrypt and update.
 * @returns {Promise<UserSettings|null>} The updated UserSettings instance or null if not found/failed.
 */
async function updateSensitiveUserSettings(userId, { jobcanPassword, telegramBotToken }) {
  try {
    const settings = await UserSettings.findOne({ where: { userId } });

    if (!settings) {
      logger.warn(`Cannot update settings: No UserSettings found for userId: ${userId}`);
      return null;
    }

    const updates = {};

    // Encrypt Jobcan Password
    if (jobcanPassword !== undefined) { // Allow clearing the password by passing null or empty string
      if (jobcanPassword) {
        if (!settings.jobcanPasswordSalt) {
          logger.info(`Generating new jobcanPasswordSalt for userId: ${userId}`);
          settings.jobcanPasswordSalt = generateSalt();
        }
        updates.encryptedJobcanPassword = encrypt(jobcanPassword, settings.jobcanPasswordSalt);
        updates.jobcanPasswordSalt = settings.jobcanPasswordSalt; // Ensure salt is saved if newly generated
        if (!updates.encryptedJobcanPassword) {
             logger.error(`Failed to encrypt Jobcan password for userId: ${userId}. Update for this field will be skipped.`);
             // Decide if you want to throw an error or just skip this field's update
        } else {
            logger.debug(`Jobcan password encrypted for userId: ${userId}`);
        }
      } else { // jobcanPassword is explicitly null or empty string, so clear it
        updates.encryptedJobcanPassword = null;
        updates.jobcanPasswordSalt = null; // Also clear salt
        logger.info(`Jobcan password cleared for userId: ${userId}`);
      }
    }

    // Encrypt Telegram Bot Token
    if (telegramBotToken !== undefined) { // Allow clearing the token
      if (telegramBotToken) {
        if (!settings.telegramBotTokenSalt) {
          logger.info(`Generating new telegramBotTokenSalt for userId: ${userId}`);
          settings.telegramBotTokenSalt = generateSalt();
        }
        updates.encryptedTelegramBotToken = encrypt(telegramBotToken, settings.telegramBotTokenSalt);
        updates.telegramBotTokenSalt = settings.telegramBotTokenSalt; // Ensure salt is saved
         if (!updates.encryptedTelegramBotToken) {
             logger.error(`Failed to encrypt Telegram Bot Token for userId: ${userId}. Update for this field will be skipped.`);
        } else {
            logger.debug(`Telegram bot token encrypted for userId: ${userId}`);
        }
      } else { // telegramBotToken is explicitly null or empty string
        updates.encryptedTelegramBotToken = null;
        updates.telegramBotTokenSalt = null;
        logger.info(`Telegram bot token cleared for userId: ${userId}`);
      }
    }
    
    // Add other non-sensitive fields directly if any are passed in the data object
    // Example: if (data.autoClockIn !== undefined) updates.autoClockIn = data.autoClockIn;

    if (Object.keys(updates).length === 0) {
      logger.info(`No sensitive fields provided to update for userId: ${userId}. No changes made.`);
      return settings; // Return original settings if no relevant data was passed
    }
    
    logger.info(`Updating UserSettings for userId: ${userId} with ${Object.keys(updates).length} changes.`);
    await settings.update(updates);
    logger.info(`UserSettings updated successfully for userId: ${userId}`);
    return settings;

  } catch (error) {
    logger.error(`Error updating sensitive UserSettings for userId ${userId}:`, { message: error.message, stack: error.stack });
    return null; // Or throw error
  }
}

module.exports = {
  getSettingsByUserId, // Keep or add other functions as needed
  updateSensitiveUserSettings,
};
