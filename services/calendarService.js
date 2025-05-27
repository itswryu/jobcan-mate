const axios = require('axios');
const ical = require('node-ical');
const { zonedTimeToUtc, utcToZonedTime, isWithinInterval, startOfDay, endOfDay, parseISO, addDays, subDays } = require('date-fns-tz');
const logger = require('../utils/logger');
const { UserSettings } = require('../database/setup');
const config = require('../config/config');

const calendarCache = new Map();
const CACHE_TTL_MS = (config.calendar.cacheTtlHours || 4) * 60 * 60 * 1000;
const LEAVE_KEYWORDS_ARRAY = (config.calendar.leaveKeywords || '')
  .toLowerCase()
  .split(',')
  .map(k => k.trim())
  .filter(k => k);

/**
 * Fetches ICS data from a given URL.
 * @param {string} url - The URL to fetch the ICS file from.
 * @returns {Promise<string|null>} The ICS data string or null on error.
 */
async function fetchICSFile(url) {
  try {
    logger.debug(`Fetching ICS file from URL: ${url}`);
    const response = await axios.get(url, { timeout: config.calendar.fetchTimeoutMs || 10000 });
    logger.debug(`ICS file fetched successfully from URL: ${url}`);
    return response.data;
  } catch (error) {
    logger.error(`Error fetching ICS file from URL ${url}: ${error.message}`, { stack: error.stack, code: error.code });
    return null;
  }
}

/**
 * Parses ICS data string into a structured array of events.
 * @param {string} icsData - The ICS data string.
 * @returns {Array|null} An array of event objects or null on error.
 */
function parseICSEvents(icsData) {
  try {
    const allEventsData = ical.parseICS(icsData);
    const events = [];
    for (const key in allEventsData) {
      if (allEventsData[key].type === 'VEVENT') {
        const event = allEventsData[key];
        const isAllDay = !event.start.toISOString().includes('T') || // Date only, no time component
                         (event.start.getHours() === 0 && event.start.getMinutes() === 0 && event.start.getSeconds() === 0 &&
                          event.end && event.end.getHours() === 0 && event.end.getMinutes() === 0 && event.end.getSeconds() === 0 &&
                          (new Date(event.end).getTime() - new Date(event.start).getTime()) % (24 * 60 * 60 * 1000) === 0);
        
        events.push({
          uid: event.uid,
          summary: event.summary?.val || event.summary || '', // Handle different summary structures
          start: new Date(event.start), // Ensure it's a Date object
          end: event.end ? new Date(event.end) : null, // Ensure it's a Date object or null
          rrule: event.rrule,
          isAllDay: isAllDay,
          // Store original dtstart/dtend if needed for specific rrule calculations, though node-ical usually handles timezone conversions.
          // dtstartOriginal: event.dtstart, 
          // dtendOriginal: event.dtend
        });
      }
    }
    logger.debug(`Parsed ${events.length} VEVENTs from ICS data.`);
    return events;
  } catch (error) {
    logger.error(`Error parsing ICS data: ${error.message}`, { stack: error.stack });
    return null;
  }
}


/**
 * Checks if a target date falls on a leave day based on provided events.
 * @param {Date} targetDateUserOriginal - The JavaScript Date object to check (in user's local time).
 * @param {Array} events - Array of parsed event objects.
 * @param {string} userTimezone - The IANA timezone string for the user.
 * @returns {boolean} True if the target date is a leave day, false otherwise.
 */
function isDateOnLeave(targetDateUserOriginal, events, userTimezone) {
  if (!userTimezone || typeof userTimezone !== 'string') {
    logger.warn(`Invalid or missing userTimezone: ${userTimezone}. Defaulting to UTC for date checks.`);
    userTimezone = 'UTC';
  }

  // Convert the target date (which is already a JS Date representing local time) to the user's timezone start of day
  const targetDayStartUserTz = startOfDay(utcToZonedTime(targetDateUserOriginal, userTimezone));
  const targetDayEndUserTz = endOfDay(targetDayStartUserTz); // This will be 23:59:59.999 in user's TZ

  logger.debug(`Checking leave for date: ${targetDateUserOriginal.toISOString()}, User TZ: ${userTimezone}. Range: ${targetDayStartUserTz.toISOString()} to ${targetDayEndUserTz.toISOString()}`);

  for (const event of events) {
    if (LEAVE_KEYWORDS_ARRAY.length > 0 && !LEAVE_KEYWORDS_ARRAY.some(keyword => (event.summary || '').toLowerCase().includes(keyword))) {
      continue; // Skip if keywords are defined and none match the event summary
    }

    let eventStartUserTz = utcToZonedTime(event.start, userTimezone);
    let eventEndUserTz = event.end ? utcToZonedTime(event.end, userTimezone) : eventStartUserTz; // If no end, treat as point in time

    if (event.isAllDay) {
      // For all-day events, node-ical often sets 'end' to the start of the next day.
      // We consider the event to cover the entire day of its start date in the user's timezone.
      const allDayEventStartUserTz = startOfDay(eventStartUserTz);
      // Check if targetDayStartUserTz is the same day as allDayEventStartUserTz
      if (allDayEventStartUserTz.getFullYear() === targetDayStartUserTz.getFullYear() &&
          allDayEventStartUserTz.getMonth() === targetDayStartUserTz.getMonth() &&
          allDayEventStartUserTz.getDate() === targetDayStartUserTz.getDate()) {
        logger.info(`Match (all-day event): ${event.summary} on ${allDayEventStartUserTz.toISOString().slice(0,10)} for target ${targetDayStartUserTz.toISOString().slice(0,10)}`);
        return true;
      }
    } else {
      // For timed events, check for overlap with the target day in user's timezone.
      // The interval for the target day is [targetDayStartUserTz, targetDayEndUserTz].
      // The interval for the event is [eventStartUserTz, eventEndUserTz].
      // Overlap condition: event starts before target day ends AND event ends after target day starts.
      if (eventStartUserTz < targetDayEndUserTz && eventEndUserTz > targetDayStartUserTz) {
        logger.info(`Match (timed event): ${event.summary} from ${eventStartUserTz.toISOString()} to ${eventEndUserTz.toISOString()} overlaps with target day ${targetDayStartUserTz.toISOString().slice(0,10)}`);
        return true;
      }
    }

    if (event.rrule) {
      // Define a window for recurrence checks to avoid infinite loops with no end date.
      // e.g., 1 month before and 2 months after the target date.
      const recurrenceWindowStart = subDays(targetDayStartUserTz, 31); 
      const recurrenceWindowEnd = addDays(targetDayStartUserTz, 62);
      
      try {
        const occurrences = event.rrule.between(recurrenceWindowStart, recurrenceWindowEnd);
        for (const occurrenceDate of occurrences) {
          let occurrenceStartUserTz = utcToZonedTime(occurrenceDate, userTimezone);
          let occurrenceEndUserTz;

          if (event.isAllDay) {
            const allDayOccurrenceStartUserTz = startOfDay(occurrenceStartUserTz);
             if (allDayOccurrenceStartUserTz.getFullYear() === targetDayStartUserTz.getFullYear() &&
                 allDayOccurrenceStartUserTz.getMonth() === targetDayStartUserTz.getMonth() &&
                 allDayOccurrenceStartUserTz.getDate() === targetDayStartUserTz.getDate()) {
              logger.info(`Match (recurring all-day): ${event.summary} on ${allDayOccurrenceStartUserTz.toISOString().slice(0,10)} for target ${targetDayStartUserTz.toISOString().slice(0,10)}`);
              return true;
            }
          } else {
            // Calculate duration of original event if it's not an all-day event
            const durationMs = event.end ? event.end.getTime() - event.start.getTime() : 0;
            occurrenceEndUserTz = new Date(occurrenceStartUserTz.getTime() + durationMs);
            
            if (occurrenceStartUserTz < targetDayEndUserTz && occurrenceEndUserTz > targetDayStartUserTz) {
              logger.info(`Match (recurring timed): ${event.summary} from ${occurrenceStartUserTz.toISOString()} to ${occurrenceEndUserTz.toISOString()} overlaps with target day ${targetDayStartUserTz.toISOString().slice(0,10)}`);
              return true;
            }
          }
        }
      } catch (rruleError) {
          logger.error(`Error processing rrule for event UID ${event.uid}: ${rruleError.message}`, {stack: rruleError.stack});
      }
    }
  }
  return false; // No leave found for the target date
}


/**
 * Main public function to check if a user is on leave for a given date.
 * Fetches and parses ICS data, uses caching, and then checks the date.
 * @param {string} userId - The UUID of the user.
 * @param {Date} targetDate - The JavaScript Date object to check (should represent the local date for the user).
 * @returns {Promise<boolean>} True if the user is on leave, false otherwise or on error.
 */
async function checkIfUserOnLeave(userId, targetDate) {
  logger.info(`Checking if user ${userId} is on leave for date: ${targetDate.toISOString().slice(0,10)}`);
  const settings = await UserSettings.findOne({ where: { userId } });

  if (!settings || !settings.annualLeaveCalendarUrl || !settings.isCalendarEnabled) { // Assuming isCalendarEnabled is a field in UserSettings
    logger.debug(`Calendar checks disabled or URL not set for userId: ${userId}. Reporting not on leave.`);
    return false; // Not on leave if calendar functionality is disabled or URL is missing
  }

  const cacheEntry = calendarCache.get(userId);
  let eventsToUse = null;

  if (cacheEntry && Date.now() < cacheEntry.expiry) {
    logger.debug(`Using cached calendar events for userId: ${userId}`);
    eventsToUse = cacheEntry.events;
  } else {
    logger.info(`No valid cache or cache expired for userId: ${userId}. Fetching new calendar data.`);
    const icsData = await fetchICSFile(settings.annualLeaveCalendarUrl);
    if (icsData) {
      const parsedEvents = parseICSEvents(icsData);
      if (parsedEvents) {
        calendarCache.set(userId, { events: parsedEvents, expiry: Date.now() + CACHE_TTL_MS });
        eventsToUse = parsedEvents;
        logger.info(`Calendar data fetched, parsed, and cached for userId: ${userId}. Events count: ${parsedEvents.length}`);
      } else {
        logger.warn(`Failed to parse ICS data for userId: ${userId}. Reporting not on leave.`);
        return false; // Error during parsing, assume not on leave
      }
    } else {
      logger.warn(`Failed to fetch ICS data for userId: ${userId}. Reporting not on leave.`);
      return false; // Error during fetch, assume not on leave
    }
  }

  if (!eventsToUse || eventsToUse.length === 0) {
    logger.debug(`No events to check against for userId: ${userId}. Reporting not on leave.`);
    return false;
  }

  try {
    const onLeave = isDateOnLeave(targetDate, eventsToUse, settings.timezone || 'Asia/Seoul');
    logger.info(`User ${userId} on leave status for ${targetDate.toISOString().slice(0,10)}: ${onLeave}`);
    return onLeave;
  } catch (error) {
    logger.error(`Error in isDateOnLeave for userId ${userId}: ${error.message}`, { stack: error.stack });
    return false; // Default to not on leave in case of unexpected error during date checking
  }
}

// Alias for backward compatibility if scheduleService is still using the old name
const isUserOnLeave = checkIfUserOnLeave; 

module.exports = {
  checkIfUserOnLeave,
  isUserOnLeave, // Exporting the alias too
};
