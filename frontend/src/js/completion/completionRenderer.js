/**
 * Completion Renderer
 * Generates the UI HTML for the Completion Experience.
 */
window.CompletionRenderer = {
  getModalHtml(completedGoal, recommendedGoal) {
    // Graceful fallbacks for missing metadata
    const completedAt = completedGoal.completedAt ? new Date(completedGoal.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently';
    const startedAt = completedGoal.createdAt ? new Date(completedGoal.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown';
    
    // Count stats
    const totalMilestones = completedGoal.milestones?.length || 0;
    const completedMilestones = completedGoal.milestones?.filter(m => m.completed).length || 0;
    
    const totalSubtasks = completedGoal.subtasks?.length || 0;
    const completedSubtasks = completedGoal.subtasks?.filter(s => s.completed).length || totalSubtasks; // Usually all if completed

    // Render Recommendation Card if available
    let recommendedHtml = '';
    if (recommendedGoal) {
      // Map to Card Model to reuse SF_COMPONENTS
      const vm = window.WorkspaceMapper ? window.WorkspaceMapper.toCardModel(recommendedGoal) : null;
      if (vm && window.SF_COMPONENTS && typeof window.SF_COMPONENTS.renderGoalCard === 'function') {
         // Render as grid card (compact)
         recommendedHtml = `
           <div class="mt-6 border-t border-[#2A2A2A] pt-6 text-left">
             <h4 class="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider mb-3 flex items-center gap-2">
                <svg class="w-4 h-4 text-[#A855F7]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                Next Recommended Goal
             </h4>
             <div class="pointer-events-none scale-[0.98] origin-left">
               ${window.SF_COMPONENTS.renderGoalCard(vm, 'grid')}
             </div>
           </div>
         `;
      }
    } else {
       // Graceful empty state
       recommendedHtml = `
         <div class="mt-6 border-t border-[#2A2A2A] pt-6 text-left">
           <div class="bg-[#151515] rounded-xl border border-[#2A2A2A] p-4 text-center">
              <span class="text-2xl mb-2 block">🎉</span>
              <p class="text-sm text-[#FAFAFA] font-medium">All Caught Up!</p>
              <p class="text-xs text-[#A1A1AA] mt-1">You have no pending goals. Take a well-deserved break.</p>
           </div>
         </div>
       `;
    }

    return `
      <div class="modal-content-box bg-[#0D0D0D] border border-[#2A2A2A] p-6 sm:p-8 rounded-[24px] w-full max-w-[480px] shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_40px_rgba(168,85,247,0.15)] relative animate-scaleIn flex flex-col">
        <!-- Close Button -->
        <button onclick="window.CompletionModal.close()" class="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full text-[#6B7280] hover:bg-[#1A1A24] hover:text-[#FAFAFA] transition duration-200">
          <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
        </button>

        <!-- Header -->
        <div class="text-center mb-6">
          <div class="w-16 h-16 bg-[#A855F7]/20 border border-[#A855F7]/40 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]">
            🏆
          </div>
          <h2 class="text-2xl font-extrabold text-white tracking-tight">Goal Completed!</h2>
          <p class="text-sm text-[#A1A1AA] mt-1 line-clamp-2 px-4">${completedGoal.title || 'Untitled Goal'}</p>
        </div>

        <!-- Summary Stats Grid -->
        <div class="grid grid-cols-2 gap-3 mb-2">
          <div class="bg-[#151515] border border-[#2A2A2A] rounded-xl p-3 flex flex-col justify-center">
            <span class="text-[10px] uppercase font-bold text-[#6B7280] tracking-wider">Started</span>
            <span class="text-sm font-semibold text-[#FAFAFA] mt-0.5">${startedAt}</span>
          </div>
          <div class="bg-[#151515] border border-[#2A2A2A] rounded-xl p-3 flex flex-col justify-center">
            <span class="text-[10px] uppercase font-bold text-[#6B7280] tracking-wider">Completed</span>
            <span class="text-sm font-semibold text-[#A855F7] mt-0.5">${completedAt}</span>
          </div>
          <div class="bg-[#151515] border border-[#2A2A2A] rounded-xl p-3 flex flex-col justify-center">
            <span class="text-[10px] uppercase font-bold text-[#6B7280] tracking-wider">Milestones</span>
            <span class="text-sm font-semibold text-[#FAFAFA] mt-0.5">${completedMilestones} / ${totalMilestones}</span>
          </div>
          <div class="bg-[#151515] border border-[#2A2A2A] rounded-xl p-3 flex flex-col justify-center">
            <span class="text-[10px] uppercase font-bold text-[#6B7280] tracking-wider">Subtasks</span>
            <span class="text-sm font-semibold text-[#FAFAFA] mt-0.5">${completedSubtasks} / ${totalSubtasks}</span>
          </div>
        </div>

        ${recommendedHtml}

        <!-- Action -->
        <div class="mt-6 pt-2 text-center">
          <button onclick="window.CompletionModal.close()" class="w-full bg-[#A855F7] hover:bg-[#9333EA] text-white py-3 rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(168,85,247,0.35)] transition duration-200 transform hover:scale-[1.02]">
            Continue
          </button>
        </div>
      </div>
    `;
  }
};
