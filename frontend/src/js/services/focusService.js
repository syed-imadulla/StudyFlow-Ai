/**
 * StudyFlow AI – Focus Service
 * --------------------------------
 * Owns active sprint task, sub-checklist, timer configuration, and AI suggestions.
 *
 * Public API:
 *   focusService.getActiveSprintTask()   → Promise<SprintTask>
 *   focusService.getTimerConfig()        → Promise<TimerConfig>
 *   focusService.getAISuggestion()       → Promise<{ message: string }>
 *   focusService.getWeeklyDistraction()  → Promise<DistractionData>
 *   
 *   // Session Lifecycle
 *   focusService.getActiveSession()      → Promise<FocusSession | null>
 *   focusService.startSession(payload)   → Promise<FocusSession>
 *   focusService.pauseSession(id)        → Promise<FocusSession>
 *   focusService.resumeSession(id)       → Promise<FocusSession>
 *   focusService.completeSession(id, patch) → Promise<FocusSession>
 *   focusService.abortSession(id)        → Promise<FocusSession>
 */

window.focusService = (function () {

  async function _getMocks() {
    if (!window.SF_CONFIG?.USE_MOCK_API) return {};
    return await window.SF_HTTP.loadMock('focus.mock.js');
  }

  // ─── Service Methods ──────────────────────────────────────────────────────

  /**
   * Returns the active sprint task by finding the first incomplete subtask
   * across all goals (or falls back to static mock when in mock mode).
   */
  async function getActiveSprintTask() {
    const { MOCK_SPRINT_TASK = null } = await _getMocks();
    if (window.SF_CONFIG?.USE_MOCK_API) {
      return window.SF_HTTP.request('/focus/sprint-task', MOCK_SPRINT_TASK);
    }
    const goals = window.SF_STORE?.getSlice('goals')?.items?.length
      ? window.SF_STORE.getSlice('goals').items
      : await window.goalsService.getGoals();
    const topGoal = goals[0];
    if (!topGoal) return null;
    const activeSub = topGoal.subtasks?.find(s => !s.completed);
    return window.SF_HTTP.request(`/focus/sprint-task?goalId=${topGoal.id}&subtaskId=${activeSub?.id}`, MOCK_SPRINT_TASK);
  }

  /**
   * Returns timer configuration, reading Pomodoro values from user settings.
   * Falls back to SF_CONFIG.POMODORO_DEFAULTS.
   */
  async function getTimerConfig() {
    const settings = await window.userService.getSettings();
    return {
      focus:      (settings.focus  ?? window.SF_CONFIG.POMODORO_DEFAULTS.focus)      * 60,
      shortBreak: (settings.short  ?? window.SF_CONFIG.POMODORO_DEFAULTS.shortBreak) * 60,
      longBreak:  (settings.long   ?? window.SF_CONFIG.POMODORO_DEFAULTS.longBreak)  * 60,
      sessionsBeforeLong: window.SF_CONFIG.POMODORO_DEFAULTS.sessionsBeforeLong
    };
  }

  async function getAISuggestion() {
    const { MOCK_AI_SUGGESTION = null } = await _getMocks();
    return window.SF_HTTP.request('/focus/ai-suggestion', MOCK_AI_SUGGESTION);
  }

  async function getWeeklyDistraction() {
    const { MOCK_WEEKLY_DISTRACTION = null } = await _getMocks();
    return window.SF_HTTP.request('/focus/distraction-history', MOCK_WEEKLY_DISTRACTION);
  }

  // ─── Session Lifecycle ────────────────────────────────────────────────────
  
  async function getActiveSession() {
    return window.SF_HTTP.request('/focus/active', null, 'GET');
  }

  async function startSession(payload) {
    return window.SF_HTTP.request('/focus/start', null, { method: 'POST', body: JSON.stringify(payload) });
  }

  async function pauseSession(id) {
    return window.SF_HTTP.request(`/focus/${id}/pause`, null, { method: 'POST' });
  }

  async function resumeSession(id) {
    return window.SF_HTTP.request(`/focus/${id}/resume`, null, { method: 'POST' });
  }

  async function completeSession(id, patch = {}) {
    return window.SF_HTTP.request(`/focus/${id}/complete`, null, { method: 'POST', body: JSON.stringify(patch) });
  }

  async function abortSession(id) {
    return window.SF_HTTP.request(`/focus/${id}/abort`, null, { method: 'POST' });
  }

  return { 
    getActiveSprintTask, 
    getTimerConfig, 
    getAISuggestion, 
    getWeeklyDistraction,
    getActiveSession,
    startSession,
    pauseSession,
    resumeSession,
    completeSession,
    abortSession
  };
})();
