const ical = require('node-ical');
// No longer directly dependent on getConfig from jobcan.js for the URL
// const { getConfig } = require('./jobcan');

/**
 * Checks if today is a public holiday based on the provided iCalendar URL.
 * @param {string} holidayCalendarUrl - The URL of the iCalendar file.
 * @returns {Promise<string|boolean>} The name of the holiday if today is a holiday, false otherwise.
 */
async function isTodayHoliday(holidayCalendarUrl) {
  try {
    if (!holidayCalendarUrl) {
      console.log('Holiday calendar URL not provided. Skipping holiday check.');
      return false;
    }

    console.log(`Fetching holidays from: ${holidayCalendarUrl}`);
    const events = await ical.async.fromURL(holidayCalendarUrl);
    const currentDate = new Date(); // Changed variable name from today to currentDate
    currentDate.setHours(0, 0, 0, 0); // Normalize currentDate to the start of the day

    for (const k in events) {
      if (events.hasOwnProperty(k)) {
        const event = events[k];
        if (event.type === 'VEVENT') {
          const startDate = new Date(event.start);
          startDate.setHours(0, 0, 0, 0); // Normalize event start date

          // For all-day events, the end date might be the next day.
          // We only need to check if today falls on the start date of a holiday event.
          if (startDate.getTime() === currentDate.getTime()) { // Used currentDate
            const holidayName = event.summary || 'Unnamed Holiday';
            console.log(`Today (${currentDate.toISOString().split('T')[0]}) is a holiday: ${holidayName}`); // Used currentDate
            return holidayName; // Return the name of the holiday
          }
        }
      }
    }
    console.log(`Today (${currentDate.toISOString().split('T')[0]}) is not a public holiday.`); // Used currentDate
    return false;
  } catch (error) {
    console.error('Error checking for holidays:', error);
    // In case of error, assume it's not a holiday to not break attendance logic.
    // A notification for this error might be useful, handled by the caller (scheduler.js).
    return false;
  }
}

module.exports = { isTodayHoliday };
