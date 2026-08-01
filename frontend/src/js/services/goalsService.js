/**
 * StudyFlow AI – Goals Service
 * --------------------------------
 * Owns all Goals + Subtasks data operations.
 * Backed by localStorage in mock mode; switches to REST API by flipping SF_CONFIG.USE_MOCK_API.
 *
 * Public API:
 *   goalsService.getGoals()                    → Promise<Goal[]>
 *   goalsService.createGoal(data)              → Promise<Goal>
 *   goalsService.updateGoal(goalId, patch)     → Promise<Goal>
 *   goalsService.deleteGoal(goalId)            → Promise<void>
 *   goalsService.toggleSubtask(gId, subId)     → Promise<Goal>
 */

window.goalsService = (function () {

  const LS_KEY = 'studyflow_goals';

  // ─── Local helpers ────────────────────────────────────────────────────────

  function _readLS() {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY) || 'null');
    } catch { return null; }
  }

  function _writeLS(goals) {
    localStorage.setItem(LS_KEY, JSON.stringify(goals));
  }

  async function _ensureSeed() {
    if (!window.SF_CONFIG?.USE_MOCK_API) return;
    if (!_readLS()) {
      const { SEED_GOALS = [] } = await window.SF_HTTP.loadMock('goals.mock.js');
      _writeLS(SEED_GOALS);
    }
  }

  function _recalcProgress(goal) {
    if (window.calculateGoalProgress) {
      goal.progress = window.calculateGoalProgress(goal);
    } else {
      const total = goal?.subtasks?.length || 0;
      const done = goal?.subtasks?.filter(s => s.completed)?.length || 0;
      goal.progress = total > 0 ? Math.round((done / total) * 100) : 0;
    }
    return goal;
  }

  function processDeadlineLocal(data) {
    if (data.deadline && typeof data.deadline === 'object') {
      const { mode, date, time, value, unit } = data.deadline;
      if (mode === 'NONE') {
        data.deadline = null;
        data.deadlineTime = null;
      } else if (mode === 'SPECIFIC_DATE') {
        data.deadline = date;
        data.deadlineTime = time || null;
      } else if (mode === 'DURATION') {
        const targetDate = new Date();
        if (unit === 'days') {
          targetDate.setDate(targetDate.getDate() + value);
        } else if (unit === 'weeks') {
          targetDate.setDate(targetDate.getDate() + (value * 7));
        } else if (unit === 'months') {
          targetDate.setMonth(targetDate.getMonth() + value);
        }
        const yyyy = targetDate.getFullYear();
        const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
        const dd = String(targetDate.getDate()).padStart(2, '0');
        data.deadline = `${yyyy}-${mm}-${dd}`;
        data.deadlineTime = null;
      }
    }
    return data;
  }

  // ─── Service Methods ──────────────────────────────────────────────────────

  async function getGoals() {
    await _ensureSeed();
    const data = _readLS() || [];
    return window.SF_HTTP.request('/goals', data);
  }

  async function createGoal(payload) {
    await _ensureSeed();
    const goals = _readLS() || [];
    const processedPayload = window.SF_CONFIG?.USE_MOCK_API ? processDeadlineLocal({ ...payload }) : { ...payload };

    const newGoal = {
      id: 'goal-' + Date.now(),
      urgency: 'ACTIVE',
      progress: 0,
      subtasks: [],
      ...processedPayload
    };
    if (window.SF_CONFIG?.USE_MOCK_API) {
      goals.unshift(newGoal);
      _writeLS(goals);
    }
    return window.SF_HTTP.request('/goals', newGoal, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  /**
   * Create a goal with auto-generated subtasks from a braindump string.
   * Mirrors the previous StudyFlowDB.createGoalWithSubtasks() API exactly.
   */
  async function createGoalWithSubtasks(title, urgency, description, deadlinePayload, rawDump) {
    let totalDays = 7;
    if (deadlinePayload?.mode === 'DURATION') {
      totalDays = deadlinePayload.value || 7;
      if (deadlinePayload.unit === 'weeks') totalDays *= 7;
      if (deadlinePayload.unit === 'months') totalDays *= 30; // Approx
    } else if (deadlinePayload?.mode === 'SPECIFIC_DATE' && deadlinePayload.date) {
      const ms = new Date(deadlinePayload.date) - new Date();
      totalDays = Math.max(1, Math.round(ms / 86400000));
    }

    let lines = rawDump
      ? rawDump.split('\n').map(l => l.replace(/^[-*•\d.]+\s*/, '').trim()).filter(Boolean)
      : [];

    if (lines.length === 0 && window.SF_CONFIG?.USE_MOCK_API) {
      const { DEFAULT_BRAINDUMP_STEPS = [] } = await window.SF_HTTP.loadMock('idealab.mock.js');
      lines = DEFAULT_BRAINDUMP_STEPS;
    } else if (lines.length === 0) {
      lines = ['Complete Milestone 1', 'Complete Milestone 2', 'Final Review'];
    }

    const priorities = ['High', 'High', 'Medium', 'Low'];
    const subtasks = lines.map((line, idx) => {
      const stepDays = Math.max(1, Math.round(((idx + 1) / lines.length) * totalDays));
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + stepDays);
      const yyyy = targetDate.getFullYear();
      const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
      const dd = String(targetDate.getDate()).padStart(2, '0');

      return {
        id: 'sub-' + Date.now() + '-' + idx,
        title: line,
        estimate: `Sprint ${idx + 1} • 1.5h`,
        priority: priorities[idx % priorities.length],
        deadline: `${yyyy}-${mm}-${dd}`,
        deadlineTime: null,
        completed: false,
        status: 'TODO'
      };
    });

    const payload = {
      title: title || 'New AI Academic Goal',
      urgency: urgency || 'ACTIVE',
      description: description || 'AI generated study plan with spaced backward deadline assignment.',
      deadline: deadlinePayload,
      rawDump // Send to backend for actual generation
    };

    if (window.SF_CONFIG?.USE_MOCK_API) {
      payload.subtasks = subtasks;
    }

    return createGoal(payload);
  }

  async function toggleSubtask(goalId, subtaskId, completedStatus) {
    await _ensureSeed();
    const storeGoals = window.SF_STORE?.getSlice('goals')?.items || [];
    const lsGoals = _readLS() || [];
    const goals = storeGoals.length > 0 ? storeGoals : lsGoals;
    const goal  = goals.find(g => g.id === goalId || g._id === goalId);
    if (!goal && window.SF_CONFIG?.USE_MOCK_API) return Promise.reject(new Error('Goal not found'));
    const sub = goal ? (goal.subtasks || []).find(s => s.id === subtaskId || s._id === subtaskId) : null;
    if (!sub && window.SF_CONFIG?.USE_MOCK_API)  return Promise.reject(new Error('Subtask not found'));
    const newCompleted = completedStatus !== undefined ? completedStatus : (sub ? !sub.completed : true);
    if (window.SF_CONFIG?.USE_MOCK_API && goal && sub) {
      sub.completed = newCompleted;
      _recalcProgress(goal);
      const lsIndex = lsGoals.findIndex(g => g.id === goalId || g._id === goalId);
      if (lsIndex !== -1) {
        lsGoals[lsIndex] = goal;
        _writeLS(lsGoals);
      }
    }
    return window.SF_HTTP.request(`/goals/${goalId}/subtasks/${subtaskId}/toggle`, goal || {}, {
      method: 'PATCH',
      body: JSON.stringify({ completed: newCompleted })
    });
  }

  async function updateGoal(goalId, patch) {
    await _ensureSeed();
    if (window.SF_CONFIG?.USE_MOCK_API) {
      const goals = _readLS() || [];
      const idx = goals.findIndex(g => g.id === goalId);
      if (idx !== -1) {
        const processedPatch = processDeadlineLocal({ ...patch });
        goals[idx] = { ...goals[idx], ...processedPatch };
        _recalcProgress(goals[idx]);
        _writeLS(goals);
        return window.SF_HTTP.request(`/goals/${goalId}`, goals[idx], {
          method: 'PATCH',
          body: JSON.stringify(patch)
        });
      }
    }
    return window.SF_HTTP.request(`/goals/${goalId}`, null, {
      method: 'PATCH',
      body: JSON.stringify(patch)
    });
  }

  async function deleteGoal(goalId) {
    await _ensureSeed();
    if (window.SF_CONFIG?.USE_MOCK_API) {
      let goals = _readLS() || [];
      goals = goals.filter(g => g.id !== goalId);
      _writeLS(goals);
    }
    return window.SF_HTTP.request(`/goals/${goalId}`, null, { method: 'DELETE' });
  }

  async function saveGoals(goals) {
    if (window.SF_CONFIG?.USE_MOCK_API) {
      _writeLS(goals);
    }
    return window.SF_HTTP.request('/goals/bulk', goals, {
      method: 'PUT',
      body: JSON.stringify(goals)
    });
  }

  return { getGoals, createGoal, createGoalWithSubtasks, updateGoal, toggleSubtask, deleteGoal, saveGoals };
})();
