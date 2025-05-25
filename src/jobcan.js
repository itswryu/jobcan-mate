const fs = require('fs').promises;
const path = require('path');
const { chromium } = require('playwright');
const dotenv = require('dotenv');
const { initializeNotificationService, sendNotification } = require('./notificationService'); // Added

const CONFIG_PATH = path.join(__dirname, '..', 'config.json');
let configInstance = null; // Cache config

// Helper function to get localized messages
function getMessage(lang, key, params = {}) {
  const messages = {
    en: {
      configLoadError: `[ERROR] Failed to load configuration files (config.json or .env): ${params.errorMsg}`,
      envNotFound: `.env file not found at: ${params.envPath}. Proceeding without it.`,
      loadingEnv: `Loading .env file from: ${params.envPath}`,
      loginCredentialsNotFound: '[WARNING] Jobcan login credentials (.env) not found. Manual login required.',
      automaticLoginError: `[ERROR] Jobcan automatic login failed: ${params.errorMsg}`,
      navigateToAttendanceError: `[ERROR] Failed to navigate to Jobcan attendance page (timeout or error): ${params.errorMsg}`,
      browserLaunchError: `[ERROR] Critical error during browser launch or login page processing: ${params.errorMsg}`,
      getWorkingStatusError: `[ERROR] Failed to get working status: ${params.errorMsg}`,
      clickButtonError: `[ERROR] Error clicking attendance button or waiting for API response: ${params.errorMsg}`,
      checkInProcessError: '[ERROR] Check-in process failed: Could not determine current working status.',
      checkInClickError: '[ERROR] Check-in process failed: Failed to click the attendance button.',
      checkInSuccess: `[SUCCESS] Jobcan check-in complete. Current status: ${params.status}`,
      checkInWarning: `[WARNING] Check-in may have failed or status change not confirmed. Current status: "${params.newStatus}", expected: "${params.expectedStatus}".`,
      checkInAlreadyDone: `[INFO] Already checked in. Status is "${params.status}".`,
      checkInInvalidStatus: `[WARNING] Cannot check in. Current status is "${params.status}", expected "${params.expectedStatus}".`,
      checkOutProcessError: '[ERROR] Check-out process failed: Could not determine current working status.',
      checkOutClickError: '[ERROR] Check-out process failed: Failed to click the attendance button.',
      checkOutSuccess: `[SUCCESS] Jobcan check-out complete. Current status: ${params.status}`,
      checkOutWarning: `[WARNING] Check-out may have failed or status change not confirmed. Current status: "${params.newStatus}", expected: "${params.expectedStatus}" or "${params.altExpectedStatus}".`,
      checkOutAlreadyDone: `[INFO] Already checked out or not checked in. Status is "${params.status}".`,
      checkOutInvalidStatus: `[WARNING] Cannot check out. Current status is "${params.status}", expected "${params.expectedStatus}".`,
      // New keys for main.js and scheduler.js
      mainScriptError: `[CRITICAL] Critical error in main Jobcan automation script: ${params.errorMsg}`,
      schedulerExecError: `[ERROR] Error executing scheduled ${params.action} job: ${params.errorMsg}`,
      schedulerExecStdErr: `[WARNING] Stderr during scheduled ${params.action} job: ${params.stderrMsg}`,
      schedulerInvalidCron: `[ERROR] Invalid cron expression for ${params.type}: ${params.cronExpr}`,
      schedulerStartError: `[CRITICAL] Error starting scheduler: ${params.errorMsg}`,
    },
    ko: {
      configLoadError: `[오류] 설정 파일(config.json 또는 .env) 로드 실패: ${params.errorMsg}`,
      envNotFound: `.env 파일을 다음 경로에서 찾을 수 없습니다: ${params.envPath}. 없이 진행합니다.`,
      loadingEnv: `.env 파일 로드 중: ${params.envPath}`,
      loginCredentialsNotFound: '[경고] Jobcan 로그인 정보(.env)를 찾을 수 없습니다. 수동 로그인이 필요합니다.',
      automaticLoginError: `[오류] Jobcan 자동 로그인 실패: ${params.errorMsg}`,
      navigateToAttendanceError: `[오류] Jobcan 출퇴근 페이지 접속 실패 (타임아웃 또는 오류): ${params.errorMsg}`,
      browserLaunchError: `[오류] 브라우저 시작 또는 로그인 페이지 처리 중 심각한 오류: ${params.errorMsg}`,
      getWorkingStatusError: `[오류] 근무 상태 확인 실패: ${params.errorMsg}`,
      clickButtonError: `[오류] 출퇴근 버튼 클릭 또는 API 응답 대기 중 오류: ${params.errorMsg}`,
      checkInProcessError: '[오류] 출근 처리 실패: 현재 근무 상태를 확인할 수 없습니다.',
      checkInClickError: '[오류] 출근 처리 실패: 출근 버튼 클릭에 실패했습니다.',
      checkInSuccess: `[SUCCESS] Jobcan 출근 처리가 완료되었습니다. 현재 상태: ${params.status}`,
      checkInWarning: `[주의] 출근 처리가 실패했거나 상태 변경이 확인되지 않았습니다. 현재 상태: "${params.newStatus}", 예상 상태: "${params.expectedStatus}".`,
      checkInAlreadyDone: `[INFO] 이미 출근한 상태입니다 (${params.status}).`,
      checkInInvalidStatus: `[경고] 출근할 수 없습니다. 현재 상태: "${params.status}", 예상 상태: "${params.expectedStatus}".`,
      checkOutProcessError: '[오류] 퇴근 처리 실패: 현재 근무 상태를 확인할 수 없습니다.',
      checkOutClickError: '[오류] 퇴근 처리 실패: 퇴근 버튼 클릭에 실패했습니다.',
      checkOutSuccess: `[SUCCESS] Jobcan 퇴근 처리가 완료되었습니다. 현재 상태: ${params.status}`,
      checkOutWarning: `[주의] 퇴근 처리가 실패했거나 상태 변경이 확인되지 않았습니다. 현재 상태: "${params.newStatus}", 예상 상태: "${params.expectedStatus}" 또는 "${params.altExpectedStatus}".`,
      checkOutAlreadyDone: `[INFO] 이미 퇴근했거나 출근하지 않은 상태입니다. 현재 상태: "${params.status}".`,
      checkOutInvalidStatus: `[경고] 퇴근할 수 없습니다. 현재 상태: "${params.status}", 예상 상태: "${params.expectedStatus}".`,
      // New keys for main.js and scheduler.js
      mainScriptError: `[CRITICAL] Jobcan 자동화 스크립트 메인 실행 중 심각한 오류 발생: ${params.errorMsg}`,
      schedulerExecError: `[오류] 스케줄된 ${params.action} 작업 실행 중 오류 발생: ${params.errorMsg}`,
      schedulerExecStdErr: `[경고] 스케줄된 ${params.action} 작업 실행 중 표준 오류 발생: ${params.stderrMsg}`,
      schedulerInvalidCron: `[오류] 잘못된 ${params.type} 크론 표현식: ${params.cronExpr}`,
      schedulerStartError: `[CRITICAL] 스케줄러 시작 중 오류 발생: ${params.errorMsg}`,
    }
  };
  return messages[lang]?.[key] || messages.en[key] || `Missing message for key: ${key}`;
}

async function getConfig() {
  if (configInstance) {
    return configInstance;
  }
  try {
    const configData = await fs.readFile(CONFIG_PATH, 'utf-8');
    const config = JSON.parse(configData);

    const envFileName = config?.jobcan?.loginCredentials?.envFilePath ?? '.env';
    const envPath = path.resolve(__dirname, '..', envFileName);

    if (await fs.access(envPath).then(() => true).catch(() => false)) {
      console.log(getMessage('en', 'loadingEnv', { envPath }));
      dotenv.config({ path: envPath });
    } else {
      console.warn(getMessage('en', 'envNotFound', { envPath }));
    }

    initializeNotificationService(config);

    // Ensure messageLanguage is set, default to 'en'
    if (!config.appSettings) config.appSettings = {};
    config.appSettings.messageLanguage = config.appSettings.messageLanguage || 'en';

    configInstance = config;
    return config;
  } catch (error) {
    console.error(`Error reading or parsing config.json or .env file: ${error.message}`);
    // Attempt to send notification in default language (English) as config might be broken
    const lang = configInstance?.appSettings?.messageLanguage || 'en';
    await sendNotification(getMessage(lang, 'configLoadError', { errorMsg: error.message }), true);
    throw error;
  }
}

async function launchBrowserAndLoginPage() {
  let browser;
  try {
    const config = await getConfig();
    const lang = config.appSettings.messageLanguage;
    const { loginUrl, attendanceUrl, loginCredentials } = config.jobcan;
    const { emailXPath, passwordXPath, loginButtonXPath } = loginCredentials;
    const { headless } = config.playwright;

    const jobcanEmail = process.env[loginCredentials?.emailEnvVar || 'JOBCAN_EMAIL'];
    const jobcanPassword = process.env[loginCredentials?.passwordEnvVar || 'JOBCAN_PASSWORD'];

    console.log('Launching browser...');
    browser = await chromium.launch({ headless: headless });
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log(`Navigating to login page: ${loginUrl}`);
    await page.goto(loginUrl);

    if (jobcanEmail && jobcanPassword) {
      console.log('Attempting to log in automatically using credentials from .env file...');
      try {
        await page.fill(emailXPath, jobcanEmail);
        await page.fill(passwordXPath, jobcanPassword);
        await page.click(loginButtonXPath);
        console.log('Login form submitted.');
      } catch (error) {
        console.error('Error during automatic login attempt:', error.message);
        await sendNotification(getMessage(lang, 'automaticLoginError', { errorMsg: error.message }), true);
        console.log('Please log in manually.');
      }
    } else {
      const message = 'Jobcan login credentials (.env) not found. Manual login required.';
      console.log(message);
      await sendNotification(getMessage(lang, 'loginCredentialsNotFound'), true);
    }

    console.log(`Waiting for navigation to attendance page: ${attendanceUrl} or for 2 minutes...`);

    try {
      // Use url.href as page.waitForURL callback receives a URL object
      await page.waitForURL(url => url.href.startsWith(attendanceUrl), { timeout: 120000 });
      console.log('Successfully navigated to the attendance page.');
    } catch (error) {
      console.error('Timeout or error while waiting for navigation to attendance page:', error.message);
      await sendNotification(getMessage(lang, 'navigateToAttendanceError', { errorMsg: error.message }), true);
      console.log('Browser will remain open for manual intervention or inspection.');
    }
    return { browser, page, config };

  } catch (error) {
    console.error('Error in launchBrowserAndLoginPage:', error.message);
    const lang = configInstance?.appSettings?.messageLanguage || 'en'; // Fallback if config failed to load fully
    await sendNotification(getMessage(lang, 'browserLaunchError', { errorMsg: error.message }), true);
    if (browser) {
      await browser.close();
    }
    throw error;
  }
}

async function getWorkingStatus(page, config) {
  const lang = config.appSettings.messageLanguage;
  try {
    const statusElement = await page.waitForSelector(config.jobcan.workingStatusXPath, { timeout: 10000 });
    const statusText = await statusElement.textContent();
    console.log(`Current working status: ${statusText.trim()}`);
    return statusText.trim();
  } catch (error) {
    console.error('Error getting working status:', error.message);
    await sendNotification(getMessage(lang, 'getWorkingStatusError', { errorMsg: error.message }), true);
    return null;
  }
}

async function clickAttendanceButton(page, config) {
  const lang = config.appSettings.messageLanguage;
  if (config.appSettings.testMode) {
    console.log('[Test Mode] Attendance button click skipped.');
    return true;
  }
  try {
    console.log('Attempting to click attendance button...');
    const responsePromise = page.waitForResponse(
      response =>
        response.url().includes('jobcan.jp/employee/') &&
        (response.request().method() === 'POST' || response.request().method() === 'PUT') &&
        response.status() === 200,
      { timeout: 10000 }
    );

    await page.click(config.jobcan.attendanceButtonXPath);
    console.log('Attendance button clicked. Waiting for API response...');

    try {
      const response = await responsePromise;
      console.log(`API response received: ${response.status()} ${response.url()}`);
    } catch (e) {
      console.warn('API response timed out or did not match criteria after 10 seconds.');
    }

    await page.waitForTimeout(1500);
    console.log('Waited for potential UI update after API response.');
    return true;
  } catch (error) {
    console.error('Error clicking attendance button or waiting for API response:', error.message);
    await sendNotification(getMessage(lang, 'clickButtonError', { errorMsg: error.message }), true);
    return false;
  }
}

async function checkIn(page, config) {
  const lang = config.appSettings.messageLanguage;
  console.log('Attempting Check-In...');
  const currentStatus = await getWorkingStatus(page, config);

  if (currentStatus === null) {
    await sendNotification(getMessage(lang, 'checkInProcessError'), true);
    return false;
  }

  // Standard Jobcan statuses (Korean)
  const STATUS_NOT_CHECKED_IN_KO = '미출근';
  const STATUS_WORKING_KO = '근무중';

  if (currentStatus === STATUS_NOT_CHECKED_IN_KO) {
    console.log(`Status is "${STATUS_NOT_CHECKED_IN_KO}". Proceeding with check-in.`);
    const clicked = await clickAttendanceButton(page, config);
    if (clicked) {
      const newStatus = await getWorkingStatus(page, config);
      if (newStatus === STATUS_WORKING_KO) {
        console.log(`Check-In successful. Status changed to "${STATUS_WORKING_KO}".`);
        await sendNotification(getMessage(lang, 'checkInSuccess', { status: newStatus }));
        return true;
      } else {
        const params = { newStatus: newStatus, expectedStatus: STATUS_WORKING_KO };
        console.log(getMessage('en', 'checkInWarning', params)); // Log in English
        await sendNotification(getMessage(lang, 'checkInWarning', params), true);
        return false;
      }
    } else {
      await sendNotification(getMessage(lang, 'checkInClickError'), true);
      return false;
    }
  } else if (currentStatus === STATUS_WORKING_KO) {
    const params = { status: currentStatus };
    console.log(getMessage('en', 'checkInAlreadyDone', params)); // Log in English
    // await sendNotification(getMessage(lang, 'checkInAlreadyDone', params)); // Optional: notify if already checked in
    return true;
  } else {
    const params = { status: currentStatus, expectedStatus: STATUS_NOT_CHECKED_IN_KO };
    console.log(getMessage('en', 'checkInInvalidStatus', params)); // Log in English
    await sendNotification(getMessage(lang, 'checkInInvalidStatus', params), true);
    return false;
  }
}

async function checkOut(page, config) {
  const lang = config.appSettings.messageLanguage;
  console.log('Attempting Check-Out...');
  const currentStatus = await getWorkingStatus(page, config);

  if (currentStatus === null) {
    await sendNotification(getMessage(lang, 'checkOutProcessError'), true);
    return false;
  }

  // Standard Jobcan statuses (Korean)
  const STATUS_WORKING_KO = '근무중';
  const STATUS_RESTING_KO = '휴식중'; // Expected after checkout as per project.md
  const STATUS_NOT_CHECKED_IN_KO = '미출근'; // Also a possible state after checkout

  if (currentStatus === STATUS_WORKING_KO) {
    console.log(`Status is "${STATUS_WORKING_KO}". Proceeding with check-out.`);
    const clicked = await clickAttendanceButton(page, config);
    if (clicked) {
      const newStatus = await getWorkingStatus(page, config);
      if (newStatus === STATUS_RESTING_KO || newStatus === STATUS_NOT_CHECKED_IN_KO) {
        console.log(`Check-Out successful. Status changed to "${newStatus}".`);
        await sendNotification(getMessage(lang, 'checkOutSuccess', { status: newStatus }));
        return true;
      } else {
        const params = { newStatus: newStatus, expectedStatus: STATUS_RESTING_KO, altExpectedStatus: STATUS_NOT_CHECKED_IN_KO };
        console.log(getMessage('en', 'checkOutWarning', params)); // Log in English
        await sendNotification(getMessage(lang, 'checkOutWarning', params), true);
        return false;
      }
    } else {
      await sendNotification(getMessage(lang, 'checkOutClickError'), true);
      return false;
    }
  } else if (currentStatus === STATUS_RESTING_KO || currentStatus === STATUS_NOT_CHECKED_IN_KO) {
    const params = { status: currentStatus };
    console.log(getMessage('en', 'checkOutAlreadyDone', params)); // Log in English
    // await sendNotification(getMessage(lang, 'checkOutAlreadyDone', params)); // Optional: notify if already checked out
    return true;
  } else {
    const params = { status: currentStatus, expectedStatus: STATUS_WORKING_KO };
    console.log(getMessage('en', 'checkOutInvalidStatus', params)); // Log in English
    await sendNotification(getMessage(lang, 'checkOutInvalidStatus', params), true);
    return false;
  }
}

module.exports = {
  getConfig,
  launchBrowserAndLoginPage,
  getWorkingStatus,
  checkIn,
  checkOut,
  getMessage, // Export getMessage
};
