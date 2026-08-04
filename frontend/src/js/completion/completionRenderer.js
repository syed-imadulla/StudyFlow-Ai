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
    const completedSubtasks = completedGoal.subtasks?.filter(s => s.completed).length || totalSubtasks;

    // Render Recommendation Card if available
    let recommendedHtml = '';
    if (recommendedGoal) {
      const vm = window.WorkspaceMapper ? window.WorkspaceMapper.toCardModel(recommendedGoal) : null;
      if (vm && window.SF_COMPONENTS && typeof window.SF_COMPONENTS.renderGoalCard === 'function') {
         recommendedHtml = `
           <div class="mt-5 border-t border-[#1C1C1C] pt-5 text-left">
             <h4 class="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest mb-3 flex items-center gap-2">
               <svg class="w-3.5 h-3.5 text-[#A855F7]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
               Next Recommended Goal
             </h4>
             <div class="pointer-events-none scale-[0.98] origin-left">
               ${window.SF_COMPONENTS.renderGoalCard(vm, 'grid')}
             </div>
           </div>
         `;
      }
    } else {
       recommendedHtml = `
         <div class="mt-5 border-t border-[#1C1C1C] pt-5 text-left">
           <div class="bg-[#0A0A0A] rounded-xl border border-[#1C1C1C] p-4 flex items-center gap-3">
             <div class="w-8 h-8 rounded-xl bg-[#A855F7]/10 border border-[#A855F7]/20 flex items-center justify-center shrink-0">
               <svg class="w-4 h-4 text-[#A855F7]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
             </div>
             <div>
               <p class="text-sm font-semibold text-[#FAFAFA]">All Caught Up!</p>
               <p class="text-xs text-[#6B7280] mt-0.5">No pending goals. Take a well-deserved break.</p>
             </div>
           </div>
         </div>
       `;
    }

    return `
      <div class="bg-[#0D0D0D] border border-[#2A2A2A] rounded-[20px] w-full max-w-md shadow-saas relative animate-scaleIn">
        
        <!-- Header bar -->
        <div class="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#1C1C1C]">
          <div class="flex items-center gap-3">
            <!-- Trophy SVG Icon -->
            <div class="w-8 h-8 rounded-xl bg-[#A855F7]/15 border border-[#A855F7]/30 flex items-center justify-center shadow-[0_0_12px_rgba(168,85,247,0.2)]">
              <svg class="w-4 h-4 text-[#A855F7]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M7 4V2h10v2h3a1 1 0 0 1 1 1v2c0 2.76-2.02 5.06-4.67 5.46A6.003 6.003 0 0 1 13 17h1v2H10v-2h1a5.978 5.978 0 0 1-3.33-5.54C5.02 11.06 3 8.76 3 6V5a1 1 0 0 1 1-1h3zm2 0v7a4 4 0 0 0 8 0V4H9zM5 6v1a3 3 0 0 0 2 2.83V6H5zm14 0h-2v3.83A3 3 0 0 0 19 7V6zM8 20h8v2H8v-2z"/>
              </svg>
            </div>
            <div>
              <h3 class="text-sm font-bold text-[#FAFAFA] leading-tight">Goal Completed!</h3>
              <p class="text-xs text-[#6B7280] truncate max-w-[220px]">${completedGoal.title || 'Untitled Goal'}</p>
            </div>
          </div>
          <button onclick="window.CompletionModal.close()" class="w-7 h-7 flex items-center justify-center rounded-full text-[#6B7280] hover:text-[#FAFAFA] hover:bg-white/5 transition duration-200">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
          </button>
        </div>

        <!-- Body -->
        <div class="px-6 py-5 space-y-4">

          <!-- Celebration accent -->
          <div class="relative rounded-xl bg-gradient-to-r from-[#A855F7]/10 via-[#9333EA]/5 to-transparent border border-[#A855F7]/20 px-4 py-3 flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-[#A855F7]/20 flex items-center justify-center shrink-0">
              <svg class="w-4 h-4 text-[#A855F7]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            </div>
            <div>
              <p class="text-xs font-bold text-[#A855F7]">Great work!</p>
              <p class="text-[11px] text-[#A1A1AA]">You crushed this goal. Keep the momentum going.</p>
            </div>
          </div>

          <!-- Stats Grid -->
          <div class="grid grid-cols-2 gap-2.5">
            <div class="bg-[#0A0A0A] border border-[#1C1C1C] rounded-xl p-3">
              <span class="text-[9px] uppercase font-bold text-[#6B7280] tracking-widest block mb-1">Started</span>
              <span class="text-xs font-semibold text-[#FAFAFA]">${startedAt}</span>
            </div>
            <div class="bg-[#0A0A0A] border border-[#1C1C1C] rounded-xl p-3">
              <span class="text-[9px] uppercase font-bold text-[#6B7280] tracking-widest block mb-1">Completed</span>
              <span class="text-xs font-semibold text-[#A855F7]">${completedAt}</span>
            </div>
            <div class="bg-[#0A0A0A] border border-[#1C1C1C] rounded-xl p-3 flex items-center gap-2.5">
              <div class="w-6 h-6 rounded-lg bg-[#A855F7]/10 flex items-center justify-center shrink-0">
                <svg class="w-3 h-3 text-[#A855F7]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2"/></svg>
              </div>
              <div>
                <span class="text-[9px] uppercase font-bold text-[#6B7280] tracking-widest block">Milestones</span>
                <span class="text-xs font-semibold text-[#FAFAFA]">${completedMilestones} / ${totalMilestones}</span>
              </div>
            </div>
            <div class="bg-[#0A0A0A] border border-[#1C1C1C] rounded-xl p-3 flex items-center gap-2.5">
              <div class="w-6 h-6 rounded-lg bg-[#A855F7]/10 flex items-center justify-center shrink-0">
                <svg class="w-3 h-3 text-[#A855F7]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
              </div>
              <div>
                <span class="text-[9px] uppercase font-bold text-[#6B7280] tracking-widest block">Subtasks</span>
                <span class="text-xs font-semibold text-[#FAFAFA]">${completedSubtasks} / ${totalSubtasks}</span>
              </div>
            </div>
          </div>

          ${recommendedHtml}

        </div>

        <!-- Footer -->
        <div class="px-6 pb-5 flex items-center justify-end gap-3">
          <button onclick="window.CompletionModal.close()" class="btn btn-ghost px-4 py-2 text-xs">Dismiss</button>
          <button onclick="window.CompletionModal.close()" class="btn btn-primary px-5 py-2 text-xs font-bold shadow-[0_0_20px_rgba(168,85,247,0.25)]">Continue →</button>
        </div>

      </div>
    `;
  }
};
