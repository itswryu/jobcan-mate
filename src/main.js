const { launchBrowserAndLoginPage, checkIn, checkOut, getConfig } = require('./jobcan');

async function main() {
  console.log('Starting Jobcan automation script...');
  let browser;

  try {
    const args = process.argv.slice(2);
    const action = args[0]; // e.g., 'checkIn' or 'checkOut'

    if (!action) {
      const config = await getConfig(); // Load config for help message
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
      console.log(`  - Scheduler Enabled: ${config.scheduler && config.scheduler.enabled}`);
      if (config.scheduler && config.scheduler.enabled) {
        console.log(`    - Check-in Cron: ${config.scheduler.checkInCron}`);
        console.log(`    - Check-out Cron: ${config.scheduler.checkOutCron}`);
        console.log(`    - Timezone: ${config.scheduler.timezone}`);
      }
      console.log(`  - Headless Mode: ${config.playwright && config.playwright.headless}`);
      console.log(`  - Test Mode: ${config.appSettings && config.appSettings.testMode}`);
      console.log('---------------------------------------------------');
      return;
    }

    const { browser: launchedBrowser, page, config } = await launchBrowserAndLoginPage();
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
      console.log(`Invalid action: ${action}. Please use 'checkIn' or 'checkOut'.`);
    }

    if (success) {
      console.log(`Action "${action}" completed successfully.`);
    } else {
      console.log(`Action "${action}" may have failed or was not applicable.`);
    }

  } catch (error) {
    console.error('An error occurred in the main script:', error);
  } finally {
    if (browser) {
      console.log('Closing browser...');
      await browser.close();
    }
    console.log('Script finished.');
  }
}

main();
