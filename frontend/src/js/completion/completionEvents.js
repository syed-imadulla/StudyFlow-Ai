/**
 * Completion Events
 * Helper to emit and listen for goal completion events.
 */
window.CompletionEvents = {
  emitGoalCompleted(goal) {
    const event = new CustomEvent('sf-goal-completed', { detail: { goal } });
    window.dispatchEvent(event);
  },
  
  onGoalCompleted(callback) {
    window.addEventListener('sf-goal-completed', (e) => {
      callback(e.detail.goal);
    });
  }
};
