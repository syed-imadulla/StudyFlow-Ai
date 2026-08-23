/**
 * StudyFlow AI – Global Configuration
 * ------------------------------------
 * USE_MOCK_API : true  → all services return async mock JSON (current default)
 *                false → all services call the real REST API at API_BASE_URL
 *
 * To connect a real backend later, set USE_MOCK_API = false and update API_BASE_URL.
 */

window.SF_CONFIG = {
  USE_MOCK_API: false,
  API_BASE_URL: 'http://localhost:5000/api/v1', // backend API URL
  REQUEST_TIMEOUT: 60000,                       // 60s request timeout for real LLM
  AUTH_TOKEN_KEY: 'accessToken',                // localStorage key for JWT access token

  // Default Pomodoro durations (seconds). Overridden by userService when user saves settings.
  POMODORO_DEFAULTS: {
    focus: 25,        // minutes
    shortBreak: 5,    // minutes
    longBreak: 15,    // minutes
    sessionsBeforeLong: 4
  },

  // App-wide feature flags
  FEATURES: {
    aiOptimizer: true,
    vibeAudio: false,   // audio not wired yet
    exportReport: false
  }
};
