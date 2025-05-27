const TelegramBot = require('node-telegram-bot-api');
const logger = require('../utils/logger');
const { UserSettings } = require('../database/setup'); // Assuming User model is not directly needed here, but UserSettings is
const { decrypt } = require('./cryptoService');
const fs = require('fs');
const path = require('path');

const messageTemplatesPath = path.join(__dirname, '../config/telegram_messages.json');
let messageTemplates = {};

// 3. Implement Message Template Loading and Formatting

/**
 * Loads message templates from the JSON file.
 * This is an internal function called on module load.
 */
function loadMessageTemplates() {
  try {
    const data = fs.readFileSync(messageTemplatesPath, 'utf8');
    messageTemplates = JSON.parse(data);
    logger.info('Telegram message templates loaded successfully.');
  } catch (error) {
    logger.error('Failed to load Telegram message templates:', { message: error.message, path: messageTemplatesPath });
    messageTemplates = {}; // Ensure it's an empty object on failure
  }
}

/**
 * Gets a formatted message string based on key, language, and parameters.
 * @param {string} messageKey - The key for the message template.
 * @param {string} lang - The desired language code (e.g., 'ko', 'en').
 * @param {object} [params={}] - An object containing placeholder values.
 * @returns {string} The formatted message or a default error string.
 */
function getFormattedMessage(messageKey, lang, params = {}) {
  let chosenLang = lang;
  if (!messageTemplates[chosenLang] || !messageTemplates[chosenLang][messageKey]) {
    logger.warn(`Template for key '${messageKey}' not found in language '${chosenLang}'. Trying 'ko'.`);
    chosenLang = 'ko'; // Default to Korean
  }
  if (!messageTemplates[chosenLang] || !messageTemplates[chosenLang][messageKey]) {
    logger.warn(`Template for key '${messageKey}' not found in language 'ko'. Trying 'en'.`);
    chosenLang = 'en'; // Fallback to English
  }
  
  const templateSet = messageTemplates[chosenLang];
  if (!templateSet || !templateSet[messageKey]) {
    const errorMsg = `Missing template for key: ${messageKey} in available languages.`;
    logger.error(errorMsg);
    return errorMsg;
  }

  let template = templateSet[messageKey];
  try {
    template = template.replace(/{{(.*?)}}/g, (match, placeholder) => {
      const key = placeholder.trim();
      return params[key] !== undefined ? String(params[key]) : match;
    });
  } catch (e) {
      logger.error(`Error formatting template for key ${messageKey}: ${e.message}`);
      return `Error formatting template: ${messageKey}`;
  }
  return template;
}

// 4. Implement sendNotification = async (userId, messageKey, params = {}) function
/**
 * Sends a Telegram notification to a user.
 * @param {string} userId - The UUID of the user.
 * @param {string} messageKey - The key for the message template.
 * @param {object} [params={}] - Parameters for the message template.
 * @returns {Promise<object>} Result object { success: boolean, message?: string, error?: string }.
 */
const sendNotification = async (userId, messageKey, params = {}) => {
  logger.info(`Attempting to send Telegram notification '${messageKey}' to userId: ${userId}`, { params });

  const settings = await UserSettings.findOne({ where: { userId } });

  if (!settings) {
    logger.error(`No UserSettings found for userId: ${userId}. Cannot send Telegram notification.`);
    return { success: false, error: 'User settings not found.' };
  }

  if (!settings.isNotificationsEnabled) {
    logger.info(`Telegram notifications are disabled for userId: ${userId}. Notification '${messageKey}' not sent.`);
    return { success: false, error: 'Notifications disabled by user.', code: 'NOTIFICATIONS_DISABLED' };
  }

  if (!settings.telegramChatId) {
    logger.warn(`Telegram Chat ID not set for userId: ${userId}. Cannot send notification '${messageKey}'.`);
    return { success: false, error: 'Telegram Chat ID not set.' };
  }

  if (!settings.encryptedTelegramBotToken || !settings.telegramBotTokenSalt) {
    logger.warn(`Telegram Bot Token or salt not set for userId: ${userId}. Cannot send notification '${messageKey}'.`);
    return { success: false, error: 'Telegram Bot Token or salt not set.' };
  }

  const decryptedUserBotToken = decrypt(settings.encryptedTelegramBotToken, settings.telegramBotTokenSalt);
  if (!decryptedUserBotToken) {
    logger.error(`Failed to decrypt Telegram Bot Token for userId: ${userId}. Cannot send notification '${messageKey}'.`);
    return { success: false, error: 'Failed to decrypt bot token.' };
  }

  // Assuming User model has 'languagePreference' or similar. For now, default to 'ko' or a setting.
  // Let's assume UserSettings might have a language preference field in the future.
  // For now, we'll use a hardcoded default or a simple logic.
  const userLanguage = settings.languagePreference || 'ko'; // Placeholder for language preference

  const messageContent = getFormattedMessage(messageKey, userLanguage, params);

  if (messageContent.startsWith('Missing template for key:') || messageContent.startsWith('Error formatting template:')) {
      return { success: false, error: messageContent, code: 'TEMPLATE_ERROR' };
  }

  try {
    const bot = new TelegramBot(decryptedUserBotToken, { polling: false }); // Polling set to false for sending messages
    await bot.sendMessage(settings.telegramChatId, messageContent, { parse_mode: 'Markdown' });
    
    logger.info(`Telegram notification '${messageKey}' sent successfully to userId: ${userId}, chatId: ${settings.telegramChatId}.`);
    return { success: true, message: `Notification '${messageKey}' sent.` };
  } catch (error) {
    logger.error(`Failed to send Telegram notification '${messageKey}' to userId: ${userId}, chatId: ${settings.telegramChatId}. Error: ${error.message}`, {
      stack: error.stack,
      telegramError: error.response ? error.response.body : error.message // Log specific Telegram API error
    });
    return { success: false, error: `Telegram API error: ${error.message}`, details: error.response ? error.response.body : null };
  }
};

// Load templates on module startup
loadMessageTemplates();

// 5. Export sendNotification function
module.exports = {
  sendNotification,
  // Expose for testing or dynamic reloading if needed, though not required by subtask
  // loadMessageTemplates, 
  // getFormattedMessage 
};
