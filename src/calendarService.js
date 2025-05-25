const ical = require('node-ical');

/**
 * Checks if today is an annual leave day based on the provided iCalendar URL and keyword.
 * @param {string} annualLeaveCalendarUrl - The URL of the iCalendar file for annual leaves.
 * @param {string} annualLeaveKeyword - The keyword to identify annual leave events.
 * @returns {Promise<string|boolean>} The name of the annual leave event if today is an annual leave day, false otherwise.
 */
async function isTodayAnnualLeave(annualLeaveCalendarUrl, annualLeaveKeyword) {
  if (!annualLeaveCalendarUrl || !annualLeaveKeyword) {
    console.log('Annual leave calendar URL or keyword not provided. Skipping annual leave check.');
    return false;
  }

  try {
    console.log(`Fetching annual leave events from: ${annualLeaveCalendarUrl}`);
    const events = await ical.async.fromURL(annualLeaveCalendarUrl);
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (const k in events) {
      if (events.hasOwnProperty(k)) {
        const event = events[k];
        if (event.type === 'VEVENT' && event.summary) {
          const startDate = new Date(event.start);
          startDate.setHours(0, 0, 0, 0);

          // Check if the event is for today and summary contains the keyword
          if (startDate.getTime() === currentDate.getTime() && event.summary.includes(annualLeaveKeyword)) {
            const eventName = event.summary;
            console.log(`Today (${currentDate.toISOString().split('T')[0]}) is an annual leave day: ${eventName}`);
            return eventName;
          }
        }
      }
    }
    console.log(`Today (${currentDate.toISOString().split('T')[0]}) is not an annual leave day based on keyword '${annualLeaveKeyword}'.`);
    return false;
  } catch (error) {
    console.error('Error checking for annual leave:', error);
    return false; // In case of error, assume it's not an annual leave day.
  }
}

/**
 * Checks if today is a public holiday based on the provided iCalendar URL.
 * @param {string} holidayCalendarUrl - The URL of the iCalendar file for public holidays.
 * @returns {Promise<string|boolean>} The name of the holiday if today is a public holiday, false otherwise.
 */
async function isTodayPublicHoliday(holidayCalendarUrl) {
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

          if (startDate.getTime() === currentDate.getTime()) {
            const holidayName = event.summary || 'Unnamed Holiday';
            console.log(`Today (${currentDate.toISOString().split('T')[0]}) is a public holiday: ${holidayName}`);
            return holidayName;
          }
        }
      }
    }
    console.log(`Today (${currentDate.toISOString().split('T')[0]}) is not a public holiday.`);
    return false;
  } catch (error) {
    console.error('Error checking for public holidays:', error);
    return false;
  }
}

/**
 * Checks if today is an off-day (either annual leave or public holiday).
 * Annual leave takes precedence over public holidays.
 * @param {object} calendarConfig - Calendar configuration object.
 * @param {string} calendarConfig.annualLeaveCalendarUrl - URL for annual leave ICS.
 * @param {string} calendarConfig.annualLeaveKeyword - Keyword for annual leave.
 * @param {string} calendarConfig.holidayCalendarUrl - URL for public holiday ICS.
 * @returns {Promise<object|boolean>} Object with type and name if it's an off-day, false otherwise.
 *                                    Example: { type: 'annualLeave', name: 'Personal Time Off' }
 *                                             { type: 'publicHoliday', name: 'New Year's Day' }
 */
async function checkIfTodayIsOffDay(calendarConfig) {
  const { annualLeaveCalendarUrl, annualLeaveKeyword, holidayCalendarUrl } = calendarConfig;

  // Only check for annual leave if the URL is provided
  if (annualLeaveCalendarUrl && annualLeaveCalendarUrl.trim() !== '') {
    const annualLeaveName = await isTodayAnnualLeave(annualLeaveCalendarUrl, annualLeaveKeyword);
    if (annualLeaveName) {
      return { type: 'annualLeave', name: annualLeaveName };
    }
  } else {
    console.log('Annual leave calendar URL is not configured. Skipping annual leave check.');
  }

  const publicHolidayName = await isTodayPublicHoliday(holidayCalendarUrl);
  if (publicHolidayName) {
    return { type: 'publicHoliday', name: publicHolidayName };
  }

  return false;
}

module.exports = { checkIfTodayIsOffDay };
