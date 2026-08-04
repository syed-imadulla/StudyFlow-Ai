/**
 * Completion Modal Controller
 * Orchestrates rendering and opening the completion modal.
 */
window.CompletionModal = {
  lastCompletedGoalId: null,

  init() {
    window.CompletionEvents.onGoalCompleted(async (goal) => {
      // Idempotency guard: prevent duplicate modals for the same goal
      if (this.lastCompletedGoalId === goal.id) return;
      this.lastCompletedGoalId = goal.id;

      // Automatic Refresh Flow
      try {
        await window.SF_STORE.dispatch('goals/LOAD_RECOMMENDED');
        // Refresh planner silently if loaded
        if (window.SF_STORE.state.planner) {
          window.SF_STORE.dispatch('planner/LOAD');
        }
        
        const recommendedState = window.SF_STORE.getSlice('recommended');
        this.open(goal, recommendedState.goal);
      } catch (e) {
        console.error('[CompletionModal] Error orchestrating completion refreshes:', e);
        // Fallback: still show modal even if recommendation fails
        this.open(goal, null);
      }
    });
  },

  open(completedGoal, recommendedGoal) {
    let modalEl = document.getElementById('globalCompletionModal');
    if (!modalEl) {
      modalEl = document.createElement('div');
      modalEl.id = 'globalCompletionModal';
      modalEl.className = 'fixed inset-0 z-[999999999] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn p-4';
      document.body.appendChild(modalEl);
      
      modalEl.addEventListener('click', e => {
        if (e.target === modalEl) this.close();
      });
    }

    modalEl.innerHTML = window.CompletionRenderer.getModalHtml(completedGoal, recommendedGoal);
    modalEl.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
  },

  close() {
    const modalEl = document.getElementById('globalCompletionModal');
    if (modalEl) {
      modalEl.classList.remove('animate-fadeIn');
      modalEl.classList.add('animate-fadeOut');
      setTimeout(() => {
        modalEl.style.display = 'none';
        modalEl.classList.remove('animate-fadeOut');
        document.body.style.overflow = '';
      }, 200);
    }
  }
};

// Auto-initialize when loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => window.CompletionModal.init());
} else {
  window.CompletionModal.init();
}
