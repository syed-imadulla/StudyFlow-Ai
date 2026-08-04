/**
 * dashboardRenderer.js
 * 
 * Handles rendering the Dashboard using purely backend-provided intelligence.
 * No frontend calculation of deadlines, sorting, or health.
 */

const ACTIONABLE_TYPES = new Set([
  'TODAY',
  'TOMORROW',
  'OVERDUE'
]);

window.DashboardRenderer = {
  renderDashboardTasks: function() {
    const goalsSlice = window.SF_STORE.getSlice('goals');
    const recommendedSlice = window.SF_STORE.getSlice('recommended');
    const goals = goalsSlice.items || [];
    const tasksContainer = document.getElementById('dashTasksList');
    const mainGoalsContainer = document.getElementById('dashMainGoalsList');

    if (goals.length === 0) {
      if (mainGoalsContainer) {
        mainGoalsContainer.innerHTML = window.SF_COMPONENTS.renderEmptyState({
          title: 'No Active Goals',
          message: 'Create your first AI Goal Breakdown to start tracking your study productivity.',
          actionHtml: '<button onclick="window.openAddItemModal(\'dashMainGoalsList\', false)" class="btn btn-primary px-4 py-2 text-xs font-bold shadow-[0_0_15px_rgba(168,85,247,0.3)]">Create Goal →</button>'
        });
      }
      if (tasksContainer) {
        tasksContainer.innerHTML = window.SF_COMPONENTS.renderEmptyState({
          title: 'No Tasks Assigned',
          message: 'You have no immediate subtasks assigned for today.',
          iconHtml: '✨'
        });
      }
      return;
    }

    // --- Hero Goal (Backend Recommendation) ---
    // The `recommended` slice is populated by GET /api/v1/goals/recommended which runs
    // GoalRecommendationService.selectRecommendation() — a single-pass O(n) algorithm that
    // picks the highest-urgency active goal using deadlineInfo.sortPriority:
    //   OVERDUE:100 > TODAY:90 > TOMORROW:70 > UPCOMING:50 > NO_DEADLINE:0
    // The frontend performs ZERO recommendation logic here.
    //
    // FALLBACK (resilience only — NOT the recommendation algorithm):
    //   If LOAD_RECOMMENDED has not yet resolved or failed, we fall back to
    //   `activeGoals[0]` from the standard goals slice (chronological backend order).
    //   This is an intentional degraded-mode behavior to prevent an empty Hero Card.
    //   Do NOT replace this with sorting, urgency scoring, or date math.
    const activeGoals = goals.filter(g => {
      const isCompleted = g.lifecycle?.isCompleted || g.status === 'COMPLETED';
      return !isCompleted;
    });
    const topGoal = recommendedSlice?.goal ?? activeGoals[0] ?? goals[0];

    const hTitle = document.getElementById('heroGoalTitle');
    const hDesc = document.getElementById('heroGoalDesc');
    const hProgText = document.getElementById('heroGoalProgressText');
    const hProgBar = document.getElementById('heroGoalProgressBar');
    const hDeadline = document.getElementById('heroGoalDeadline');
    const hSubCount = document.getElementById('heroGoalSubCount');
    const hUrgency = document.getElementById('heroGoalUrgency');
    const aiCoachText = document.getElementById('aiCoachText');
    const btn1 = document.getElementById('heroIdeaLabBtn');
    const btn2 = document.getElementById('heroIdeaLabBtnSecondary');
    const ringText = document.getElementById('heroRingText');
    const ringCircle = document.getElementById('heroRingCircle');

    if (topGoal) {
      const rawP = topGoal.progressSummary?.completionPercentage ?? 0;
      const calcP = Math.round(rawP * 100) / 100; // purely presentation rounding
      
      if (hTitle) hTitle.textContent = topGoal.title;
      if (hDesc) hDesc.textContent = topGoal.description || 'AI active project plan.';
      if (hProgText) hProgText.textContent = `${calcP}%`;
      if (hProgBar) hProgBar.style.width = `${calcP}%`;
      if (ringText) ringText.textContent = `${calcP}%`;
      if (ringCircle) {
        ringCircle.style.strokeDashoffset = `${263.89 - (263.89 * calcP / 100)}`;
      }
      if (hDeadline) hDeadline.textContent = topGoal.deadlineInfo?.label ?? 'No deadline';
      
      if (hUrgency) {
        // Reuse backend lifecycle status for the badge
        const u = topGoal.lifecycle?.status ?? topGoal.urgency ?? 'ACTIVE';
        hUrgency.textContent = u;
        
        // Let deadlineInfo.type dictate styling
        const type = topGoal.deadlineInfo?.type;
        const isUrgent = type === 'OVERDUE' || type === 'TODAY';
        if (isUrgent) {
          hUrgency.className = 'text-red-400 font-bold';
        } else {
          hUrgency.className = 'text-[#FAFAFA] font-medium';
        }
      }

      const doneSubs = topGoal.progressSummary?.completedMilestones ?? 0;
      const totalSubs = topGoal.progressSummary?.totalMilestones ?? 0;
      const remainingSubs = topGoal.progressSummary?.remainingMilestones ?? 0;
      if (hSubCount) hSubCount.textContent = `${doneSubs} / ${totalSubs} Subtasks`;
      
      if (aiCoachText) {
        aiCoachText.innerHTML = `You have <strong>${remainingSubs} remaining subtasks</strong> for <em>${topGoal.title}</em>. Complete one today! ✨`;
      }

      if (btn1) btn1.onclick = () => window.location.href = `idealab.html?goalId=${topGoal.id || topGoal._id}`;
      if (btn2) btn2.onclick = () => window.location.href = `idealab.html?goalId=${topGoal.id || topGoal._id}`;
    }

    // --- Main Goals List (Top 4 Active) ---
    if (mainGoalsContainer) {
      // Just take the first 4 active goals directly from backend list
      mainGoalsContainer.innerHTML = activeGoals.slice(0, 4).map(g => window.SF_COMPONENTS.renderGoalCard(g, 'compact')).join('');
    }

    // --- Actionable Subtasks ---
    if (tasksContainer) {
      let actionableSubtasks = [];
      activeGoals.forEach(g => {
        (g.subtasks || []).forEach(s => {
          if (!s.completed) {
            const type = s.deadlineInfo?.type;
            if (!type) return;

            if (ACTIONABLE_TYPES.has(type)) {
              actionableSubtasks.push({ ...s, goalTitle: g.title, goalId: g.id || g._id });
            }
          }
        });
      });
      actionableSubtasks = actionableSubtasks.slice(0, 4);

      if (actionableSubtasks.length === 0) {
        tasksContainer.innerHTML = window.SF_COMPONENTS.renderEmptyState({
          title: 'All Caught Up!',
          message: 'No subtasks scheduled for today or overdue. Excellent progress!',
          iconHtml: '🎉'
        });
      } else {
        tasksContainer.innerHTML = actionableSubtasks.map(sub => window.SF_COMPONENTS.renderTaskCard(sub, { mode: 'dashboard' })).join('');
      }
    }
  },

  init: async function() {
    const mainGoalsContainer = document.getElementById('dashMainGoalsList');
    const tasksContainer = document.getElementById('dashTasksList');
    
    if (mainGoalsContainer && window.SF_COMPONENTS) {
      mainGoalsContainer.innerHTML = window.SF_COMPONENTS.renderSkeleton('compact', 3);
    }
    if (tasksContainer && window.SF_COMPONENTS) {
      tasksContainer.innerHTML = window.SF_COMPONENTS.renderSkeleton('row', 3);
    }

    // Subscribe to goals slice for actionable tasks + main goal list
    window.SF_STORE.subscribe('goals', () => this.renderDashboardTasks());

    // Subscribe to recommended slice for hero card; re-render when it resolves
    window.SF_STORE.subscribe('recommended', () => this.renderDashboardTasks());

    // Kick off recommendation fetch (non-blocking)
    window.SF_STORE.dispatch('goals/LOAD_RECOMMENDED').catch(() => {
      // Recommendation endpoint unavailable — hero falls back to activeGoals[0]
      console.warn('[DashboardRenderer] LOAD_RECOMMENDED failed; hero falls back to first active goal.');
    });

    // Update Productivity Score and Workspace Health with "Pending Analytics" if applicable
    this.renderPendingAnalytics();
  },

  renderPendingAnalytics: function() {
    // Look for Productivity Score text block
    // We cannot change layout/structure, but we can change the static text inside
    const headers = document.querySelectorAll('span.text-sm.font-bold.text-\\[\\#FAFAFA\\]');
    headers.forEach(h => {
      if (h.textContent.includes('Productivity Score')) {
        const pScoreContainer = h.nextElementSibling;
        if (pScoreContainer && pScoreContainer.classList.contains('flex')) {
            const desc = pScoreContainer.querySelector('p.text-xs.text-\\[\\#A1A1AA\\]');
            if (desc) desc.textContent = "Pending Analytics (Backend integration pending)";
            
            const numberSpan = pScoreContainer.querySelector('span.text-xl.font-extrabold.text-\\[\\#FAFAFA\\]');
            if (numberSpan) numberSpan.textContent = "—";
            
            const excellentSpan = pScoreContainer.querySelector('.flex.items-center.gap-1\\.5.text-sm.font-bold span');
            if (excellentSpan) excellentSpan.textContent = "Analytics Unavailable";
        }
      }
    });
  }
};
