const playwright = require('playwright');
const logger = require('../utils/logger');
const { UserSettings } = require('../database/setup');
const { decrypt } = require('./cryptoService');
const config = require('../config/config');

/**
 * Logs into Jobcan.
 * @param {import('playwright').BrowserContext} context - Playwright browser context.
 * @param {string} username - Jobcan username.
 * @param {string} decryptedPassword - Decrypted Jobcan password.
 * @param {object} jobcanConfig - Jobcan configuration from config.js.
 * @param {object} playwrightConfig - Playwright configuration from config.js.
 * @returns {Promise<import('playwright').Page>} Playwright page object after login.
 */
async function loginToJobcan(context, username, decryptedPassword, jobcanConfig, playwrightConfig) {
  const page = await context.newPage();
  try {
    logger.info(`Navigating to Jobcan login page: ${jobcanConfig.loginUrl}`);
    await page.goto(jobcanConfig.loginUrl, { timeout: playwrightConfig.navigationTimeout });

    logger.info(`Filling username: ${username}`);
    await page.fill(jobcanConfig.usernameSelector, username, { timeout: playwrightConfig.actionTimeout });

    logger.info('Filling password.'); // Password itself not logged
    await page.fill(jobcanConfig.passwordSelector, decryptedPassword, { timeout: playwrightConfig.actionTimeout });

    logger.info('Clicking login button.');
    await page.click(jobcanConfig.loginButtonSelector, { timeout: playwrightConfig.actionTimeout });

    logger.info(`Waiting for login success indicator: ${jobcanConfig.loginSuccessIndicator}`);
    await page.waitForSelector(jobcanConfig.loginSuccessIndicator, { timeout: playwrightConfig.navigationTimeout });
    
    // Optional: Navigate to the main stamp page if login lands on a different welcome page
    if (page.url() !== jobcanConfig.stampPageUrl && jobcanConfig.stampPageUrl !== jobcanConfig.loginUrl) {
        logger.info(`Login successful. Navigating to stamp page: ${jobcanConfig.stampPageUrl}`);
        await page.goto(jobcanConfig.stampPageUrl, { timeout: playwrightConfig.navigationTimeout });
    } else {
        logger.info('Login successful. Already on or redirected to a page considered the stamp page.');
    }

    return page;
  } catch (error) {
    logger.error(`Error during Jobcan login for username ${username}: ${error.message}`, { stack: error.stack });
    // Attempt to take a screenshot on error
    try {
        const screenshotPath = `error_login_${username}_${Date.now()}.png`;
        await page.screenshot({ path: screenshotPath });
        logger.info(`Screenshot taken on login error: ${screenshotPath}`);
    } catch (ssError) {
        logger.error('Failed to take screenshot on login error:', ssError);
    }
    await page.close(); // Close the page if an error occurred during login
    throw error; // Re-throw the error to be caught by executeJobcanTask
  }
}

/**
 * Performs check-in on Jobcan.
 * @param {import('playwright').Page} page - Playwright page object.
 * @param {object} jobcanConfig - Jobcan configuration.
 * @param {object} playwrightConfig - Playwright configuration.
 * @returns {Promise<object>} Result object { success: boolean, message: string }.
 */
async function performCheckIn(page, jobcanConfig, playwrightConfig) {
  try {
    logger.info(`Attempting to click check-in button: ${jobcanConfig.checkInButtonSelector}`);
    await page.click(jobcanConfig.checkInButtonSelector, { timeout: playwrightConfig.actionTimeout });
    
    logger.info(`Waiting for stamp success indicator: ${jobcanConfig.stampSuccessIndicator}`);
    // More specific check for success indicator, e.g., checking text content if needed
    await page.waitForSelector(jobcanConfig.stampSuccessIndicator, { timeout: playwrightConfig.actionTimeout });
    // Example: await page.waitForFunction(selector => document.querySelector(selector)?.textContent?.includes("打刻しました"), jobcanConfig.stampSuccessIndicator, { timeout: playwrightConfig.actionTimeout });

    return { success: true, message: 'Check-in successful.' };
  } catch (error) {
    logger.error(`Error during Jobcan check-in: ${error.message}`, { stack: error.stack });
     try {
        const screenshotPath = `error_checkin_${Date.now()}.png`;
        await page.screenshot({ path: screenshotPath });
        logger.info(`Screenshot taken on check-in error: ${screenshotPath}`);
    } catch (ssError) {
        logger.error('Failed to take screenshot on check-in error:', ssError);
    }
    throw error;
  }
}

/**
 * Performs check-out on Jobcan.
 * @param {import('playwright').Page} page - Playwright page object.
 * @param {object} jobcanConfig - Jobcan configuration.
 * @param {object} playwrightConfig - Playwright configuration.
 * @returns {Promise<object>} Result object { success: boolean, message: string }.
 */
async function performCheckOut(page, jobcanConfig, playwrightConfig) {
  try {
    logger.info(`Attempting to click check-out button: ${jobcanConfig.checkOutButtonSelector}`);
    await page.click(jobcanConfig.checkOutButtonSelector, { timeout: playwrightConfig.actionTimeout });

    logger.info(`Waiting for stamp success indicator: ${jobcanConfig.stampSuccessIndicator}`);
    await page.waitForSelector(jobcanConfig.stampSuccessIndicator, { timeout: playwrightConfig.actionTimeout });

    return { success: true, message: 'Check-out successful.' };
  } catch (error) {
    logger.error(`Error during Jobcan check-out: ${error.message}`, { stack: error.stack });
     try {
        const screenshotPath = `error_checkout_${Date.now()}.png`;
        await page.screenshot({ path: screenshotPath });
        logger.info(`Screenshot taken on check-out error: ${screenshotPath}`);
    } catch (ssError) {
        logger.error('Failed to take screenshot on check-out error:', ssError);
    }
    throw error;
  }
}

/**
 * Main function to execute Jobcan tasks (check-in or check-out).
 * @param {string} userId - The UUID of the user.
 * @param {'checkIn' | 'checkOut'} actionType - The type of action to perform.
 * @returns {Promise<object>} Result object { success: boolean, message?: string, error?: string, isTestMode?: boolean }.
 */
const executeJobcanTask = async (userId, actionType) => {
  logger.info(`Starting Jobcan task '${actionType}' for userId: ${userId}`);

  const settings = await UserSettings.findOne({ where: { userId } });
  if (!settings || !settings.jobcanUsername) {
    const errorMsg = `UserSettings or Jobcan username not found for userId: ${userId}.`;
    logger.error(errorMsg);
    return { success: false, error: errorMsg };
  }

  if (!settings.encryptedJobcanPassword || !settings.jobcanPasswordSalt) {
    const errorMsg = `Jobcan password or salt not set for userId: ${userId}. Cannot perform Jobcan task.`;
    logger.error(errorMsg);
    return { success: false, error: errorMsg };
  }

  const decryptedPassword = decrypt(settings.encryptedJobcanPassword, settings.jobcanPasswordSalt);
  if (!decryptedPassword) {
    const errorMsg = `Failed to decrypt Jobcan password for userId: ${userId}.`;
    logger.error(errorMsg);
    return { success: false, error: errorMsg };
  }

  if (settings.isTestMode) {
    const message = `TEST MODE: Jobcan task '${actionType}' simulated for user ${settings.jobcanUsername} (userId: ${userId}).`;
    logger.info(message);
    return { success: true, message: message, isTestMode: true };
  }

  let browser = null;
  let context = null;
  let page = null; // Define page here to potentially close it in finally if login fails but page was created

  try {
    logger.info(`Launching browser (headless: ${config.playwright.headless}) for Jobcan task.`);
    browser = await playwright.chromium.launch({ headless: config.playwright.headless });
    context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36', // Updated user agent
      // Consider viewport, locale, timezone settings for context if needed
    });
    
    // Set default timeouts for the context
    context.setDefaultNavigationTimeout(config.playwright.navigationTimeout);
    context.setDefaultTimeout(config.playwright.actionTimeout);


    page = await loginToJobcan(context, settings.jobcanUsername, decryptedPassword, config.jobcan, config.playwright);
    // Note: loginToJobcan will throw if it fails, and page will be closed there. 
    // If it succeeds, 'page' is the logged-in page.

    let result;
    if (actionType === 'checkIn') {
      result = await performCheckIn(page, config.jobcan, config.playwright);
    } else if (actionType === 'checkOut') {
      result = await performCheckOut(page, config.jobcan, config.playwright);
    } else {
      throw new Error(`Invalid actionType: ${actionType}`);
    }

    logger.info(`Jobcan task '${actionType}' successful for userId: ${userId}. Message: ${result.message}`);
    return { ...result, isTestMode: false };

  } catch (error) {
    logger.error(`Error during Jobcan task '${actionType}' for userId ${userId}: ${error.message}`, { stack: error.stack, errorDetails: error.toString() });
    return { success: false, error: error.message || 'Unknown Jobcan automation error.' };
  } finally {
    logger.info(`Starting finally block for Jobcan task cleanup, userId: ${userId}.`);
    if (page && !page.isClosed()) { // If page exists and is not closed (e.g. login succeeded but action failed)
        try {
            logger.info(`Closing page for userId: ${userId}`);
            await page.close();
        } catch (e) {
            logger.error(`Error closing page for userId ${userId}:`, e);
        }
    }
    // Context is closed even if page might have been closed by loginToJobcan on its error
    if (context) {
      try {
        logger.info(`Closing context for userId: ${userId}`);
        await context.close();
      } catch (e) {
        logger.error(`Error closing context for userId ${userId}:`, e);
      }
    }
    if (browser) {
      try {
        logger.info(`Closing browser for userId: ${userId}`);
        await browser.close();
      } catch (e) {
        logger.error(`Error closing browser for userId ${userId}:`, e);
      }
    }
    logger.info(`Finished Jobcan task '${actionType}' for userId: ${userId}.`);
  }
};

module.exports = {
  executeJobcanTask,
};
