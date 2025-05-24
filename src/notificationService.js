const TelegramBot = require('node-telegram-bot-api');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// .env 파일 경로 설정 (config.json에 정의된 경로 사용 또는 기본값)
// getConfig 함수가 이 모듈보다 먼저 호출되어 환경변수를 설정한다고 가정하거나,
// 이 모듈 내에서 직접 config.json을 읽어 .env 경로를 가져와야 합니다.
// 우선은, main.js나 jobcan.js에서 dotenv.config()가 호출되어 process.env에 로드되었다고 가정합니다.

let bot;
let chatId;
let botTokenEnvVar = 'TELEGRAM_BOT_TOKEN'; // 기본값, config.json에서 읽어온 값으로 대체될 수 있음
let chatIdEnvVar = 'TELEGRAM_CHAT_ID'; // 기본값, config.json에서 읽어온 값으로 대체될 수 있음

/**
 * 알림 서비스 초기화 함수.
 * 설정 파일(config.json)을 읽어 환경 변수 이름을 가져오고,
 * 해당 환경 변수로부터 봇 토큰과 채팅 ID를 로드하여 봇을 초기화합니다.
 * @param {object} config - config.json에서 로드된 설정 객체
 */
function initializeNotificationService(config) {
  if (config && config.telegram) {
    botTokenEnvVar = config.telegram.botTokenEnvVar || botTokenEnvVar;
    chatIdEnvVar = config.telegram.chatIdEnvVar || chatIdEnvVar;
  }

  const token = process.env[botTokenEnvVar];
  chatId = process.env[chatIdEnvVar];

  if (token && chatId) {
    bot = new TelegramBot(token);
    console.log('Telegram bot initialized.');
  } else {
    console.warn('Telegram bot token or chat ID is missing. Notifications will be disabled.');
    if (!token) console.warn(`${botTokenEnvVar} is not set in environment variables.`);
    if (!chatId) console.warn(`${chatIdEnvVar} is not set in environment variables.`);
    bot = null; // 명시적으로 null 처리
  }
}

/**
 * 텔레그램 메시지를 전송합니다.
 * @param {string} message - 전송할 메시지
 * @param {boolean} isError - 에러 메시지 여부 (향후 포맷팅 등에 활용 가능)
 */
async function sendNotification(message, isError = false) {
  if (!bot || !chatId) {
    const warningMessage = 'Telegram bot is not initialized or chat ID is missing. Cannot send notification.';
    console.warn(warningMessage);
    // 중요: 실제 운영 환경에서는 이 경고도 다른 방식으로 로깅하거나 처리해야 할 수 있습니다.
    // 우선 콘솔에만 출력합니다.
    // 만약 봇 초기화 실패 시에도 알림을 보내고 싶다면, 다른 채널(예: 이메일)을 고려해야 합니다.
    return;
  }

  try {
    await bot.sendMessage(chatId, message);
    console.log('Telegram notification sent successfully.');
  } catch (error) {
    console.error('Failed to send Telegram notification:', error.message);
    // 에러 응답 본문이나 코드도 로깅하면 디버깅에 도움이 됩니다.
    if (error.response && error.response.body) {
      console.error('Telegram API Error:', error.response.body);
    }
  }
}

module.exports = {
  initializeNotificationService,
  sendNotification,
};
