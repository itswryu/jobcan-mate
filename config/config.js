require('dotenv').config();

module.exports = {
  sessionSecret: process.env.SESSION_SECRET || 'default-very-secret-key',
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID_PLACEHOLDER',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'YOUR_GOOGLE_CLIENT_SECRET_PLACEHOLDER',
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback',
  },
  database: {
    dialect: 'sqlite', // Added dialect
    storage: process.env.SQLITE_STORAGE_PATH || 'app_database.sqlite',
  },
  jobcan: {
    loginUrl: process.env.JOBCAN_LOGIN_URL || 'https://ssl.jobcan.jp/login/pc-employee',
    stampPageUrl: process.env.JOBCAN_STAMP_PAGE_URL || 'https://ssl.jobcan.jp/employee/', // Or specific stamp page
    usernameSelector: process.env.JOBCAN_USERNAME_SELECTOR || '#user_email',
    passwordSelector: process.env.JOBCAN_PASSWORD_SELECTOR || '#user_password',
    loginButtonSelector: process.env.JOBCAN_LOGIN_BUTTON_SELECTOR || 'input[type="submit"][name="commit"]',
    // This selector should uniquely identify a state after successful login, e.g., a welcome message or dashboard element
    loginSuccessIndicator: process.env.JOBCAN_LOGIN_SUCCESS_INDICATOR || '#header_employee_menu_current_user_name', // Example: User name display
    checkInButtonSelector: process.env.JOBCAN_CHECKIN_BUTTON_SELECTOR || '#adit-button-work-start',
    checkOutButtonSelector: process.env.JOBCAN_CHECKOUT_BUTTON_SELECTOR || '#adit-button-work-end',
    // This selector should confirm the stamp was successfully recorded. It might be a generic message or a specific UI change.
    stampSuccessIndicator: process.env.JOBCAN_STAMP_SUCCESS_INDICATOR || '.adit_item_name', // Example: "出勤" or "退勤" text appears
    // You might need more specific selectors if the "出勤" text is always present and you need to check for a success message popup.
    // For example, if a popup says "打刻しました", then that would be a better stampSuccessIndicator.
    // Consider adding selectors for error messages too, to provide better feedback.
    errorIndicator: process.env.JOBCAN_ERROR_INDICATOR || '.notice.alert.alert-danger', // General error message selector
  },
  playwright: {
    headless: process.env.PLAYWRIGHT_HEADLESS ? process.env.PLAYWRIGHT_HEADLESS.toLowerCase() === 'true' : true,
    navigationTimeout: parseInt(process.env.PLAYWRIGHT_NAVIGATION_TIMEOUT, 10) || 30000, // 30 seconds
    actionTimeout: parseInt(process.env.PLAYWRIGHT_ACTION_TIMEOUT, 10) || 15000, // 15 seconds
  },
  calendar: {
    cacheTtlHours: parseInt(process.env.CALENDAR_CACHE_TTL_HOURS, 10) || 4,
    fetchTimeoutMs: parseInt(process.env.ICS_FETCH_TIMEOUT_MS, 10) || 10000, // 10 seconds
    // Comma-separated keywords to identify leave events (case-insensitive)
    // Example: "휴가,연차,day off,vacation,공휴일,holiday"
    leaveKeywords: process.env.LEAVE_KEYWORDS || '휴가,연차,day off,vacation,holiday,leave,off', 
  },
  cors: {
    // Default to localhost for development if not set.
    // For production, this MUST be set to the actual frontend domain(s).
    allowedOrigins: (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000').split(',').map(o => o.trim()),
  },
  // Add other necessary configs as the project grows
};
