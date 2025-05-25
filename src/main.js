const { launchBrowserAndLoginPage, checkIn, checkOut, getConfig, getMessage } = require('./jobcan'); // Import getMessage
const { sendNotification } = require('./notificationService');

async function main() {
  console.log('Starting Jobcan automation script...');
  let browser;
  let config; // Define config in a broader scope

  try {
    config = await getConfig(); // Load config early to use for all messages
    const lang = config.appSettings.messageLanguage; // Changed from config.telegram.messageLanguage

    const args = process.argv.slice(2);
    const action = args[0]; // e.g., 'checkIn' or 'checkOut'

    if (!action) {
      console.log('---------------------------------------------------');
      console.log(' Jobcan Automatic Attendance Script');
      console.log('---------------------------------------------------');
      console.log('This script automates clock-in and clock-out on Jobcan.');
      console.log('\nUsage: node src/main.js <action>\n');
      console.log('Available actions (manual execution):');
      console.log('  checkIn    - Perform clock-in.');
      console.log('  checkOut   - Perform clock-out.');
      console.log('\nTo run with npm scripts (see package.json):');
      console.log('  npm run checkin');
      console.log('  npm run checkout');
      console.log('  npm run schedule  - Start the scheduler for automatic operations.');
      console.log('\nCurrent Configuration Highlights:');
      console.log(`  - Scheduler Enabled: ${config.scheduler?.enabled}`); // Optional chaining for safety
      if (config.scheduler?.enabled) {
        console.log(`    - Check-in Cron: ${config.scheduler.checkInCron}`);
        console.log(`    - Check-out Cron: ${config.scheduler.checkOutCron}`);
        console.log(`    - Timezone: ${config.scheduler.timezone}`);
      }
      console.log(`  - Headless Mode: ${config.playwright?.headless}`); // Optional chaining
      console.log(`  - Test Mode: ${config.appSettings?.testMode}`); // Optional chaining
      console.log('---------------------------------------------------');
      return;
    }

    // Pass config to launchBrowserAndLoginPage, as it's already loaded
    const { browser: launchedBrowser, page } = await launchBrowserAndLoginPage(config);
    browser = launchedBrowser; // Assign to outer scope for finally block

    console.log('Login process finished (or timed out).');
    console.log('Current page URL:', page.url());

    let success = false;
    if (action.toLowerCase() === 'checkin') {
      console.log('Action: Check-In');
      success = await checkIn(page, config);
    } else if (action.toLowerCase() === 'checkout') {
      console.log('Action: Check-Out');
      success = await checkOut(page, config);
    } else {
      // Use getMessage for invalid action, though this is a console log, not a notification
      // For consistency, we could create a message key for this if frequent.
      console.log(`Invalid action: ${action}. Please use 'checkIn' or 'checkOut'.`);
      // Example if we wanted to notify for invalid action:
      // await sendNotification(getMessage(lang, 'mainInvalidAction', { action }), true);
    }

    if (success) {
      console.log(`Action "${action}" completed successfully.`);
    } else {
      console.log(`Action "${action}" may have failed or was not applicable.`);
    }

  } catch (error) {
    console.error('An error occurred in the main script:', error);
    // Use getMessage for critical error notification
    // Fallback language to 'en' if config or lang is somehow undefined
    const currentLang = config?.appSettings?.messageLanguage || 'en'; // Changed from config.telegram.messageLanguage
    const errorMessage = error && typeof error.message === 'string' ? error.message : 'Unknown error occurred';
    // Assuming a new message key 'mainScriptError'
    await sendNotification(getMessage(currentLang, 'mainScriptError', { errorMsg: errorMessage }), true);
  } finally {
    if (browser) {
      console.log('Closing browser...');
      await browser.close();
    }
    console.log('Script finished.');
  }
}

main();
