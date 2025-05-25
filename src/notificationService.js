const TelegramBot = require('node-telegram-bot-api');
// dotenv, path, fs are not directly used here anymore as config loading is centralized

// It's assumed that the .env file is loaded by the calling module (e.g., jobcan.js via getConfig)
// and process.env is populated before this service is initialized.

let bot;
let chatId;
// Environment variable names are now hardcoded
const BOT_TOKEN_ENV_VAR = 'TELEGRAM_BOT_TOKEN';
const CHAT_ID_ENV_VAR = 'TELEGRAM_CHAT_ID';

/**
 * Initializes the notification service.
 * It reads Telegram bot token and chat ID from environment variables.
 * @param {object} config - The application configuration object (not used for token/chatId env var names anymore).
 */
function initializeNotificationService(config) { // config parameter is kept for future use or consistency
  const token = process.env[BOT_TOKEN_ENV_VAR];
  chatId = process.env[CHAT_ID_ENV_VAR];

  if (token && chatId) {
    bot = new TelegramBot(token);
    console.log('Telegram bot initialized successfully.'); // Log in English
  } else if (!token && !chatId) {
    console.info('Telegram notifications disabled: TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are not set in environment variables.'); // Log in English
    bot = null;
  } else {
    if (!token) {
      console.warn(`Telegram notifications disabled: ${BOT_TOKEN_ENV_VAR} is not set in environment variables.`); // Log in English
    }
    if (!chatId) {
      console.warn(`Telegram notifications disabled: ${CHAT_ID_ENV_VAR} is not set in environment variables.`); // Log in English
    }
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
