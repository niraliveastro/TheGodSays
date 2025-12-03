/**
 * Date and Time Utility Functions for Astrology App
 * Handles conversion between different date formats used across the app
 */

/**
 * Parses DOB string into year, month, date integers
 * Handles both YYYY-MM-DD (HTML5 date input) and DD-MM-YYYY formats
 * @param {string} dobStr - Date string
 * @returns {object} { year, month, date } or throws error
 */
export function parseDateString(dobStr) {
  if (!dobStr) throw new Error("Date is required");

  const dobParts = String(dobStr).split("-").map((n) => parseInt(n, 10));
  let year, month, date;

  if (dobParts.length === 3) {
    if (dobParts[0] > 1900) {
      // YYYY-MM-DD format (HTML5 date input standard)
      [year, month, date] = dobParts;
    } else {
      // DD-MM-YYYY format (manual entry or legacy data)
      [date, month, year] = dobParts;
    }
  } else {
    throw new Error(
      `Invalid date format: ${dobStr}. Expected YYYY-MM-DD or DD-MM-YYYY`
    );
  }

  // Validate parsed values
  if (!year || !month || !date || Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(date)) {
    throw new Error(`Invalid date values from: ${dobStr}`);
  }
  if (year < 1900 || year > 2100)
    throw new Error(`Year must be between 1900 and 2100: ${year}`);
  if (month < 1 || month > 12)
    throw new Error(`Month must be between 1 and 12: ${month}`);
  if (date < 1 || date > 31)
    throw new Error(`Date must be between 1 and 31: ${date}`);

  return { year, month, date };
}

/**
 * Parses time string into hours, minutes, seconds
 * @param {string} timeStr - Time string in HH:MM or HH:MM:SS format
 * @returns {object} { hours, minutes, seconds } or throws error
 */
export function parseTimeString(timeStr) {
  if (!timeStr) throw new Error("Time is required");

  const timeParts = String(timeStr).split(":").map((n) => parseInt(n, 10));
  const [hours, minutes, seconds = 0] = timeParts;

  if (Number.isNaN(hours) || Number.isNaN(minutes) || Number.isNaN(seconds)) {
    throw new Error(
      `Invalid time format: ${timeStr}. Expected HH:MM or HH:MM:SS`
    );
  }
  if (hours < 0 || hours > 23)
    throw new Error(`Hours must be between 0 and 23: ${hours}`);
  if (minutes < 0 || minutes > 59)
    throw new Error(`Minutes must be between 0 and 59: ${minutes}`);
  if (seconds < 0 || seconds > 59)
    throw new Error(`Seconds must be between 0 and 59: ${seconds}`);

  return { hours, minutes, seconds };
}

/**
 * Formats date components into YYYY-MM-DD string
 * @param {number} year
 * @param {number} month
 * @param {number} date
 * @returns {string} YYYY-MM-DD formatted string
 */
export function formatDate(year, month, date) {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(
    2,
    "0"
  )}-${String(date).padStart(2, "0")}`;
}

/**
 * Formats time components into HH:MM:SS string
 * @param {number} hours
 * @param {number} minutes
 * @param {number} seconds
 * @returns {string} HH:MM:SS formatted string
 */
export function formatTime(hours, minutes, seconds = 0) {
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0"
  )}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Formats date string for display (locale-specific)
 * @param {string} dobStr - Date in YYYY-MM-DD or DD-MM-YYYY format
 * @returns {string} Localized date string
 */
export function formatDateForDisplay(dobStr) {
  try {
    const { year, month, date } = parseDateString(dobStr);
    const dateObj = new Date(year, month - 1, date);
    return dateObj.toLocaleDateString();
  } catch {
    return dobStr;
  }
}

/**
 * Validates and builds complete API payload
 * @param {string} dob - Date of birth
 * @param {string} tob - Time of birth
 * @param {object} coords - { latitude, longitude, label }
 * @param {number} timezone - Timezone offset in hours
 * @returns {object} Complete API payload
 */
export function buildAstrologyPayload(dob, tob, coords, timezone) {
  const { year, month, date } = parseDateString(dob);
  const { hours, minutes, seconds } = parseTimeString(tob);

  if (!Number.isFinite(coords.latitude) || !Number.isFinite(coords.longitude)) {
    throw new Error("Invalid coordinates");
  }

  if (!Number.isFinite(timezone)) {
    throw new Error("Invalid timezone");
  }

  return {
    year,
    month,
    date,
    hours,
    minutes,
    seconds,
    latitude: coords.latitude,
    longitude: coords.longitude,
    timezone,
    language: "en",
    config: {
      observation_point: "topocentric",
      ayanamsha: "lahiri",
      house_system: "Placidus",
      language: "en",
    },
  };
}

