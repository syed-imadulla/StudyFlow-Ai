// Mock localStorage
global.localStorage = {
  _data: {},
  setItem(k, v) { this._data[k] = v; },
  getItem(k) { return this._data[k] || null; }
};

// Mock store state
const _state = {
  focus: {
    activeSessionId: 'sess123',
    activeDuration: 10,
    timerTotal: 0,
    timerMode: 'timeblock',
    timerModeText: '🗓️ Time Block'
  }
};

function _patch(slice, data) {
  Object.assign(_state[slice], data);
  console.log('PATCH:', data);
}

function setTimerMode(payload) {
  const focus = _state.focus;
  const enhancedPayload = { ...payload, sessionId: focus.activeSessionId };
  localStorage.setItem('sf_focus_timer_mode', JSON.stringify(enhancedPayload));
  
  let timerTotal = payload.seconds;
  let newRemaining = Math.max(0, payload.seconds - (focus.activeDuration || 0));

  if (payload.mode === 'timeblock' && focus.activeTask?.endTime) {
     const endTime = new Date(focus.activeTask.endTime).getTime();
     const startTime = new Date(focus.activeTask.startTime).getTime();
     timerTotal = Math.max(0, Math.floor((endTime - startTime) / 1000));
     const diffSeconds = Math.floor((endTime - Date.now()) / 1000);
     newRemaining = Math.max(0, diffSeconds);
  }
  
  _patch('focus', { 
    timerTotal: timerTotal, 
    timerMode: payload.mode,
    timerModeText: payload.text, 
    isStopwatch: payload.isStopwatch || false,
    timerRemaining: newRemaining
  });
}

setTimerMode({ seconds: 1500, text: '🍅 Pomodoro', mode: 'pomodoro' });
console.log("Local Storage:", localStorage.getItem('sf_focus_timer_mode'));
console.log("Store State:", _state.focus);

