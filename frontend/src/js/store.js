/**
 * StudyFlow AI – Centralized Application State Manager
 * =====================================================
 * Single source of truth for the entire application.
 *
 * Architecture
 * ────────────
 *  ┌─────────────────────────────────────────────┐
 *  │               SF_STORE (public)             │
 *  │  .state          – read-only snapshot        │
 *  │  .dispatch(type, payload) – trigger mutation │
 *  │  .subscribe(slice, fn)    – reactive updates │
 *  │  .getSlice(slice)         – get slice copy   │
 *  └────────────────────┬────────────────────────┘
 *                       │ reads/writes via
 *  ┌─────────────────────▼────────────────────────┐
 *  │            Services (SF_HTTP + LS)           │
 *  │  goalsService / userService / analyticsService│
 *  │  focusService / plannerService               │
 *  └─────────────────────────────────────────────┘
 *
 * State Slices
 * ────────────
 *  user       – profile + settings
 *  goals      – goal list + loading/error flags
 *  idealab    – active goal in IdeaLab + chat history
 *  planner    – daily blocks + weekly stats + monthly calendar
 *  analytics  – KPIs + chart datasets
 *  focus      – sprint task + timer state + distraction count
 *  settings   – Pomodoro config + AI persona + UI prefs
 *
 * Usage Examples
 * ──────────────
 *  // Read state (immutable snapshot)
 *  const goals = SF_STORE.getSlice('goals').items;
 *
 *  // Dispatch an action
 *  SF_STORE.dispatch('goals/TOGGLE_SUBTASK', { goalId, subtaskId });
 *
 *  // Subscribe to a slice
 *  SF_STORE.subscribe('goals', (goalsSlice) => renderGoals(goalsSlice.items));
 *
 *  // Bootstrap the store (call once at page load)
 *  await SF_STORE.bootstrap(['user', 'goals']);
 *
 * Pages should NEVER call localStorage directly.
 * Pages should NEVER call services directly — use SF_STORE.dispatch() instead.
 *
 * Persistence
 * ───────────
 *  The store persists slices marked persist:true via localStorage automatically.
 *  Keys used: studyflow_goals, studyflow_settings, studyflow_focus_sessions
 */

/**
 * Canonical Planner Date Resolver
 * Ensures Month, Week, and Daily views all extract the block date identically.
 */
window.getPlannerBlockDate = function(block) {
  if (!block) return null;
  if (block.date) return block.date;
  if (block.dateStr) return block.dateStr;
  
  if (block.startTime && typeof block.startTime === 'string' && block.startTime.includes('T')) {
    return block.startTime.split('T')[0];
  }
  
  return null;
};

let _focusAutosaveTimer = null;
let _isAutosaving = false;
let _needsAutosave = false;

async function _syncFocusSession() {
  const f = window.SF_STORE.getSlice('focus');
  if (!f.activeSessionId || f.sessionStatus === 'COMPLETED' || f.sessionStatus === 'ABORTED') {
    _needsAutosave = false;
    return;
  }
  
  if (_isAutosaving) {
    _needsAutosave = true;
    return;
  }

  _isAutosaving = true;
  _needsAutosave = false;
  
  try {
    await window.SF_HTTP.request(`/focus/${f.activeSessionId}`, null, {
      method: 'PATCH',
      body: JSON.stringify({
        notes: f.scratchpad,
        interruptions: f.distractionCount
      }),
      _silent: true
    });
    
    if (!_needsAutosave) {
      window.SF_STORE.dispatch('focus/SET_AUTOSAVE_STATUS', 'Auto-saved');
    }
  } catch (e) {
    if (!_needsAutosave) {
      window.SF_STORE.dispatch('focus/SET_AUTOSAVE_STATUS', 'Save failed');
    }
  } finally {
    _isAutosaving = false;
    if (_needsAutosave) {
      _triggerFocusAutosave();
    }
  }
}

function _triggerFocusAutosave() {
  if (_focusAutosaveTimer) clearTimeout(_focusAutosaveTimer);
  
  window.SF_STORE.dispatch('focus/SET_AUTOSAVE_STATUS', 'Saving...');
  
  if (_isAutosaving) {
    _needsAutosave = true;
    return;
  }
  
  _focusAutosaveTimer = setTimeout(_syncFocusSession, 2000);
}

/**
 * Universal helper to check if a milestone is scheduled
 * Uses the subtask status as the single source of truth.
 */
window.isMilestoneScheduled = function(goalId, milestoneId) {
  const goalsSlice = window.SF_STORE?.getSlice('goals');
  if (!goalsSlice || !goalsSlice.items) return false;
  
  const goal = goalsSlice.items.find(g => g.id === goalId);
  if (!goal) return false;
  
  const sub = goal.subtasks.find(s => s.id === milestoneId);
  return sub ? sub.status === 'SCHEDULED' : false;
};

window.SF_STORE = (function () {

  // ─── Internal State ─────────────────────────────────────────────────────────

  /**
   * Master state tree. All slices are nested here.
   * @type {Record<string, SliceState>}
   */
  const _state = {
    user: {
      profile:  null,   // { name, email, avatar, plan }
      loading:  false,
      error:    null
    },

    goals: {
      items:    [],     // Goal[]
      loading:  false,
      error:    null,
      lastSync: null
    },

    recommended: {
      goal:     null,   // The backend-recommended goal for the Hero Card
      loading:  false,
      error:    null,
      lastSync: null
    },

    idealab: {
      activeGoalId:    null,   // currently viewed goal in IdeaLab
      activeGoal:      null,   // full goal object
      chatHistory:     [],     // [{ role: 'ai'|'user', message: string, ts: number }]
      loading:         false,
      error:           null
    },

    planner: {
      selectedDate:      new Date().toLocaleDateString('en-CA'),
      selectedView:      'day',
      selectedRange:     { start: null, end: null },
      plannerEvents:     [],
      dailyBlocks:       [],
      weeklyStats:       null,
      monthlyCalendar:   null,
      upcomingDeadlines: [],
      kpiSnapshot:       null,
      loading:           false,
      error:             null
    },

    analytics: {
      kpis:               null,
      focusChartData:     null,
      velocityChartData:  null,
      weeklyComparison:   null,
      goalAllocation:     null,
      period:             'last7',
      loading:            false,
      error:              null
    },

    focus: {
      activeTask:         null,   // SprintTask from focusService
      activeSessionId:    null,   // Phase 3.1: Backend session ID
      sessionStatus:      null,   // IN_PROGRESS, PAUSED, etc.
      timerConfig:        null,   // { focus, shortBreak, longBreak, sessionsBeforeLong }
      timerRemaining:     1500,   // seconds
      timerTotal:         1500,   // seconds
      isRunning:          false,
      currentSession:     1,
      distractionCount:   0,
      sessionLog:         [],     // [{ date, duration, taskId }]
      aiSuggestion:       null,
      weeklyDistraction:  null,
      loading:            false,
      error:              null,
      activeDuration:     0,
      scratchpad:         '',
      autosaveStatus:     'Auto-saved'
    },

    settings: {
      focus:    25,
      short:    5,
      long:     15,
      persona:  'Direct & Analytical',
      name:     'Imadulla',
      email:    'imadulla@university.edu',
      avatar:   'https://ui-avatars.com/api/?name=Imadulla&background=A855F7&color=fff&rounded=true',
      loaded:   false
    }
  };

  // ─── Subscriber Registry ───────────────────────────────────────────────────
  // Map<sliceName, Set<callback>>
  const _subscribers = new Map();

  // ─── Internal Helpers ──────────────────────────────────────────────────────

  /** Deep clone to prevent external mutation of internal state */
  function _clone(obj) {
    try { return structuredClone(obj); } catch { return JSON.parse(JSON.stringify(obj)); }
  }

  function _syncFocusTaskFromGoals(items) {
    if (!items || !Array.isArray(items) || items.length === 0) {
      if (_state.focus && _state.focus.activeTask) {
        _state.focus.activeTask = null;
        _notify('focus');
      }
      return;
    }
    const topGoal = items[0];
    if (!topGoal) return;
    const activeSub = topGoal.subtasks?.find(s => !s.completed) || topGoal.subtasks?.[0];
    if (_state.focus) {
      _state.focus.activeTask = {
        id: activeSub?.id || activeSub?._id || 'sub-1',
        title: activeSub?.title || activeSub?.text || topGoal.title,
        goalTitle: topGoal.title,
        milestone: topGoal.deadlineInfo?.label ?? 'Active Sprint',
        urgency: topGoal.lifecycle?.status ?? topGoal.urgency ?? 'ACTIVE',
        goalId: topGoal.id,
        checklist: (topGoal.subtasks || []).map(s => ({
          id: s.id || s._id,
          text: s.title || s.text || s.description || 'Subtask',
          completed: !!s.completed
        }))
      };
      _notify('focus');
    }
  }

  /** Merge patch into a slice and notify subscribers */
  function _patch(sliceName, patch) {
    Object.assign(_state[sliceName], patch);
    _notify(sliceName);
    if (sliceName === 'goals' && patch && patch.items) {
      _syncFocusTaskFromGoals(patch.items);
    }
  }

  /** Fire all subscribers registered for sliceName */
  function _notify(sliceName) {
    const subs = _subscribers.get(sliceName);
    if (!subs) return;
    const snapshot = _clone(_state[sliceName]);
    subs.forEach(fn => {
      try { fn(snapshot, sliceName); }
      catch (e) { console.error(`[SF_STORE] Subscriber error on slice "${sliceName}":`, e); }
    });
  }

  function _deriveDailyBlocks(events, dateStr) {
    if (!events || !Array.isArray(events)) return [];
    return events.filter(e => {
      const eDate = window.getPlannerBlockDate(e);
      return eDate === dateStr;
    });
  }

  // ─── Action Handlers ────────────────────────────────────────────────────────

  const _handlers = {

    // ── User ────────────────────────────────────────────────────────────────

    async 'user/LOAD'() {
      _patch('user', { loading: true, error: null });
      try {
        const [profile, settings] = await Promise.all([
          window.userService.getProfile(),
          window.userService.getSettings()
        ]);
        if (!profile && window.SF_CONFIG && !window.SF_CONFIG.USE_MOCK_API) {
          window.location.replace('login.html');
          return;
        }
        _patch('user', { profile, loading: false });
        _patch('settings', { ...settings, loaded: true });
      } catch (e) {
        _patch('user', { loading: false, error: e.message });
        console.error('[SF_STORE] user/LOAD failed:', e);
        if (window.SF_CONFIG && !window.SF_CONFIG.USE_MOCK_API) {
          window.location.replace('login.html');
        }
      }
    },

    async 'user/SAVE_SETTINGS'(payload) {
      try {
        const saved = await window.userService.saveSettings(payload);
        _patch('settings', { ...saved, loaded: true });
        // Keep user profile in sync
        _patch('user', { profile: { ..._state.user.profile, ...payload } });
      } catch (e) {
        console.error('[SF_STORE] user/SAVE_SETTINGS failed:', e);
        throw e;
      }
    },

    // ── Goals ───────────────────────────────────────────────────────────────

    async 'goals/LOAD'() {
      _patch('goals', { loading: true, error: null });
      try {
        const items = await window.goalsService.getGoals();
        _patch('goals', { items, loading: false, lastSync: Date.now() });
      } catch (e) {
        _patch('goals', { loading: false, error: e.message });
        console.error('[SF_STORE] goals/LOAD failed:', e);
      }
    },

    async 'goals/LOAD_RECOMMENDED'() {
      _patch('recommended', { loading: true, error: null });
      try {
        const data = await window.goalsService.getRecommendedGoal();
        // Backend returns { goal, reason, strategy, strategyVersion }
        // data.goal is the recommended goal; data.reason is a human-readable explanation
        const goal = data?.goal ?? null;
        const reason = data?.reason ?? null;
        const strategy = data?.strategy ?? null;
        _patch('recommended', { goal, reason, strategy, loading: false, lastSync: Date.now() });
      } catch (e) {
        _patch('recommended', { loading: false, error: e.message });
        console.error('[SF_STORE] goals/LOAD_RECOMMENDED failed:', e);
      }
    },

    async 'goals/CREATE'(payload) {
      try {
        const newGoal = await window.goalsService.createGoal(payload);
        const items = [newGoal, ..._state.goals.items];
        _patch('goals', { items, lastSync: Date.now() });
        return newGoal;
      } catch (e) {
        console.error('[SF_STORE] goals/CREATE failed:', e);
        throw e;
      }
    },

    async 'goals/CREATE_WITH_SUBTASKS'(payload) {
      const { title, description, deadline, rawDump } = payload;
      try {
        const newGoal = await window.goalsService.createGoalWithSubtasks(
          title, description, deadline, rawDump
        );
        const items = [newGoal, ..._state.goals.items];
        _patch('goals', { items, lastSync: Date.now() });
        return newGoal;
      } catch (e) {
        console.error('[SF_STORE] goals/CREATE_WITH_SUBTASKS failed:', e);
        throw e;
      }
    },

    async 'goals/UPDATE'(payload) {
      const { goalId, patch } = payload;
      try {
        const oldGoal = _state.goals.items.find(g => g.id === goalId || g._id === goalId);
        const updatedGoal = await window.goalsService.updateGoal(goalId, patch);
        const items = _state.goals.items.map(g => g.id === goalId ? { ...g, ...updatedGoal } : g);
        _patch('goals', { items, lastSync: Date.now() });
        if (_state.idealab.activeGoalId === goalId) {
          _patch('idealab', { activeGoal: _clone(updatedGoal) });
        }

        // Completion transition check
        if (oldGoal && !oldGoal.completed && updatedGoal.completed) {
          if (window.CompletionEvents && typeof window.CompletionEvents.emitGoalCompleted === 'function') {
            window.CompletionEvents.emitGoalCompleted(updatedGoal);
          }
        }
        return updatedGoal;
      } catch (e) {
        console.error('[SF_STORE] goals/UPDATE failed:', e);
        throw e;
      }
    },

    async 'goals/TOGGLE_SUBTASK'(payload) {
      const { goalId, subtaskId, completed } = payload;
      try {
        const oldGoal = _state.goals.items.find(g => g.id === goalId || g._id === goalId);
        
        const updatedGoal = await window.goalsService.toggleSubtask(goalId, subtaskId, completed);
        if (!updatedGoal) return null;
        
        const targetId = updatedGoal.id || updatedGoal._id || goalId;
        const items = _state.goals.items.map(goal =>
          (goal.id === targetId || goal._id === targetId)
            ? updatedGoal
            : goal
        );
        _patch('goals', { items, lastSync: Date.now() });

        if (_state.idealab.activeGoalId === targetId) {
          _patch('idealab', { activeGoal: _clone(updatedGoal) });
        }

        // Completion transition check
        if (oldGoal && !oldGoal.completed && updatedGoal.completed) {
          if (window.CompletionEvents && typeof window.CompletionEvents.emitGoalCompleted === 'function') {
            window.CompletionEvents.emitGoalCompleted(updatedGoal);
          }
        }

        return updatedGoal;
      } catch (e) {
        console.error('[SF_STORE] goals/TOGGLE_SUBTASK failed:', e);
        throw e;
      }
    },

    async 'goals/DELETE'(payload) {
      const { goalId } = payload;
      try {
        await window.goalsService.deleteGoal(goalId);
        const items = _state.goals.items.filter(g => g.id !== goalId);
        _patch('goals', { items, lastSync: Date.now() });
        if (_state.idealab.activeGoalId === goalId) {
          _patch('idealab', { activeGoalId: null, activeGoal: null });
        }
        return true;
      } catch (e) {
        console.error('[SF_STORE] goals/DELETE failed:', e);
        throw e;
      }
    },

    // ── IdeaLab ─────────────────────────────────────────────────────────────

    async 'idealab/OPEN_GOAL'(payload) {
      const { goalId } = payload;
      _patch('idealab', { loading: true, error: null, activeGoalId: goalId });
      try {
        let goals = _state.goals.items;
        if (!goals.length) {
          goals = await window.goalsService.getGoals();
          _patch('goals', { items: goals, lastSync: Date.now() });
        }
        const activeGoal = goals.find(g => g.id === goalId) || null;
        _patch('idealab', { activeGoal, loading: false });
      } catch (e) {
        _patch('idealab', { loading: false, error: e.message });
      }
    },

    'idealab/ADD_CHAT'(payload) {
      const { role, message } = payload;
      const entry = { role, message, ts: Date.now() };
      const chatHistory = [..._state.idealab.chatHistory, entry];
      _patch('idealab', { chatHistory });
    },

    'idealab/CLEAR_CHAT'() {
      _patch('idealab', { chatHistory: [] });
    },

    // ── Planner ─────────────────────────────────────────────────────────────

    'planner/SELECT_DATE'(payload) {
      const dateStr = typeof payload === 'string' ? payload : payload?.date || payload;
      if (dateStr) {
        _patch('planner', { selectedDate: dateStr });
      }
    },

    'planner/SET_SELECTED_DATE'(payload) {
      const dateStr = typeof payload === 'string' ? payload : payload?.date || payload;
      if (dateStr) {
        _patch('planner', { selectedDate: dateStr });
      }
    },

    async 'planner/LOAD'(payload) {
      const dateStr = payload?.date || _state.planner.selectedDate || new Date().toLocaleDateString('en-CA');
      const isDateChangeOnly = payload && payload.date && payload.date !== _state.planner.selectedDate && _state.planner.weeklyStats !== null;
      
      if (payload?.date) {
        _patch('planner', { loading: true, error: null, selectedDate: dateStr, selectedView: 'day' });
      } else {
        _patch('planner', { loading: true, error: null });
      }
      try {
        if (isDateChangeOnly) {
          const dailyBlocks = await window.plannerService.getDailyBlocks(dateStr);
          _patch('planner', { plannerEvents: dailyBlocks, dailyBlocks, loading: false });
        } else {
          const [dailyBlocks, weeklyStats, monthlyCalendar, upcomingDeadlines] = await Promise.all([
            window.plannerService.getDailyBlocks(dateStr),
            window.plannerService.getWeeklyStats(),
            window.plannerService.getMonthlyCalendar(),
            window.plannerService.getUpcomingDeadlines()
          ]);
          _patch('planner', { plannerEvents: dailyBlocks, dailyBlocks, weeklyStats, monthlyCalendar, upcomingDeadlines, loading: false });
        }
      } catch (e) {
        _patch('planner', { loading: false, error: e.message });
        console.error('[SF_STORE] planner/LOAD failed:', e);
      }
    },

    async 'planner/LOAD_RANGE'(payload) {
      const { start, end, view = _state.planner.selectedView || 'day' } = payload || {};
      const dateStr = payload?.date || _state.planner.selectedDate || new Date().toLocaleDateString('en-CA');
      
      const loadRangePatch = { loading: true, error: null, selectedView: view, selectedRange: { start, end } };
      if (payload?.date) loadRangePatch.selectedDate = payload.date;
      _patch('planner', loadRangePatch);
      try {
        const events = await window.plannerService.getEventsByRange(start, end);
        const dailyBlocks = _deriveDailyBlocks(events, dateStr);
        _patch('planner', { plannerEvents: events, dailyBlocks, loading: false });
      } catch (e) {
        _patch('planner', { loading: false, error: e.message });
      }
    },

    async 'planner/SCHEDULE_MILESTONE'(payload) {
      try {
        const result = await window.plannerService.scheduleMilestone(payload);
        
        const activeView = _state.planner.selectedView || (typeof document !== 'undefined' && document.getElementById('weeklyView') && !document.getElementById('weeklyView').classList.contains('hidden') ? 'weekly' : 'day');
        if (activeView === 'weekly' || activeView === 'monthly' || (_state.planner.selectedRange?.start && _state.planner.selectedRange?.end)) {
          let start = _state.planner.selectedRange?.start;
          let end = _state.planner.selectedRange?.end;
          if (!start || !end) {
            const baseDate = new Date(_state.planner.selectedDate || new Date());
            const dayNum = baseDate.getDay();
            const diffToMon = dayNum === 0 ? -6 : 1 - dayNum;
            const mon = new Date(baseDate);
            mon.setDate(baseDate.getDate() + diffToMon);
            const sun = new Date(mon);
            sun.setDate(sun.getDate() + 6);
            start = mon.toLocaleDateString('en-CA');
            end = sun.toLocaleDateString('en-CA');
          }
          await dispatch('planner/LOAD_RANGE', { start, end, view: activeView });
        } else {
          await dispatch('planner/LOAD', { date: _state.planner.selectedDate });
        }

        // Update local goal state without a full reload
        const goalsSlice = SF_STORE.getSlice('goals');
        if (goalsSlice && goalsSlice.items) {
          const goal = goalsSlice.items.find(g => g.id === payload.goalId);
          if (goal) {
            const sub = goal.subtasks.find(s => s.id === payload.milestoneId);
            if (sub) {
              sub.status = 'SCHEDULED';
              _patch('goals', { items: goalsSlice.items });
            }
          }
        }

        return result;
      } catch (e) {
        console.error('[SF_STORE] planner/SCHEDULE_MILESTONE failed:', e);
        throw e;
      }
    },

    async 'planner/CREATE'(payload) {
      try {
        const newBlock = await window.plannerService.createBlock(payload);
        if (newBlock && !newBlock.id && !newBlock._id) {
          const genId = payload?.id || payload?._id || ('blk-' + Date.now());
          newBlock.id = genId;
          newBlock._id = genId;
        }
        const blockToAdd = newBlock || payload;
        const currentEvents = [...(_state.planner.plannerEvents || []), blockToAdd];
        const currentDaily = [...(_state.planner.dailyBlocks || []), blockToAdd];
        _patch('planner', { plannerEvents: currentEvents, dailyBlocks: currentDaily });

        const activeView = _state.planner.selectedView || (typeof document !== 'undefined' && document.getElementById('weeklyView') && !document.getElementById('weeklyView').classList.contains('hidden') ? 'weekly' : 'day');
        if (activeView === 'weekly' || activeView === 'monthly' || (_state.planner.selectedRange?.start && _state.planner.selectedRange?.end)) {
          let start = _state.planner.selectedRange?.start;
          let end = _state.planner.selectedRange?.end;
          if (!start || !end) {
            const baseDate = new Date(_state.planner.selectedDate || new Date());
            const dayNum = baseDate.getDay();
            const diffToMon = dayNum === 0 ? -6 : 1 - dayNum;
            const mon = new Date(baseDate);
            mon.setDate(baseDate.getDate() + diffToMon);
            const sun = new Date(mon);
            sun.setDate(sun.getDate() + 6);
            start = mon.toLocaleDateString('en-CA');
            end = sun.toLocaleDateString('en-CA');
          }
          await dispatch('planner/LOAD_RANGE', { start, end, view: activeView });
        } else {
          await dispatch('planner/LOAD', { date: _state.planner.selectedDate });
        }
        // Ensure the new block remains present if LOAD/LOAD_RANGE did not return it yet
        const afterEvents = _state.planner.plannerEvents || [];
        if (blockToAdd && (blockToAdd.id || blockToAdd._id) && !afterEvents.some(b => (b.id && b.id === blockToAdd.id) || (b._id && b._id === blockToAdd._id))) {
          _patch('planner', {
            plannerEvents: [...afterEvents, blockToAdd],
            dailyBlocks: [...(_state.planner.dailyBlocks || []), blockToAdd]
          });
        }
        return newBlock;
      } catch (e) {
        console.error('[SF_STORE] planner/CREATE failed:', e);
        throw e;
      }
    },

    async 'planner/UPDATE'(payload) {
      const { blockId, id, patch } = payload;
      const targetId = blockId || id;
      try {
        const updatedBlock = await window.plannerService.updateBlock(targetId, patch);
        const activeView = _state.planner.selectedView || (typeof document !== 'undefined' && document.getElementById('weeklyView') && !document.getElementById('weeklyView').classList.contains('hidden') ? 'weekly' : 'day');
        if (activeView === 'weekly' || activeView === 'monthly' || (_state.planner.selectedRange?.start && _state.planner.selectedRange?.end)) {
          let start = _state.planner.selectedRange?.start;
          let end = _state.planner.selectedRange?.end;
          if (!start || !end) {
            const baseDate = new Date(_state.planner.selectedDate || new Date());
            const dayNum = baseDate.getDay();
            const diffToMon = dayNum === 0 ? -6 : 1 - dayNum;
            const mon = new Date(baseDate);
            mon.setDate(baseDate.getDate() + diffToMon);
            const sun = new Date(mon);
            sun.setDate(sun.getDate() + 6);
            start = mon.toLocaleDateString('en-CA');
            end = sun.toLocaleDateString('en-CA');
          }
          await dispatch('planner/LOAD_RANGE', { start, end, view: activeView });
        } else {
          await dispatch('planner/LOAD', { date: _state.planner.selectedDate });
        }
        
        // Refresh Goals and Analytics if the block completion changed
        if (patch.completed !== undefined) {
          await dispatch('goals/LOAD');
          await dispatch('analytics/LOAD');
        }
        
        return updatedBlock;
      } catch (e) {
        console.error('[SF_STORE] planner/UPDATE failed:', e);
        throw e;
      }
    },

    async 'planner/DELETE'(payload) {
      const { blockId, id, editScope, exDate, seriesId } = payload;
      const targetId = blockId || id;
      try {
        await window.plannerService.deleteBlock(targetId, { editScope, exDate, seriesId });
        const activeView = _state.planner.selectedView || (typeof document !== 'undefined' && document.getElementById('weeklyView') && !document.getElementById('weeklyView').classList.contains('hidden') ? 'weekly' : 'day');
        if (activeView === 'weekly' || activeView === 'monthly' || (_state.planner.selectedRange?.start && _state.planner.selectedRange?.end)) {
          let start = _state.planner.selectedRange?.start;
          let end = _state.planner.selectedRange?.end;
          if (!start || !end) {
            const baseDate = new Date(_state.planner.selectedDate || new Date());
            const dayNum = baseDate.getDay();
            const diffToMon = dayNum === 0 ? -6 : 1 - dayNum;
            const mon = new Date(baseDate);
            mon.setDate(baseDate.getDate() + diffToMon);
            const sun = new Date(mon);
            sun.setDate(sun.getDate() + 6);
            start = mon.toLocaleDateString('en-CA');
            end = sun.toLocaleDateString('en-CA');
          }
          await dispatch('planner/LOAD_RANGE', { start, end, view: activeView });
        } else {
          await dispatch('planner/LOAD', { date: _state.planner.selectedDate });
        }
        
        // Refresh Goals and Analytics to reflect milestone unscheduling
        await dispatch('goals/LOAD');
        await dispatch('analytics/LOAD');
        
        return true;
      } catch (e) {
        console.error('[SF_STORE] planner/DELETE failed:', e);
        throw e;
      }
    },

    // ── Analytics ───────────────────────────────────────────────────────────

    async 'analytics/LOAD'(payload) {
      const period = payload?.period || _state.analytics.period;
      _patch('analytics', { loading: true, error: null, period });
      try {
        const [kpis, focusChartData, velocityChartData, weeklyComparison, goalAllocation] = await Promise.all([
          window.analyticsService.getKPIs(period),
          window.analyticsService.getFocusChartData(period),
          window.analyticsService.getVelocityChartData(period),
          window.analyticsService.getWeeklyComparisonData(),
          window.analyticsService.getGoalAllocationData()
        ]);
        _patch('analytics', { kpis, focusChartData, velocityChartData, weeklyComparison, goalAllocation, loading: false });
      } catch (e) {
        _patch('analytics', { loading: false, error: e.message });
        console.error('[SF_STORE] analytics/LOAD failed:', e);
      }
    },

    'analytics/SET_PERIOD'(payload) {
      _patch('analytics', { period: payload.period });
      // Re-load analytics data with new period
      _handlers['analytics/LOAD']({ period: payload.period });
    },

    // ── Focus Sessions ────────────────────────────────────────────────────────

    async 'focus/LOAD'() {
      _patch('focus', { loading: true, error: null });
      try {
        // 1. Fetch active session first to determine context
        const activeSession = await window.focusService.getActiveSession();
        
        // 1.5. Ensure planner data is loaded if we need it for context
        if (activeSession?.plannerId && (!_state.planner.plannerEvents || _state.planner.plannerEvents.length === 0)) {
          await _handlers['planner/LOAD']({ date: new Date().toLocaleDateString('en-CA') });
        }
        
        // 2. Fetch active task strictly based on session context (or null for free focus)
        const activeTaskPromise = window.focusService.getActiveSprintTask(
          activeSession?.goalId || null,
          activeSession?.milestoneId || null,
          activeSession?.plannerId || null
        );

        const [activeTask, timerConfig, aiSuggestion, weeklyDistraction] = await Promise.all([
          activeTaskPromise,
          window.focusService.getTimerConfig(),
          window.focusService.getAISuggestion(),
          window.focusService.getWeeklyDistraction()
        ]);
        
        const focusPatch = {
          activeTask,
          timerConfig,
          aiSuggestion,
          weeklyDistraction,
          loading: false
        };
        
        if (activeSession) {
          const sessionId = String(activeSession._id || activeSession.id);
          focusPatch.activeSessionId = sessionId;
          focusPatch.sessionStatus = activeSession.status;
          focusPatch.isRunning = activeSession.status === 'IN_PROGRESS';
          focusPatch.distractionCount = activeSession.interruptions || 0;
          focusPatch.scratchpad = activeSession.notes || '';
          
          // Backend authoritative duration
          let activeDuration = 0;
          if (activeSession.startTime) {
             const now = new Date();
             const start = new Date(activeSession.startTime);
             const totalElapsed = Math.floor((now.getTime() - start.getTime()) / 1000);
             let paused = activeSession.totalPausedTime || 0;
             if (activeSession.status === 'PAUSED' && activeSession.lastPausedAt) {
               paused += Math.floor((now.getTime() - new Date(activeSession.lastPausedAt).getTime()) / 1000);
             }
             activeDuration = Math.max(0, totalElapsed - paused);
          }
          focusPatch.activeDuration = activeDuration;
          
          // F3 FIX: Restore localLastPausedAt from the backend's authoritative lastPausedAt.
          // This ensures that after a page reload while paused, RESUME_SESSION can correctly
          // shift intervalStartTime by the full pause duration (including the reloaded gap),
          // so the frontend interval does not incorrectly consume reload time as active time.
          focusPatch.localLastPausedAt = (activeSession.status === 'PAUSED' && activeSession.lastPausedAt)
            ? new Date(activeSession.lastPausedAt).getTime()
            : null;

          // Recover session-scoped persistence
          const storageKey = `sf_focus_timer_mode_${sessionId}`;

          // F4 FIX: Safely parse localStorage — malformed JSON must not crash focus/LOAD.
          // After parsing, validate mode and seconds so stale/invalid prefs are ignored.
          let timerPref = null;
          try {
            const _rawPref = localStorage.getItem(storageKey);
            if (_rawPref) timerPref = JSON.parse(_rawPref);
          } catch (_parseErr) {
            timerPref = null; // Malformed JSON — silently fall back to defaults
          }
          const _VALID_FOCUS_MODES = new Set(['pomodoro', 'deepfocus', 'tasksprint', 'timeblock', 'flow', 'stopwatch']);
          if (timerPref && (
            timerPref.sessionId !== sessionId ||
            !_VALID_FOCUS_MODES.has(timerPref.mode) ||
            typeof timerPref.seconds !== 'number' ||
            timerPref.seconds < 0
          )) {
            timerPref = null; // Invalid/stale pref — discard and use defaults
          }

          let initialMode = 'timeblock';
          let initialText = '🗓️ Time Block';
          let initialTotal = 0;
          let initialIsStopwatch = false;
          let intervalStartTime = Date.now();
          
          if (timerPref) {
            initialMode = timerPref.mode;
            initialText = timerPref.text;
            initialTotal = timerPref.seconds;
            initialIsStopwatch = timerPref.isStopwatch || false;
            intervalStartTime = timerPref.intervalStartTime || Date.now();
          } else {
            // New session default setup
            if (!activeSession.plannerId) {
               initialMode = 'pomodoro';
               initialText = '🍅 Pomodoro';
               initialTotal = 1500;
               initialIsStopwatch = false;
            }
            // Save this new default so it's persisted correctly
            localStorage.setItem(storageKey, JSON.stringify({
              mode: initialMode,
              text: initialText,
              seconds: initialTotal,
              isStopwatch: initialIsStopwatch,
              intervalStartTime: intervalStartTime,
              sessionId: sessionId
            }));
          }

          focusPatch.timerMode = initialMode;
          focusPatch.timerModeText = initialText;
          focusPatch.timerTotal = initialTotal;
          focusPatch.isStopwatch = initialIsStopwatch;
          focusPatch.intervalStartTime = intervalStartTime;
          
          if (initialMode === 'timeblock' && activeTask?.endTime) {
            const endTime = new Date(activeTask.endTime).getTime();
            const startTime = new Date(activeTask.startTime).getTime();
            focusPatch.timerTotal = Math.max(0, Math.floor((endTime - startTime) / 1000));
            focusPatch.timerRemaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
          } else if (initialMode === 'stopwatch' || initialMode === 'flow') {
            focusPatch.timerRemaining = 0; // Visual logic handles count-up using activeDuration
          } else {
            // Fixed-duration logic
            let elapsedInterval = 0;
            if (activeSession.status === 'PAUSED' && activeSession.lastPausedAt) {
              // Time elapsed until the moment it was paused
              elapsedInterval = Math.floor((new Date(activeSession.lastPausedAt).getTime() - intervalStartTime) / 1000);
            } else {
              elapsedInterval = Math.floor((Date.now() - intervalStartTime) / 1000);
            }
            focusPatch.timerRemaining = Math.max(0, initialTotal - elapsedInterval);
          }
        } else {
          focusPatch.activeSessionId = null;
          focusPatch.sessionStatus = null;
          focusPatch.distractionCount = 0;
          focusPatch.scratchpad = '';
          focusPatch.autosaveStatus = 'Auto-saved';
          
          // For null session, fallback to global defaults but don't save to session-specific storage
          focusPatch.timerTotal = timerConfig?.focus || 1500;
          focusPatch.timerModeText = '🍅 Pomodoro';
          focusPatch.timerMode = 'pomodoro';
          focusPatch.isStopwatch = false;
          focusPatch.intervalStartTime = Date.now();
          focusPatch.timerRemaining = focusPatch.timerTotal;
          focusPatch.activeDuration = 0;
          focusPatch.isRunning = false;
        }
        
        _patch('focus', focusPatch);
      } catch (e) {
        _patch('focus', { loading: false, error: e.message });
        console.error('[SF_STORE] focus/LOAD failed:', e);
      }
    },

    async 'focus/START_SESSION'(actionPayload = null) {
      if (_state.focus.activeSessionId) return; // Already active
      
      const payload = actionPayload || {};
      
      if (!payload.plannerId) {
        throw new Error('Focus sessions must be started from a scheduled Planner item.');
      }

      
      // Ensure startTime exists
      if (!payload.startTime) payload.startTime = new Date().toISOString();
      
      try {
        const session = await window.focusService.startSession(payload);
        _patch('focus', {
          activeSessionId: session._id || session.id,
          sessionStatus: session.status,
          isRunning: true
        });
      } catch (e) {
        console.error('[SF_STORE] focus/START_SESSION failed:', e);
        throw e;
      }
    },

    async 'focus/PAUSE_SESSION'() {
      const sessionId = _state.focus.activeSessionId;
      if (!sessionId) return;
      
      // Save the exact local time we paused
      _patch('focus', { localLastPausedAt: Date.now() });

      try {
        const session = await window.focusService.pauseSession(sessionId);
        _patch('focus', {
          sessionStatus: session.status,
          isRunning: false
        });
      } catch (e) {
        console.error('[SF_STORE] focus/PAUSE_SESSION failed:', e);
        throw e;
      }
    },

    async 'focus/RESUME_SESSION'() {
      const sessionId = _state.focus.activeSessionId;
      if (!sessionId) return;
      
      const { localLastPausedAt, intervalStartTime } = _state.focus;
      if (localLastPausedAt && intervalStartTime) {
        // Shift intervalStartTime forward by the duration it was paused
        const pauseDuration = Date.now() - localLastPausedAt;
        const newIntervalStart = intervalStartTime + pauseDuration;
        
        // Persist the adjusted intervalStartTime
        const storageKey = `sf_focus_timer_mode_${sessionId}`;
        const timerPref = JSON.parse(localStorage.getItem(storageKey) || '{}');
        timerPref.intervalStartTime = newIntervalStart;
        localStorage.setItem(storageKey, JSON.stringify(timerPref));
        
        _patch('focus', { 
          intervalStartTime: newIntervalStart,
          localLastPausedAt: null 
        });
      }

      try {
        const session = await window.focusService.resumeSession(sessionId);
        _patch('focus', {
          sessionStatus: session.status,
          isRunning: true
        });
      } catch (e) {
        console.error('[SF_STORE] focus/RESUME_SESSION failed:', e);
        throw e;
      }
    },

    async 'focus/COMPLETE_SESSION'() {
      const { activeSessionId, scratchpad, distractionCount, sessionStatus } = _state.focus;
      
      // Duplicate / Concurrent protection lock
      if (!activeSessionId || sessionStatus === 'COMPLETING' || sessionStatus === 'COMPLETED' || sessionStatus === 'ABORTED') return;
      
      const previousStatus = sessionStatus;
      
      // Synchronous lock to prevent duplicate completion requests
      _patch('focus', { sessionStatus: 'COMPLETING' });

      try {
        // F6 FIX: Capture the backend response so we can use its authoritative duration.
        const _completedSession = await window.focusService.completeSession(activeSessionId, { 
          notes: scratchpad || undefined,
          interruptions: distractionCount
        });
        
        // Log to session history — prefer backend authoritative duration over frontend estimate.
        const entry = {
          date: new Date().toISOString(),
          duration: _completedSession?.duration ?? (_state.focus.timerTotal - _state.focus.timerRemaining),
          taskId: _state.focus.activeTask?.id || null
        };
        const sessionLog = [...(_state.focus.sessionLog || []), entry];
        
        _patch('focus', { 
          activeSessionId: null, 
          sessionStatus: null, 
          isRunning: false,
          activeTask: null,
          scratchpad: '',
          distractionCount: 0,
          sessionLog
        });
        
        // Persist session log to localStorage
        try {
          localStorage.setItem('studyflow_focus_sessions', JSON.stringify(sessionLog));
        } catch (e) {
          console.warn('[SF_STORE] Could not persist session log:', e);
        }
      } catch (e) {
        console.error('Failed to complete session:', e);
        // Recovery: unlock so user can try again if there's a transient failure
        _patch('focus', { sessionStatus: previousStatus });
      }
    },

    'focus/UPDATE_SCRATCHPAD'(text) {
      _patch('focus', { scratchpad: text });
      _triggerFocusAutosave();
    },

    'focus/SET_AUTOSAVE_STATUS'(status) {
      _patch('focus', { autosaveStatus: status });
    },

    'focus/TOGGLE_CHECKLIST_ITEM'({ itemId, completed }) {
      if (!_state.focus.activeTask || !_state.focus.activeTask.checklist) return;
      const checklist = _state.focus.activeTask.checklist.map(chk => 
        chk.id === itemId ? { ...chk, completed } : chk
      );
      _patch('focus', { activeTask: { ..._state.focus.activeTask, checklist } });
    },

    async 'focus/ABORT_SESSION'() {
      const sessionId = _state.focus.activeSessionId;
      if (!sessionId) {
        _patch('focus', { timerRemaining: _state.focus.timerTotal, isRunning: false });
        return;
      }
      
      try {
        await window.focusService.abortSession(sessionId);
        _patch('focus', {
          activeSessionId: null,
          sessionStatus: null,
          timerRemaining: _state.focus.timerTotal,
          isRunning: false,
          distractionCount: 0
        });
      } catch (e) {
        console.error('[SF_STORE] focus/ABORT_SESSION failed:', e);
        throw e;
      }
    },

    'focus/TIMER_TICK'() {
      const focus = _state.focus;
      if (!focus.isRunning) return;
      
      const newDuration = focus.activeDuration + 1;
      
      let newRemaining;
      
      if (focus.timerMode === 'timeblock' && focus.activeTask?.endTime) {
        const endTime = new Date(focus.activeTask.endTime).getTime();
        const diffSeconds = Math.floor((endTime - Date.now()) / 1000);
        newRemaining = Math.max(0, diffSeconds);
      } else if (focus.timerMode === 'stopwatch' || focus.timerMode === 'flow') {
        newRemaining = 0; // Flow relies strictly on activeDuration
      } else {
        const elapsedInterval = Math.floor((Date.now() - focus.intervalStartTime) / 1000);
        newRemaining = Math.max(0, focus.timerTotal - elapsedInterval);
      }

      _patch('focus', { 
        activeDuration: newDuration,
        timerRemaining: newRemaining
      });
    },

    'focus/SET_TIMER_MODE'(payload) {
      const focus = _state.focus;
      const sessionId = String(focus.activeSessionId);
      
      const intervalStartTime = Date.now();

      // F1 FIX: If the session is currently paused and the user switches method/duration,
      // we must reset the pause anchor to NOW (= intervalStartTime).
      // This prevents RESUME_SESSION from applying the old pause timestamp to the new
      // interval, which would incorrectly shift intervalStartTime far into the future
      // and make timerRemaining > timerTotal after resume.
      const wasAlreadyPaused = focus.sessionStatus === 'PAUSED';

      const enhancedPayload = { 
        ...payload, 
        sessionId,
        intervalStartTime 
      };
      
      if (sessionId && sessionId !== 'null' && sessionId !== 'undefined') {
        localStorage.setItem(`sf_focus_timer_mode_${sessionId}`, JSON.stringify(enhancedPayload));
      }
      
      let timerTotal = payload.seconds;
      let newRemaining;

      if (payload.mode === 'timeblock' && focus.activeTask?.endTime) {
         const endTime = new Date(focus.activeTask.endTime).getTime();
         const startTime = new Date(focus.activeTask.startTime).getTime();
         timerTotal = Math.max(0, Math.floor((endTime - startTime) / 1000));
         const diffSeconds = Math.floor((endTime - Date.now()) / 1000);
         newRemaining = Math.max(0, diffSeconds);
      } else if (payload.mode === 'stopwatch' || payload.mode === 'flow') {
         newRemaining = 0;
      } else {
         newRemaining = timerTotal;
      }
      
      _patch('focus', { 
        timerTotal: timerTotal, 
        timerMode: payload.mode,
        timerModeText: payload.text, 
        isStopwatch: payload.isStopwatch || false,
        intervalStartTime: intervalStartTime,
        timerRemaining: newRemaining,
        // F1 FIX: If already paused, anchor pause timestamp to this exact moment so
        // RESUME_SESSION only compensates for time paused AFTER this switch.
        // If not paused, clear any stale localLastPausedAt from a previous pause cycle.
        localLastPausedAt: wasAlreadyPaused ? intervalStartTime : null
      });
    },

    'focus/INCREMENT_DISTRACTION'() {
      const current = _state.focus.distractionCount || 0;
      _patch('focus', { distractionCount: current + 1 });
      _triggerFocusAutosave();
    },

    'focus/RESET_DISTRACTION'() {
      _patch('focus', { distractionCount: 0 });
    },

    // Moved to COMPLETE_SESSION mostly, but keep for fallback
    'focus/LOG_SESSION'(payload) {
      const entry = {
        date:     new Date().toISOString(),
        duration: _state.focus.timerTotal - _state.focus.timerRemaining,
        taskId:   _state.focus.activeTask?.id || null,
        ...payload
      };
      const sessionLog = [..._state.focus.sessionLog, entry];
      _patch('focus', { sessionLog });
      // Persist session log to localStorage
      try {
        localStorage.setItem('studyflow_focus_sessions', JSON.stringify(sessionLog));
      } catch (e) {
        console.warn('[SF_STORE] Could not persist session log:', e);
      }
    },

    'focus/NEXT_SESSION'() {
      const next = (_state.focus.currentSession % 4) + 1;
      _patch('focus', { currentSession: next, timerRemaining: _state.focus.timerConfig?.focus || 1500 });
    },

    // ── Settings ─────────────────────────────────────────────────────────────

    async 'settings/LOAD'() {
      // Settings are loaded as part of user/LOAD; this action can force a reload
      const settings = await window.userService.getSettings();
      _patch('settings', { ...settings, loaded: true });
    },

    async 'settings/SAVE'(payload) {
      return _handlers['user/SAVE_SETTINGS'](payload);
    }
  };

  // ─── Public API ─────────────────────────────────────────────────────────────

  /**
   * Read the current state snapshot for a slice.
   * Returns a deep clone – safe to mutate without affecting store.
   * @param {string} sliceName
   * @returns {object}
   */
  function getSlice(sliceName) {
    if (!_state[sliceName]) {
      console.warn(`[SF_STORE] Unknown slice: "${sliceName}"`);
      return {};
    }
    return _clone(_state[sliceName]);
  }


  /**
   * Dispatch an action to mutate state.
   * @param {string} type   – e.g. 'goals/LOAD', 'focus/TIMER_TICK'
   * @param {*}      payload
   * @returns {Promise<*>}   resolves when the handler completes
   */
  async function dispatch(type, payload) {
    const handler = _handlers[type];
    if (!handler) {
      console.warn(`[SF_STORE] No handler for action: "${type}"`);
      return;
    }
    try {
      return await handler(payload);
    } catch (e) {
      console.error(`[SF_STORE] dispatch("${type}") threw:`, e);
      throw e;
    }
  }

  /**
   * Subscribe to state changes on a specific slice.
   * The callback receives a deep clone of the slice every time it changes.
   *
   * @param {string|string[]} slice – slice name or array of slice names
   * @param {(sliceState: object, sliceName: string) => void} callback
   * @returns {() => void} unsubscribe function
   */
  function subscribe(slice, callback) {
    const slices = Array.isArray(slice) ? slice : [slice];
    slices.forEach(s => {
      if (!_subscribers.has(s)) _subscribers.set(s, new Set());
      _subscribers.get(s).add(callback);
    });
    // Return unsubscribe function
    return () => slices.forEach(s => _subscribers.get(s)?.delete(callback));
  }

  /**
   * Bootstrap the store by loading the specified slices.
   * Call this once in each page's DOMContentLoaded.
   *
   * @param {string[]} slices – e.g. ['user', 'goals']
   * @returns {Promise<void>}
   */
  async function bootstrap(slices = []) {
    // Map slice name → load action
    const loadActions = {
      user:      'user/LOAD',
      goals:     'goals/LOAD',
      planner:   'planner/LOAD',
      analytics: 'analytics/LOAD',
      focus:     'focus/LOAD',
      settings:  'settings/LOAD',
      idealab:   null  // idealab/OPEN_GOAL is triggered manually with a goalId
    };

    const actions = slices
      .filter(s => loadActions[s])
      .map(s => dispatch(loadActions[s]));

    await Promise.all(actions);
  }

  /**
   * Reload session logs from localStorage on startup.
   * Called automatically when the store is initialized.
   */
  function _restoreSessionLog() {
    try {
      const raw = localStorage.getItem('studyflow_focus_sessions');
      if (raw) {
        const sessionLog = JSON.parse(raw);
        if (Array.isArray(sessionLog)) _state.focus.sessionLog = sessionLog;
      }
    } catch (e) {
      console.warn('[SF_STORE] Could not restore session log:', e);
    }
  }

  function _checkCacheVersion() {
    try {
      const CURRENT_VERSION = '2';
      const version = localStorage.getItem('studyflow_store_version');
      if (version !== CURRENT_VERSION) {
        localStorage.removeItem('studyflow_goals');
        localStorage.setItem('studyflow_store_version', CURRENT_VERSION);
        console.log('[SF_STORE] Cache version mismatch. Cleared legacy goal cache.');
      }
    } catch (e) {
      console.warn('[SF_STORE] Could not check cache version:', e);
    }
  }

  function _maybeRefreshGoals() {
    const goalsSlice = _state.goals;
    
    // Store Initialization & Concurrency Guards
    if (!goalsSlice || !goalsSlice.lastSync || goalsSlice.loading) return;

    const STALE_MS = 15 * 60 * 1000; // 15 minutes
    const isStale = (Date.now() - goalsSlice.lastSync) > STALE_MS;
    
    // Robust Calendar Day Comparison
    const lastDate = new Date(goalsSlice.lastSync).toDateString();
    const nowDate = new Date().toDateString();
    const dayChanged = lastDate !== nowDate;

    if (isStale || dayChanged) {
      console.log('[SF_STORE] Waking up with stale data. Refreshing intelligence...');
      dispatch('goals/LOAD');
    }
  }

  // ─── Background Refresh Listeners ──────────────────────────────────────────
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') _maybeRefreshGoals();
  });
  window.addEventListener('focus', _maybeRefreshGoals);

  // ─── Self-Init ──────────────────────────────────────────────────────────────
  _checkCacheVersion();
  _restoreSessionLog();

  // Expose public interface
  return {
    getSlice,
    dispatch,
    subscribe,
    bootstrap,
    // Convenience: expose a live state getter (read-only)
    get state() { return _clone(_state); }
  };

})();
