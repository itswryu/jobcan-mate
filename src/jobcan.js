const fs = require('fs').promises;
const path = require('path');
const { chromium } = require('playwright');
const dotenv = require('dotenv');

const CONFIG_PATH = path.join(__dirname, '..', 'config.json');

async function getConfig() {
  try {
    const configData = await fs.readFile(CONFIG_PATH, 'utf-8');
    const config = JSON.parse(configData);

    // Load environment variables from .env file if specified
    if (config.jobcan && config.jobcan.loginCredentials && config.jobcan.loginCredentials.envFilePath) {
      const envPath = path.resolve(__dirname, '..', config.jobcan.loginCredentials.envFilePath);
      if (await fs.access(envPath).then(() => true).catch(() => false)) {
        console.log(`Loading .env file from: ${envPath}`);
        dotenv.config({ path: envPath });
      } else {
        console.warn(`.env file not found at: ${envPath}. Proceeding without it.`);
      }
    }
    return config;
  } catch (error) {
    console.error('Error reading or parsing config.json or .env file:', error);
    throw error; // Re-throw to handle in the caller
  }
}

async function launchBrowserAndLoginPage() {
  const config = await getConfig();
  const { loginUrl, attendanceUrl, loginCredentials } = config.jobcan;
  const { emailXPath, passwordXPath, loginButtonXPath } = loginCredentials;
  const { headless } = config.playwright;

  const jobcanEmail = process.env.JOBCAN_EMAIL;
  const jobcanPassword = process.env.JOBCAN_PASSWORD;

  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: headless });
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
      console.error('Error during automatic login attempt:', error);
      console.log('Please log in manually.');
    }
  } else {
    console.log('Login credentials not found in .env file or .env file not specified/found. Please log in manually.');
  }

  console.log(`Waiting for navigation to attendance page: ${attendanceUrl} or for 2 minutes...`);

  try {
    // Wait for navigation to the attendance page after login, or timeout
    await page.waitForURL(url => url.startsWith(attendanceUrl), { timeout: 120000 }); // 2 minutes timeout
    console.log('Successfully navigated to the attendance page.');
  } catch (error) {
    console.error('Timeout or error while waiting for navigation to attendance page:', error);
    console.log('Browser will remain open for manual intervention or inspection.');
  }

  return { browser, page, config };
}

async function getWorkingStatus(page, config) {
  try {
    const statusElement = await page.waitForSelector(config.jobcan.workingStatusXPath, { timeout: 5000 });
    const statusText = await statusElement.textContent();
    console.log(`Current working status: ${statusText.trim()}`);
    return statusText.trim();
  } catch (error) {
    console.error('Error getting working status:', error);
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
    return false;
  }
}

async function checkIn(page, config) {
  console.log('Attempting Check-In...');
  const currentStatus = await getWorkingStatus(page, config);

  if (currentStatus === '미출근') {
    console.log('Status is "미출근". Proceeding with check-in.');
    const clicked = await clickAttendanceButton(page, config);
    if (clicked) {
      const newStatus = await getWorkingStatus(page, config);
      if (newStatus === '근무중') {
        console.log('Check-In successful. Status changed to "근무중".');
        return true;
      } else {
        console.log(`Check-In may have failed. Status is now "${newStatus}", expected "근무중".`);
        return false;
      }
    }
  } else if (currentStatus === '근무중') {
    console.log('Already checked in. Status is "근무중".');
    return true; // Or false if this should be an error/warning
  } else {
    console.log(`Cannot check in. Current status is "${currentStatus}", expected "미출근".`);
    return false;
  }
  return false;
}

async function checkOut(page, config) {
  console.log('Attempting Check-Out...');
  const currentStatus = await getWorkingStatus(page, config);

  if (currentStatus === '근무중') {
    console.log('Status is "근무중". Proceeding with check-out.');
    const clicked = await clickAttendanceButton(page, config);
    if (clicked) {
      const newStatus = await getWorkingStatus(page, config);
      // As per project.md, expecting '휴식중'. This might need verification.
      if (newStatus === '휴식중' || newStatus === '미출근') { // Allowing '미출근' as a possible post-checkout state
        console.log(`Check-Out successful. Status changed to "${newStatus}".`);
        return true;
      } else {
        console.log(`Check-Out may have failed. Status is now "${newStatus}", expected "휴식중" or "미출근".`);
        return false;
      }
    }
  } else if (currentStatus === '휴식중' || currentStatus === '미출근') {
    console.log(`Already checked out or not checked in. Status is "${currentStatus}".`);
    return true; // Or false
  } else {
    console.log(`Cannot check out. Current status is "${currentStatus}", expected "근무중".`);
    return false;
  }
  return false;
}

module.exports = {
  getConfig,
  launchBrowserAndLoginPage,
  getWorkingStatus,
  checkIn,
  checkOut,
};
