const TelegramBot = require('node-telegram-bot-api');
// dotenv, path, fs are not directly used here anymore as config loading is centralized

// It's assumed that the .env file is loaded by the calling module (e.g., jobcan.js via getConfig)
// and process.env is populated before this service is initialized.

let bot;
let chatId;
// Default environment variable names, can be overridden by config.json
let botTokenEnvVarName = 'TELEGRAM_BOT_TOKEN';
let chatIdEnvVarName = 'TELEGRAM_CHAT_ID';
// Language setting is not directly used by this service, but by the callers.

/**
 * Initializes the notification service.
 * It reads Telegram bot token and chat ID from environment variables.
 * The names of these environment variables can be specified in the config file.
 * @param {object} config - The application configuration object, typically from config.json.
 */
function initializeNotificationService(config) {
  if (config?.telegram) {
    botTokenEnvVarName = config.telegram.botTokenEnvVar || botTokenEnvVarName;
    chatIdEnvVarName = config.telegram.chatIdEnvVar || chatIdEnvVarName;
    // messageLanguage is handled by the caller, not used directly in this service.
  }

  const token = process.env[botTokenEnvVarName];
  chatId = process.env[chatIdEnvVarName];

  if (token && chatId) {
    bot = new TelegramBot(token);
    console.log('Telegram bot initialized.'); // Log in English
  } else {
    console.warn('Telegram bot token or chat ID is missing in environment variables. Notifications will be disabled.'); // Log in English
    if (!token) console.warn(`${botTokenEnvVarName} is not set in environment variables.`); // Log in English
    if (!chatId) console.warn(`${chatIdEnvVarName} is not set in environment variables.`); // Log in English
    bot = null; // Explicitly set to null
  }
}

/**
 * Sends a Telegram message.
 * @param {string} message - The message to send.
 * @param {boolean} isError - Indicates if the message is an error message (for potential future formatting).
 */
async function sendNotification(message, isError = false) { // isError parameter kept for now, though not actively changing format based on it.
  if (!bot || !chatId) {
    const warningMessage = 'Telegram bot is not initialized or chat ID is missing. Cannot send notification.'; // Log in English
    console.warn(warningMessage);
    // IMPORTANT: In a production environment, this warning might need to be logged or handled differently.
    // For now, it's only output to the console.
    // If notifications are critical even on bot init failure, consider a fallback channel (e.g., email).
    return;
  }

  try {
    await bot.sendMessage(chatId, message);
    console.log('Telegram notification sent successfully.'); // Log in English
  } catch (error) {
    console.error('Failed to send Telegram notification:', error.message); // Log in English
    // Logging the error response body or code can be helpful for debugging.
    if (error.response && error.response.body) {
      console.error('Telegram API Error:', error.response.body); // Log in English
    }
  }
}

module.exports = {
  initializeNotificationService,
  sendNotification,
};
