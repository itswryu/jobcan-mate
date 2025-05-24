const fs = require('fs').promises;
const path = require('path');
const { chromium } = require('playwright');
const dotenv = require('dotenv');
const { initializeNotificationService, sendNotification } = require('./notificationService'); // Added

const CONFIG_PATH = path.join(__dirname, '..', 'config.json');
let configInstance = null; // Cache config

async function getConfig() {
  if (configInstance) {
    return configInstance;
  }
  try {
    const configData = await fs.readFile(CONFIG_PATH, 'utf-8');
    const config = JSON.parse(configData);

    // .env 파일 경로를 config에서 명시적으로 가져오도록 수정 (옵셔널 체이닝 사용)
    const envFileName = config?.jobcan?.loginCredentials?.envFilePath ?? '.env';
    const envPath = path.resolve(__dirname, '..', envFileName);

    if (await fs.access(envPath).then(() => true).catch(() => false)) {
      console.log(`Loading .env file from: ${envPath}`);
      dotenv.config({ path: envPath });
    } else {
      console.warn(`.env file not found at: ${envPath}. Proceeding without it.`);
      // .env 파일이 없으면 텔레그램 알림 및 자동 로그인이 불가능할 수 있음을 알림
      // 이 부분은 initializeNotificationService 내부에서도 처리되지만, 여기서도 명시적으로 알 수 있음
    }

    // Initialize notification service with loaded config
    // config 객체를 전달하여 notificationService가 필요한 환경 변수 이름을 알 수 있도록 함
    initializeNotificationService(config);

    configInstance = config; // Cache the loaded and processed config
    return config;
  } catch (error) {
    console.error('Error reading or parsing config.json or .env file:', error);
    // Notify about config loading error
    // At this stage, sendNotification might not be initialized if config loading failed before its initialization.
    // Consider a fallback or ensure critical errors are logged/handled even if notifications aren't up.
    // For now, we'll attempt to send a notification if possible, but it might fail.
    sendNotification(`[오류] 설정 파일(config.json 또는 .env) 로드 실패: ${error.message}`, true).catch(console.error);
    throw error;
  }
}

async function launchBrowserAndLoginPage() {
  let browser; // Declare browser outside try block for access in catch/finally
  try {
    const config = await getConfig(); // Ensures config is loaded and notification service initialized
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
        // 자동 로그인 성공/실패는 아래 네비게이션 성공 여부로 판단하므로 별도 알림 없음
      } catch (error) {
        console.error('Error during automatic login attempt:', error);
        await sendNotification(`[오류] Jobcan 자동 로그인 실패: ${error.message}`, true);
        console.log('Please log in manually.');
        // 자동 로그인 실패 시 수동 로그인을 위해 브라우저를 유지할 수 있으므로, 여기서 브라우저를 닫지 않음
      }
    } else {
      const message = 'Jobcan 로그인 정보(.env)를 찾을 수 없습니다. 수동 로그인이 필요합니다.';
      console.log(message);
      await sendNotification(`[경고] ${message}`, true);
    }

    console.log(`Waiting for navigation to attendance page: ${attendanceUrl} or for 2 minutes...`);

    try {
      await page.waitForURL(url => url.startsWith(attendanceUrl), { timeout: 120000 });
      console.log('Successfully navigated to the attendance page.');
      // 출퇴근 페이지 접속 성공 알림은 너무 잦을 수 있어 생략
    } catch (error) {
      console.error('Timeout or error while waiting for navigation to attendance page:', error);
      await sendNotification(`[오류] Jobcan 출퇴근 페이지 접속 실패 (타임아웃 또는 오류): ${error.message}`, true);
      console.log('Browser will remain open for manual intervention or inspection.');
      // 페이지 접속 실패 시에도 브라우저를 열어둘 수 있으므로, 여기서 닫지 않음
      // throw error; // 에러를 다시 던져서 main.js에서 처리하도록 할 수 있음
    }
    return { browser, page, config }; // config도 반환하여 재사용

  } catch (error) {
    console.error('Error in launchBrowserAndLoginPage:', error);
    await sendNotification(`[오류] 브라우저 시작 또는 로그인 페이지 처리 중 심각한 오류: ${error.message}`, true);
    if (browser) {
      await browser.close(); // 심각한 오류 시 브라우저 정리
    }
    throw error; // Re-throw to be caught by main.js
  }
}

async function getWorkingStatus(page, config) {
  try {
    const statusElement = await page.waitForSelector(config.jobcan.workingStatusXPath, { timeout: 10000 }); // 늘린 타임아웃
    const statusText = await statusElement.textContent();
    console.log(`Current working status: ${statusText.trim()}`);
    return statusText.trim();
  } catch (error) {
    console.error('Error getting working status:', error);
    await sendNotification(`[오류] 근무 상태 확인 실패: ${error.message}`, true); // 알림 추가
    return null; // Return null or throw error as per preference
  }
}

async function clickAttendanceButton(page, config) {
  if (config.appSettings.testMode) {
    console.log('[Test Mode] Attendance button click skipped.');
    return true; // Simulate success in test mode
  }
  try {
    console.log('Attempting to click attendance button...');
    // Promise for waiting for API response
    const responsePromise = page.waitForResponse(
      response =>
        response.url().includes('jobcan.jp/employee/') && // API URL pattern (may need adjustment)
        (response.request().method() === 'POST' || response.request().method() === 'PUT') && // Typically state-changing requests
        response.status() === 200, // Successful response code
      { timeout: 10000 } // Max 10 seconds wait
    );

    await page.click(config.jobcan.attendanceButtonXPath);
    console.log('Attendance button clicked. Waiting for API response...');

    try {
      const response = await responsePromise;
      console.log(`API response received: ${response.status()} ${response.url()}`);
    } catch (e) {
      console.warn('API response timed out or did not match criteria after 10 seconds.');
      // Even if API response isn't caught, UI might have updated, so proceed
    }

    // Add a short wait for potential UI updates after API response
    await page.waitForTimeout(1500);
    console.log('Waited for potential UI update after API response.');
    return true;
  } catch (error) {
    console.error('Error clicking attendance button or waiting for API response:', error);
    await sendNotification(`[오류] 출퇴근 버튼 클릭 또는 API 응답 대기 중 오류: ${error.message}`, true); // 알림 추가
    return false;
  }
}

async function checkIn(page, config) {
  console.log('Attempting Check-In...');
  const currentStatus = await getWorkingStatus(page, config);

  if (currentStatus === null) { // 근무 상태 확인 실패 시
    await sendNotification('[오류] 출근 처리 실패: 현재 근무 상태를 확인할 수 없습니다.', true);
    return false;
  }

  if (currentStatus === '미출근') {
    console.log('Status is "미출근". Proceeding with check-in.');
    const clicked = await clickAttendanceButton(page, config);
    if (clicked) {
      const newStatus = await getWorkingStatus(page, config);
      if (newStatus === '근무중') {
        console.log('Check-In successful. Status changed to "근무중".');
        await sendNotification('✅ Jobcan 출근 처리가 완료되었습니다. 현재 상태: 근무중');
        return true;
      } else {
        const message = `출근 처리가 실패했거나 상태 변경이 확인되지 않았습니다. 현재 상태: "${newStatus}", 예상 상태: "근무중".`;
        console.log(message);
        await sendNotification(`[주의] ${message}`, true);
        return false;
      }
    } else { // 클릭 실패 시
      await sendNotification('[오류] 출근 처리 실패: 출근 버튼 클릭에 실패했습니다.', true);
      return false;
    }
  } else if (currentStatus === '근무중') {
    console.log('Already checked in. Status is "근무중".');
    // 이미 출근한 상태 알림은 생략
    return true;
  } else {
    const message = `출근할 수 없습니다. 현재 상태: "${currentStatus}", 예상 상태: "미출근".`;
    console.log(message);
    await sendNotification(`[경고] ${message}`, true);
    return false;
  }
  // 이 부분은 모든 조건이 위에서 처리되므로 도달하지 않음
}

async function checkOut(page, config) {
  console.log('Attempting Check-Out...');
  const currentStatus = await getWorkingStatus(page, config);

  if (currentStatus === null) { // 근무 상태 확인 실패 시
    await sendNotification('[오류] 퇴근 처리 실패: 현재 근무 상태를 확인할 수 없습니다.', true);
    return false;
  }

  if (currentStatus === '근무중') {
    console.log('Status is "근무중". Proceeding with check-out.');
    const clicked = await clickAttendanceButton(page, config);
    if (clicked) {
      const newStatus = await getWorkingStatus(page, config);
      // As per project.md, expecting '휴식중'. This might need verification.
      if (newStatus === '휴식중' || newStatus === '미출근') { // Allowing '미출근' as a possible post-checkout state
        console.log(`Check-Out successful. Status changed to "${newStatus}".`);
        await sendNotification(`✅ Jobcan 퇴근 처리가 완료되었습니다. 현재 상태: ${newStatus}`);
        return true;
      } else {
        const message = `퇴근 처리가 실패했거나 상태 변경이 확인되지 않았습니다. 현재 상태: "${newStatus}", 예상 상태: "휴식중" 또는 "미출근".`;
        console.log(message);
        await sendNotification(`[주의] ${message}`, true);
        return false;
      }
    } else { // 클릭 실패 시
      await sendNotification('[오류] 퇴근 처리 실패: 퇴근 버튼 클릭에 실패했습니다.', true);
      return false;
    }
  } else if (currentStatus === '휴식중' || currentStatus === '미출근') {
    const message = `이미 퇴근했거나 출근하지 않은 상태입니다. 현재 상태: "${currentStatus}".`;
    console.log(message);
    // 이미 퇴근한 상태 알림은 생략
    return true;
  } else {
    const message = `퇴근할 수 없습니다. 현재 상태: "${currentStatus}", 예상 상태: "근무중".`;
    console.log(message);
    await sendNotification(`[경고] ${message}`, true);
    return false;
  }
  // 이 부분은 모든 조건이 위에서 처리되므로 도달하지 않음
}

module.exports = {
  getConfig,
  launchBrowserAndLoginPage,
  getWorkingStatus,
  checkIn,
  checkOut,
};
