const ical = require('node-ical');
const { getConfig } = require('./jobcan');

/**
 * Checks if today is a public holiday based on the iCalendar URL in the config.
 * @returns {Promise<boolean>} True if today is a holiday, false otherwise.
 */
async function isTodayHoliday() {
  try {
    const config = await getConfig();
    const icsUrl = config.calendar?.holidayCalendarUrl;

    if (!icsUrl) {
      console.log('Holiday calendar URL not found in config. Skipping holiday check.');
      return false;
    }

    console.log(`Fetching holidays from: ${icsUrl}`);
    const events = await ical.async.fromURL(icsUrl);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today to the start of the day for comparison

    for (const k in events) {
      if (events.hasOwnProperty(k)) {
        const event = events[k];
        if (event.type === 'VEVENT') {
          const startDate = new Date(event.start);
          startDate.setHours(0, 0, 0, 0); // Normalize event start date

          // For all-day events, the end date might be the next day.
          // We only need to check if today falls on the start date of a holiday event.
          if (startDate.getTime() === today.getTime()) {
            console.log(`Today (${today.toISOString().split('T')[0]}) is a holiday: ${event.summary}`);
            return true;
          }
        }
      }
    }
    console.log(`Today (${today.toISOString().split('T')[0]}) is not a public holiday.`);
    return false;
  } catch (error) {
    console.error('Error checking for holidays:', error);
    return false; // In case of error, assume it's not a holiday to not break attendance
  }
}

module.exports = { isTodayHoliday };
