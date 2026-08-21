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
   * Resolves the active Focus context using local goal data.
   * If goalId/milestoneId are provided (Active Session), strictly resolves them or returns "context unavailable".
   * If omitted (Free Focus), falls back to the first incomplete subtask.
   */
  async function getActiveSprintTask(goalId = null, milestoneId = null, plannerId = null) {
    const { MOCK_SPRINT_TASK = null } = await _getMocks();
    
    // Ensure we have goals
    const goals = window.SF_STORE?.getSlice('goals')?.items?.length
      ? window.SF_STORE.getSlice('goals').items
      : await window.goalsService.getGoals();

    if (goalId) {
      // ACTIVE SESSION FOCUS
      const targetGoal = goals.find(g => g.id === goalId);
      
      if (!targetGoal) {
        // [SAFE UNAVAILABLE STATE]
        // Do NOT silently substitute another Goal if resolution fails.
        return {
          id: 'unavailable',
          title: 'Context Unavailable',
          goalTitle: 'Unknown Goal',
          milestone: 'N/A',
          urgency: 'low',
          checklist: []
        };
      }
      
      const targetSub = targetGoal.subtasks?.find(s => s.id === milestoneId) || targetGoal.subtasks?.[0];
      
      return {
        id: targetSub?.id || targetGoal.id,
        title: targetSub?.title || targetGoal.title,
        goalTitle: targetGoal.title,
        milestone: targetSub?.estimate || 'Sprint Task',
        urgency: targetGoal.status || 'normal',
        checklist: [
          { id: 'chk-1', text: `Review requirements for ${targetSub?.title || targetGoal.title}`, completed: targetSub?.completed || false },
          { id: 'chk-2', text: 'Execute core focus steps', completed: false },
          { id: 'chk-3', text: 'Verify output against deadline', completed: false }
        ]
      };
    }

    if (plannerId) {
      // ACTIVE SESSION FOCUS (Generic Planner Block context)
      const planners = window.SF_STORE?.getSlice('planner')?.plannerEvents || [];
      const todayStr = new Date().toLocaleDateString('en-CA');
      
      let plannerBlock = planners.find(p => p.id === `${plannerId}::${todayStr}`) 
                      || planners.find(p => p.id === plannerId)
                      || planners.find(p => p.id.startsWith(`${plannerId}::`));

      if (!plannerBlock) {
        return {
          id: 'unavailable',
          title: 'Context Unavailable',
          goalTitle: 'Unknown Planner Block',
          milestone: 'N/A',
          urgency: 'low',
          checklist: []
        };
      }
      return {
        id: plannerBlock.id,
        title: plannerBlock.title,
        goalTitle: 'Planner Task',
        milestone: 'Scheduled Block',
        urgency: 'normal',
        startTime: plannerBlock.startTime,
        endTime: plannerBlock.endTime,
        checklist: [
          { id: 'chk-1', text: `Execute scheduled block: ${plannerBlock.title}`, completed: false },
          { id: 'chk-2', text: 'Maintain deep focus', completed: false }
        ]
      };
    }

    // FREE FOCUS (Disabled as executable path)
    return null;
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
