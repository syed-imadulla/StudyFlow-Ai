/**
 * StudyFlow AI – Centralized UI Component Rendering Layer
 * Exposes window.SF_COMPONENTS with pure, reusable HTML render functions.
 * Preserves 100% identical appearance, CSS classes, and interaction attributes.
 */
(function () {
  window.closeGoalActionMenus = function (exceptGoalId = null) {
    document.querySelectorAll('[id^="goal-menu-dropdown-"]').forEach(menu => {
      const gId = menu.id.replace('goal-menu-dropdown-', '');
      if (gId !== exceptGoalId) {
        menu.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
          if (menu.classList.contains('scale-95')) {
            menu.classList.add('hidden');
          }
        }, 150);
        const btn = document.getElementById(`goal-menu-btn-${gId}`);
        if (btn) {
          btn.setAttribute('aria-expanded', 'false');
          const card = btn.closest('.group') || btn.closest('.card') || btn.closest('[role="button"]');
          if (card) card.classList.remove('z-[60]');
        }
      }
    });
  };

  window.toggleGoalActionMenu = function (goalId, event) {
    if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
    const menu = document.getElementById(`goal-menu-dropdown-${goalId}`);
    const btn = document.getElementById(`goal-menu-btn-${goalId}`);
    if (!menu || !btn) return;

    const isHidden = menu.classList.contains('hidden');
    window.closeGoalActionMenus(isHidden ? goalId : null);

    if (isHidden) {
      menu.classList.remove('hidden');
      btn.setAttribute('aria-expanded', 'true');
      const card = btn.closest('.group') || btn.closest('.card') || btn.closest('[role="button"]');
      if (card) card.classList.add('z-[60]');
      requestAnimationFrame(() => {
        menu.classList.remove('scale-95', 'opacity-0');
        const firstItem = menu.querySelector('[role="menuitem"]');
        if (firstItem) firstItem.focus();
      });
    } else {
      btn.focus();
    }
  };

  window.handleGoalMenuKeyDown = function (goalId, event) {
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
      event.preventDefault();
      event.stopPropagation();
      window.toggleGoalActionMenu(goalId, event);
    }
  };

  window.handleGoalItemKeyDown = function (goalId, action, event) {
    const menu = document.getElementById(`goal-menu-dropdown-${goalId}`);
    if (!menu) return;
    const items = Array.from(menu.querySelectorAll('[role="menuitem"]'));
    const currentIndex = items.indexOf(document.activeElement);

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      event.stopPropagation();
      const nextIndex = (currentIndex + 1) % items.length;
      items[nextIndex].focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      event.stopPropagation();
      const prevIndex = (currentIndex - 1 + items.length) % items.length;
      items[prevIndex].focus();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      window.closeGoalActionMenus();
      const btn = document.getElementById(`goal-menu-btn-${goalId}`);
      if (btn) btn.focus();
    } else if (event.key === 'Tab') {
      window.closeGoalActionMenus();
    }
  };

  document.addEventListener('click', function (e) {
    if (!e.target || typeof e.target.closest !== 'function' || !e.target.closest('.goal-action-menu-container')) {
      window.closeGoalActionMenus();
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      const openMenu = document.querySelector('[id^="goal-menu-dropdown-"]:not(.hidden)');
      if (openMenu) {
        const gId = openMenu.id.replace('goal-menu-dropdown-', '');
        window.closeGoalActionMenus();
        const btn = document.getElementById(`goal-menu-btn-${gId}`);
        if (btn) btn.focus();
      }
    }
  });

  window.SF_COMPONENTS = {
    /**
     * Render Goal Action Overflow Menu (Sprint 1D.2)
     */
    renderGoalActionMenu(goalId) {
      return `
        <div class="goal-action-menu-container relative shrink-0">
          <button
            type="button"
            onclick="event.stopPropagation(); window.toggleGoalActionMenu('${goalId}', event)"
            onkeydown="window.handleGoalMenuKeyDown('${goalId}', event)"
            id="goal-menu-btn-${goalId}"
            aria-haspopup="true"
            aria-expanded="false"
            aria-label="Goal actions menu"
            class="p-1.5 min-w-[32px] min-h-[32px] rounded-lg bg-transparent hover:bg-[#151515] text-[#A1A1AA] hover:text-[#FAFAFA] transition border border-transparent hover:border-[#2A2A2A] focus:outline-none focus:ring-1 focus:ring-[#A855F7] flex items-center justify-center shrink-0"
            title="More Actions"
          >
            <svg class="w-4 h-4 fill-current pointer-events-none" viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
          </button>
          <div
            id="goal-menu-dropdown-${goalId}"
            role="menu"
            aria-labelledby="goal-menu-btn-${goalId}"
            class="hidden custom-dropdown-menu absolute right-0 top-full mt-1.5 w-44 rounded-xl bg-[#0E0E0E]/95 backdrop-blur-xl border border-[#2A2A2A] shadow-[0_10px_30px_rgba(0,0,0,0.9),0_0_20px_rgba(168,85,247,0.2)] py-1.5 z-[100] transform origin-top-right transition-all duration-150 ease-out scale-95 opacity-0"
          >
            <button
              role="menuitem"
              type="button"
              tabindex="-1"
              onclick="event.stopPropagation(); window.closeGoalActionMenus(); window.openEditGoalModal('${goalId}')"
              onkeydown="window.handleGoalItemKeyDown('${goalId}', 'edit', event)"
              class="w-full px-3 py-2 text-left text-xs font-semibold text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#1C1C24] transition flex items-center space-x-2.5 focus:outline-none focus:bg-[#1C1C24] focus:text-[#FAFAFA]"
            >
              <svg class="w-3.5 h-3.5 fill-current shrink-0 pointer-events-none text-[#A855F7]" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
              <span>Edit Goal</span>
            </button>
            <button
              role="menuitem"
              type="button"
              tabindex="-1"
              onclick="event.stopPropagation(); window.closeGoalActionMenus(); window.confirmDeleteGoal('${goalId}', event)"
              onkeydown="window.handleGoalItemKeyDown('${goalId}', 'delete', event)"
              class="w-full px-3 py-2 text-left text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/15 transition flex items-center space-x-2.5 focus:outline-none focus:bg-red-500/15 focus:text-red-300"
            >
              <svg class="w-3.5 h-3.5 fill-current shrink-0 pointer-events-none" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
              <span>Delete Goal</span>
            </button>
          </div>
        </div>
      `;
    },

    calculateGoalProgress(goal) {
      return goal?.progressSummary?.completionPercentage ?? 0;
    },

    /**
     * Render Floating Action Buttons for Goal Cards
     */
    renderGoalActionButtons(goalId) {
      return this.renderGoalActionMenu(goalId);
    },

    /**
     * Render Goal Card
     * @param {Object} goal
     * @param {string} mode - 'compact' (dashboard), 'grid' (workspace cards), 'expanded' (workspace detail)
     */
    renderGoalCard(input, mode = 'compact') {
      // Auto-map raw goals to ViewModels to preserve backward compatibility
      let model = input;
      if (!model.deadline || !model.progress || typeof model.deadline !== 'object' || typeof model.progress !== 'object') {
        if (window.WorkspaceMapper) {
          model = window.WorkspaceMapper.toCardModel(input);
        } else {
          // Minimal inline fallback for pages without WorkspaceMapper (e.g. Dashboard)
          const timestamp = input.deadline ? new Date(input.deadline).getTime() : Infinity;
          
          model = {
            id: input.id || input._id,
            title: input.title || 'Untitled',
            description: input.description || '',
            health: input.goalHealth ? { label: input.goalHealth.status.replace('_', ' '), color: 'success' } : { label: 'Healthy', color: 'success' },
            progress: {
              percentage: input.progressSummary?.completionPercentage !== undefined ? Math.round(input.progressSummary.completionPercentage * 100) / 100 : 0,
              label: `${input.progressSummary?.completedMilestones ?? 0}/${input.progressSummary?.totalMilestones ?? 0} Completed`
            },
            deadline: {
              type: input.deadlineInfo?.type,
              label: input.deadlineInfo?.label ?? 'No deadline',
              shortLabel: input.deadlineInfo?.shortLabel ?? 'No deadline',
              timestamp: timestamp,
              sortPriority: input.deadlineInfo?.sortPriority || 0,
              isUrgent: (input.deadlineInfo?.urgencyLevel ?? 0) >= 2
            },
            subtasks: input.subtasks || []
          };
        }
      }

      if (!model) return ''; // Fallback failed

      if (mode === 'compact') {
        const urgClass = model.deadline.isUrgent ? 'bg-red-500/15 text-red-400 border border-red-500/30 font-bold' : 'bg-[#A855F7]/15 text-[#A855F7] border border-[#A855F7]/30 font-bold';
        return `
          <div role="button" tabindex="0" aria-label="Open Goal: ${model.title}" onclick="window.WorkspaceActions ? window.WorkspaceActions.openGoal('${model.id}') : window.location.href='idealab.html?goalId=${model.id}'" onkeydown="if(event.key==='Enter'||event.key===' ')(window.WorkspaceActions ? window.WorkspaceActions.openGoal('${model.id}') : window.location.href='idealab.html?goalId=${model.id}')" class="relative p-3.5 rounded-xl bg-[#0A0A0A] border border-[#202020] hover:border-[#A855F7]/50 hover:shadow-lg transition-all duration-200 cursor-pointer space-y-2.5 group">
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center space-x-2 min-w-0">
                <span class="text-[10px] px-2 py-0.5 rounded shrink-0 ${urgClass}">${model.deadline?.type || 'ACTIVE'}</span>
                <span class="text-[10px] font-mono text-[#FACC15] truncate">📅 ${model.deadline.shortLabel || model.deadline.label}</span>
              </div>
              ${this.renderGoalActionMenu(model.id)}
            </div>
            <div>
              <h4 class="text-xs font-bold text-[#FAFAFA] group-hover:text-[#A855F7] transition truncate">${model.title}</h4>
              <p class="text-[10px] text-[#6B7280] truncate mt-0.5">${model.description}</p>
            </div>
            <div class="space-y-1 pt-1 border-t border-[#1C1C1C]">
              <div class="flex items-center justify-between text-[10px] font-mono">
                <span class="text-[#A1A1AA]">${model.progress.label}</span>
                <span class="text-[#FAFAFA] font-bold">${model.progress.percentage}%</span>
              </div>
              ${this.renderProgressBar(model.progress.percentage, { heightClass: 'h-1.5', bgClass: 'bg-[#151515]' })}
            </div>
          </div>
        `;
      } else if (mode === 'grid') {
        const urgClass = model.deadline.isUrgent ? 'bg-red-500/15 text-red-400 border border-red-500/30' : 'bg-[#A855F7]/20 text-[#A855F7] border border-[#A855F7]/40';
        return `
          <div role="button" tabindex="0" aria-label="Open Goal Grid: ${model.title}" onclick="window.WorkspaceActions ? window.WorkspaceActions.openGoal('${model.id}') : window.location.href='idealab.html?goalId=${model.id}'" onkeydown="if(event.key==='Enter'||event.key===' ')(window.WorkspaceActions ? window.WorkspaceActions.openGoal('${model.id}') : window.location.href='idealab.html?goalId=${model.id}')" class="card bg-[#0E0E0E] border border-[#202020] p-6 rounded-[20px] flex flex-col justify-between space-y-4 hover:border-[#A855F7]/50 hover:shadow-[0_10px_30px_rgba(168,85,247,0.12)] transition-all duration-200 cursor-pointer relative group">
            <div class="space-y-2">
              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center space-x-2.5 min-w-0">
                  <span class="px-2.5 py-1 rounded text-[10px] font-bold tracking-wider uppercase shrink-0 ${urgClass}">${model.deadline?.type || 'ACTIVE'}</span>
                  <span class="text-xs font-mono text-[#FACC15] font-semibold truncate">${model.deadline.shortLabel || model.deadline.label}</span>
                </div>
                ${this.renderGoalActionMenu(model.id)}
              </div>
              <h3 class="text-base font-bold text-[#FAFAFA]">${model.title}</h3>
              <p class="text-xs text-[#A1A1AA] line-clamp-2 leading-relaxed">${model.description}</p>
            </div>
            <div class="space-y-3 pt-4 border-t border-[#1C1C1C]">
              <div class="flex items-center justify-between text-xs font-mono">
                <span class="text-[#6B7280]">${model.progress.label}</span>
                <span class="text-[#A855F7] font-bold">${model.progress.percentage}%</span>
              </div>
              ${this.renderProgressBar(model.progress.percentage, { heightClass: 'h-1.5', bgClass: 'bg-[#0A0A0A]' })}
              <div class="flex items-center">
                <button onclick="event.stopPropagation(); window.WorkspaceActions ? window.WorkspaceActions.openGoal('${model.id}') : window.location.href='idealab.html?goalId=${model.id}'" class="w-full py-2 bg-[#151515] hover:bg-[#A855F7] text-[#A855F7] hover:text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 border border-[#2A2A2A] hover:border-transparent shadow-sm">
                  <svg class="w-3.5 h-3.5 inline shrink-0 fill-current drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" viewBox="0 0 24 24"><path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z"/></svg>
                  <span>IdeaLab Architect</span>
                </button>
              </div>
            </div>
          </div>
        `;
      } else if (mode === 'expanded') {
        const subtasksHtml = (model.subtasks || []).map(sub => this.renderTaskCard(sub, { mode: 'workspace', goalId: model.id })).join('');
        const healthBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase shrink-0 bg-${model.health.color}-500/15 text-${model.health.color}-400 border border-${model.health.color}-500/30">${model.health.label}</span>`;
        const urgClass = model.deadline.isUrgent ? 'bg-red-500/15 text-red-400 border border-red-500/30' : 'bg-[#A855F7]/20 text-[#A855F7] border border-[#A855F7]/40';
        const blockingHtml = model.blockingMilestone ? `
          <div class="mt-2 text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-lg flex items-center w-max">
            <svg class="w-3.5 h-3.5 mr-1.5 fill-current" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
            Blocking: ${model.blockingMilestone.title} (${model.blockingMilestone.deadlineLabel})
          </div>
        ` : '';

        return `
          <div id="goal-${model.id}" class="card bg-[#0E0E0E] border border-[#202020] p-6 rounded-[20px] space-y-4 shadow-saas animate-fadeIn relative group hover:border-[#A855F7]/40 transition-all duration-200">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#1C1C1C]">
              <div class="flex items-start space-x-3.5 min-w-0 flex-1">
                <div class="w-10 h-10 rounded-xl bg-[#A855F7]/15 border border-[#A855F7]/30 flex items-center justify-center text-[#A855F7] font-bold text-sm shrink-0 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                  <svg class="w-5 h-5 text-[#A855F7] fill-current drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]" viewBox="0 0 24 24"><path d="M10 4H4C2.89 4 2.01 4.89 2.01 6L2 18C2 19.11 2.89 20 4 20H20C21.11 20 22 19.11 22 18V8C22 6.89 21.11 6 20 6H12L10 4Z"/></svg>
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-2.5">
                    <h3 class="text-base font-bold text-[#FAFAFA] truncate">${model.title}</h3>
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase shrink-0 ${urgClass}">${model.deadline?.type || 'ACTIVE'}</span>
                    ${healthBadge}
                    <button onclick="window.WorkspaceActions ? window.WorkspaceActions.openGoal('${model.id}') : window.location.href='idealab.html?goalId=${model.id}'" class="px-3 py-1 rounded-lg bg-[#A855F7] text-white hover:bg-[#9333EA] transition text-[11px] font-bold flex items-center space-x-1.5 shadow-[0_0_15px_rgba(168,85,247,0.3)] shrink-0" title="Restructure & Refine Main Goal in IdeaLab">
                      <svg class="w-3.5 h-3.5 inline shrink-0 fill-current drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" viewBox="0 0 24 24"><path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z"/></svg>
                      <span>IdeaLab Architect</span>
                      <span>→</span>
                    </button>
                  </div>
                  <p class="text-xs text-[#A1A1AA] mt-1">${model.description}</p>
                  ${blockingHtml}
                </div>
              </div>
              <div class="flex items-center justify-between md:justify-end space-x-4 shrink-0 w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-[#1C1C1C]">
                <div class="text-right">
                  <span class="text-[10px] font-mono text-[#6B7280] block">FINAL DEADLINE</span>
                  <span class="text-xs font-bold text-[#FACC15]">${model.deadline.label}</span>
                </div>
                <div class="w-px h-8 bg-[#1C1C1C] hidden md:block"></div>
                <div class="flex items-center space-x-3">
                  <div class="w-24 bg-[#0A0A0A] h-2 rounded-full overflow-hidden border border-[#202020]">
                    <div class="bg-[#A855F7] h-full rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(168,85,247,0.3)]" style="width: ${model.progress.percentage}%;"></div>
                  </div>
                  <span class="text-xs font-mono font-bold text-[#A855F7] w-9 text-right">${model.progress.percentage}%</span>
                </div>
                ${this.renderGoalActionMenu(model.id)}
              </div>
            </div>

            <div class="space-y-2 pt-1">
              <div class="flex items-center justify-between text-xs text-[#6B7280] font-mono mb-2 px-1">
                <span>NESTED SUBTASKS & STRUCTURED IDEALAB BLUEPRINTS</span>
                <span>${model.progress.label}</span>
              </div>
              <div class="space-y-2.5">
                ${subtasksHtml}
              </div>
            </div>
          </div>
        `;
      }
      return '';
    },

    /**
     * Render Task Card
     * @param {Object} sub
     * @param {Object} options
     */
    renderTaskCard(input, options = {}) {
      // Auto-map raw subtasks to ViewModels
      let sub = input;
      if (!sub.deadline || !sub.priorityColor) {
        if (window.WorkspaceMapper) {
          sub = window.WorkspaceMapper.toSubtaskModel(input, options.goalId || input.goalId);
        } else {
          // Minimal inline fallback for pages without WorkspaceMapper
          sub = {
            id: input.id || input._id,
            goalId: options.goalId || input.goalId,
            title: input.title || 'Task',
            completed: !!input.completed,
            priority: input.priority || 'Medium',
            priorityColor: input.priority === 'High' ? 'danger' : input.priority === 'Medium' ? 'warning' : 'success',
            deadline: { shortLabel: input.deadlineInfo?.shortLabel || 'Assigned', color: input.deadlineInfo?.color || 'neutral' },
            _raw: input
          };
        }
      }
      if (!sub) return ''; // Fallback failed

      const mode = options.mode || 'dashboard';
      const goalId = sub.goalId;
      const badgeColor = `bg-${sub.priorityColor}-500/10 border border-${sub.priorityColor}-500/30 text-${sub.priorityColor}-400`;
      const isScheduled = typeof window.isMilestoneScheduled === 'function' ? window.isMilestoneScheduled(goalId, sub.id) : (sub._raw?.status === 'SCHEDULED');
      const actionPrefix = window.WorkspaceActions ? 'window.WorkspaceActions.' : 'window.';

      let scheduleBtnHtml = '';
      if (mode === 'workspace') {
        scheduleBtnHtml = isScheduled ? `
          <button onclick="${actionPrefix}viewInPlanner ? ${actionPrefix}viewInPlanner() : window.location.href='planner.html'" class="w-7 h-7 rounded-lg hover:bg-[#A855F7]/10 text-[#A855F7]/80 hover:text-[#A855F7] transition-all duration-200 ease-out flex items-center justify-center hover:shadow-[0_0_15px_rgba(168,85,247,0.2)] hover:-translate-y-0.5 active:translate-y-0" title="View in Planner">
            <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
          </button>
        ` : `
          <button onclick="${actionPrefix}scheduleMilestone('${goalId}', '${sub.id}')" class="w-7 h-7 rounded-lg hover:bg-[#A855F7]/10 text-[#A855F7]/80 hover:text-[#A855F7] transition-all duration-200 ease-out flex items-center justify-center hover:shadow-[0_0_15px_rgba(168,85,247,0.2)] hover:-translate-y-0.5 active:translate-y-0" title="Schedule to Planner">
            <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7v-5z"/></svg>
          </button>
        `;
      } else {
        if (isScheduled) {
          scheduleBtnHtml = `
            <button onclick="${actionPrefix}viewInPlanner ? ${actionPrefix}viewInPlanner() : window.location.href='planner.html'" class="w-7 h-7 rounded-lg hover:bg-[#A855F7]/10 text-[#A855F7]/80 hover:text-[#A855F7] transition-all duration-200 ease-out flex items-center justify-center hover:shadow-[0_0_15px_rgba(168,85,247,0.2)] hover:-translate-y-0.5 active:translate-y-0" title="View in Planner">
              <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
            </button>
          `;
        }
      }

      const getIconSvg = (iconName) => {
        switch (iconName) {
          case 'alert': return `<svg class="w-3 h-3 fill-current" viewBox="0 0 24 24"><path d="M12 2L1 21h22L12 2zm1 16h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>`;
          case 'clock': return `<svg class="w-3 h-3 fill-current" viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>`;
          case 'check': return `<svg class="w-3 h-3 fill-current" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`;
          case 'check-circle': return `<svg class="w-3 h-3 fill-current" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>`;
          default: return `<svg class="w-3 h-3 fill-current" viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7v-5z"/></svg>`;
        }
      };

      const hasDeadline = sub.deadline && sub.deadline.type !== 'NO_DEADLINE';
      const urgencyBadgeColor = sub.deadline.badge || 'neutral';
      const urgencyBadgeHtml = hasDeadline ? `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-${urgencyBadgeColor}-500/10 border border-${urgencyBadgeColor}-500/30 text-${urgencyBadgeColor}-400 flex items-center space-x-1 shrink-0 whitespace-nowrap">${getIconSvg(sub.deadline.icon)}<span>${sub.deadline.shortLabel}</span></span>` : '';

      if (mode === 'dashboard') {
        return `
          <div class="flex items-center justify-between p-3.5 rounded-xl bg-[#0A0A0A] border border-[#202020] hover:border-[#343434] transition group gap-4">
            <div class="flex items-center space-x-3.5 overflow-hidden">
              <input type="checkbox" aria-label="Mark task ${sub.title} completed" onchange="${actionPrefix}toggleSubtask('${goalId}','${sub.id}')" ${sub.completed ? 'checked' : ''} class="w-4 h-4 rounded border-[#2A2A2A] bg-[#161616] text-[#A855F7] focus:ring-[#A855F7] cursor-pointer shrink-0" />
              <div class="truncate">
                <h4 class="text-xs font-semibold text-[#FAFAFA] ${sub.completed ? 'line-through text-[#6B7280]' : 'group-hover:text-[#A855F7]'} transition truncate">${sub.title}</h4>
                <p class="text-[10px] text-[#6B7280] font-mono mt-0.5 truncate flex items-center gap-1.5">
                  <span>${sub._raw?.goalTitle || 'Task'}</span>
                </p>
              </div>
            </div>
            <div class="flex items-center space-x-2 shrink-0">
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${badgeColor} shrink-0">${sub.priority}</span>
              ${urgencyBadgeHtml}
              <div class="flex items-center bg-[#111116] border border-[#20202A] rounded-xl p-1 space-x-1 hover:border-[#303040] shadow-sm transition duration-300 ml-1">
                <button onclick="${actionPrefix}openSubtaskIdeaLab('${goalId}', '${sub.id}')" class="w-7 h-7 rounded-lg hover:bg-[#A855F7]/10 text-[#A855F7]/80 hover:text-[#A855F7] transition-all duration-200 ease-out flex items-center justify-center hover:shadow-[0_0_15px_rgba(168,85,247,0.2)] hover:-translate-y-0.5 active:translate-y-0" title="AI IdeaLab">
                  <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z"/></svg>
                </button>
                ${scheduleBtnHtml}
                <button onclick="${actionPrefix}startFocus()" class="w-7 h-7 rounded-lg hover:bg-[#FACC15]/10 text-[#FACC15]/80 hover:text-[#FACC15] transition-all duration-200 ease-out flex items-center justify-center hover:shadow-[0_0_15px_rgba(250,204,21,0.2)] hover:-translate-y-0.5 active:translate-y-0" title="Start Focus Timer">
                  <svg class="w-3 h-3 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                </button>
              </div>
            </div>
          </div>
        `;
      } else if (mode === 'workspace') {
        const blockingIconHtml = sub.isBlocking ? `
          <div title="Blocking Milestone" class="flex items-center justify-center w-5 h-5 rounded-full bg-red-500/20 text-red-500 border border-red-500/40 shrink-0 shadow-[0_0_10px_rgba(239,68,68,0.2)]">
            <svg class="w-3 h-3 fill-current" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
          </div>
        ` : '';

        return `
          <div class="flex items-center justify-between p-3.5 rounded-xl bg-[#0A0A0A] border ${sub.isBlocking ? 'border-red-500/30 bg-red-500/5' : 'border-[#202020] hover:border-[#343434]'} transition group gap-4">
            <div class="flex items-center space-x-3.5 overflow-hidden">
              <input type="checkbox" aria-label="Mark task ${sub.title} completed" onchange="${actionPrefix}toggleSubtask('${goalId}','${sub.id}')" ${sub.completed ? 'checked' : ''} class="w-4 h-4 rounded border-[#2A2A2A] bg-[#161616] text-[#A855F7] focus:ring-[#A855F7] cursor-pointer shrink-0" />
              <div class="truncate">
                <h4 class="text-xs font-semibold text-[#FAFAFA] ${sub.completed ? 'line-through text-[#6B7280]' : 'group-hover:text-[#A855F7]'} transition truncate flex items-center space-x-2">
                  <span>${sub.title}</span>
                  ${blockingIconHtml}
                </h4>
                <p class="text-[10px] text-[#6B7280] font-mono mt-0.5 truncate flex items-center gap-1.5">
                  <span>${sub._raw?.estimate || 'Task'}</span>
                </p>
              </div>
            </div>
            <div class="flex items-center space-x-2 shrink-0">
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${badgeColor} shrink-0">${sub.priority}</span>
              ${urgencyBadgeHtml}
              <div class="flex items-center bg-[#111116] border border-[#20202A] rounded-xl p-1 space-x-1 hover:border-[#303040] shadow-sm transition duration-300 ml-1">
                <button onclick="${actionPrefix}openSubtaskIdeaLab('${goalId}', '${sub.id}')" class="w-7 h-7 rounded-lg hover:bg-[#A855F7]/10 text-[#A855F7]/80 hover:text-[#A855F7] transition-all duration-200 ease-out flex items-center justify-center hover:shadow-[0_0_15px_rgba(168,85,247,0.2)] hover:-translate-y-0.5 active:translate-y-0" title="AI IdeaLab">
                  <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z"/></svg>
                </button>
                ${scheduleBtnHtml}
                <button onclick="${actionPrefix}startFocus()" class="w-7 h-7 rounded-lg hover:bg-[#FACC15]/10 text-[#FACC15]/80 hover:text-[#FACC15] transition-all duration-200 ease-out flex items-center justify-center hover:shadow-[0_0_15px_rgba(250,204,21,0.2)] hover:-translate-y-0.5 active:translate-y-0" title="Start Focus Timer">
                  <svg class="w-3 h-3 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                </button>
              </div>
            </div>
          </div>
        `;
      }
      return '';
    },

    /**
     * Render Sidebar
     */
    renderSidebar() {
      return window.StudyFlowTemplates && window.StudyFlowTemplates['components/sidebar.html'] ? window.StudyFlowTemplates['components/sidebar.html'] : '';
    },

    /**
     * Render Navbar
     */
    renderNavbar() {
      return window.StudyFlowTemplates && window.StudyFlowTemplates['components/navbar.html'] ? window.StudyFlowTemplates['components/navbar.html'] : '';
    },

    /**
     * Render Button
     * @param {Object} props
     */
    renderButton({ text = '', variant = 'primary', onClick = '', className = '', type = 'button', iconHtml = '' }) {
      let baseClass = 'btn text-xs font-bold transition flex items-center justify-center space-x-1.5 rounded-xl ';
      if (variant === 'primary') baseClass += 'btn-primary px-4 py-2.5 shadow-[0_0_20px_rgba(168,85,247,0.25)] ';
      else if (variant === 'secondary') baseClass += 'btn-secondary px-4 py-2.5 border-[#202020] hover:border-[#A855F7] ';
      else if (variant === 'ghost') baseClass += 'btn-ghost px-3 py-2 text-[#6B7280] hover:text-[#FAFAFA] ';

      return `<button type="${type}" ${onClick ? `onclick="${onClick}"` : ''} class="${baseClass} ${className}">${iconHtml}<span>${text}</span></button>`;
    },

    /**
     * Render Progress Bar
     */
    renderProgressBar(percentage = 0, options = {}) {
      const height = options.heightClass || 'h-1.5';
      const bg = options.bgClass || 'bg-[#151515]';
      return `
        <div class="w-full ${bg} ${height} rounded-full overflow-hidden border border-[#202020]">
          <div class="bg-[#A855F7] h-full rounded-full shadow-[0_0_10px_rgba(168,85,247,0.3)] transition-all duration-500" style="width: ${percentage}%;"></div>
        </div>
      `;
    },

    /**
     * Render Progress Ring
     */
    renderProgressRing(percentage = 0, options = {}) {
      const size = options.size || 100;
      const strokeWidth = options.strokeWidth || 6;
      const radius = (size - strokeWidth * 2) / 2;
      const circumference = radius * 2 * Math.PI;
      const offset = circumference - (percentage / 100) * circumference;

      return `
        <div class="relative flex items-center justify-center" style="width:${size}px; height:${size}px;">
          <svg class="w-full h-full transform -rotate-90" viewBox="0 0 ${size} ${size}">
            <circle cx="${size/2}" cy="${size/2}" r="${radius}" fill="none" stroke="#202020" stroke-width="${strokeWidth}" />
            <circle cx="${size/2}" cy="${size/2}" r="${radius}" fill="none" stroke="#A855F7" stroke-width="${strokeWidth}" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" stroke-linecap="round" class="transition-all duration-1000 shadow-[0_0_20px_rgba(168,85,247,0.25)]" />
          </svg>
          <div class="absolute text-sm font-mono font-bold text-[#FAFAFA]">${percentage}%</div>
        </div>
      `;
    },

    /**
     * Render Analytics Card
     */
    renderAnalyticsCard({ title, value, subtitle, iconHtml }) {
      return `
        <div class="card bg-[#0E0E0E] border border-[#202020] p-5 rounded-[20px] flex items-center justify-between relative overflow-hidden group hover:border-[#A855F7]/40 transition">
          <div class="space-y-1">
            <span class="text-xs font-semibold text-[#6B7280] uppercase tracking-wider block font-mono">${title}</span>
            <div class="text-2xl font-bold text-[#FAFAFA] font-mono tracking-tight">${value}</div>
            <p class="text-[11px] text-[#A1A1AA] flex items-center gap-1">${subtitle || ''}</p>
          </div>
          <div class="w-12 h-12 rounded-2xl bg-[#151515] border border-[#252525] flex items-center justify-center text-[#A855F7] text-xl group-hover:scale-110 transition shrink-0 shadow-[0_0_15px_rgba(168,85,247,0.15)]">
            ${iconHtml || '📊'}
          </div>
        </div>
      `;
    },

    /**
     * Render Modal Wrapper
     */
    renderModal({ id, title, subtitle, bodyHtml, footerHtml, iconHtml = '💡', maxWidth = 'max-w-2xl' }) {
      return `
        <div class="bg-[#0D0D0D] border border-[#2A2A2A] p-6 md:p-8 rounded-[24px] w-full ${maxWidth} shadow-[0_0_40px_rgba(168,85,247,0.18)] space-y-6 max-h-[90vh] overflow-y-auto animate-fadeIn">
          <div class="flex items-start justify-between pb-4 border-b border-[#1C1C1C] gap-4">
            <div class="flex items-center space-x-3.5">
              <div class="w-10 h-10 rounded-xl bg-[#A855F7]/20 border border-[#A855F7]/40 flex items-center justify-center text-[#A855F7] text-lg shrink-0 shadow-[0_0_15px_rgba(168,85,247,0.25)]">${iconHtml}</div>
              <div>
                ${subtitle ? `<span class="text-[10px] font-mono font-bold tracking-wider text-[#A855F7] uppercase">${subtitle}</span>` : ''}
                <h3 class="text-base font-bold text-[#FAFAFA]">${title}</h3>
              </div>
            </div>
            <button onclick="document.getElementById('${id}').style.display='none'" class="text-[#6B7280] hover:text-[#FAFAFA] text-lg p-1">✕</button>
          </div>
          <div class="space-y-4">
            ${bodyHtml || ''}
          </div>
          ${footerHtml ? `<div class="flex items-center justify-between pt-4 border-t border-[#1C1C1C]">${footerHtml}</div>` : ''}
        </div>
      `;
    },

    /**
     * Render Dialog
     */
    renderDialog({ title, message, onConfirm, confirmText = 'Confirm' }) {
      return this.renderModal({
        id: 'globalDialogModal',
        title,
        bodyHtml: `<p class="text-xs text-[#A1A1AA] leading-relaxed">${message}</p>`,
        footerHtml: `
          <button onclick="document.getElementById('globalDialogModal').style.display='none'" class="btn btn-ghost px-4 py-2 text-xs">Cancel</button>
          <button onclick="${onConfirm}; document.getElementById('globalDialogModal').style.display='none'" class="btn btn-primary px-5 py-2 text-xs font-bold">${confirmText}</button>
        `,
        maxWidth: 'max-w-md'
      });
    },

    /**
     * Render Loading Skeletons
     */
    renderSkeleton(type = 'card', count = 1) {
      let html = '';
      for (let i = 0; i < count; i++) {
        if (type === 'card' || type === 'compact') {
          html += `
            <div class="p-3.5 rounded-xl bg-[#0A0A0A] border border-[#202020] animate-pulse space-y-3">
              <div class="flex justify-between items-center"><div class="h-4 w-16 bg-[#181818] rounded"></div><div class="h-3 w-20 bg-[#181818] rounded"></div></div>
              <div class="space-y-1.5"><div class="h-4 w-3/4 bg-[#181818] rounded"></div><div class="h-3 w-1/2 bg-[#181818] rounded"></div></div>
              <div class="h-1.5 w-full bg-[#181818] rounded-full mt-2"></div>
            </div>
          `;
        } else if (type === 'grid') {
          html += `
            <div class="card bg-[#0E0E0E] border border-[#202020] p-6 rounded-[20px] animate-pulse h-48 flex flex-col justify-between space-y-4">
              <div class="space-y-2.5">
                <div class="flex justify-between items-center"><div class="h-4 w-20 bg-[#181818] rounded"></div><div class="h-3 w-24 bg-[#181818] rounded"></div></div>
                <div class="h-5 w-4/5 bg-[#181818] rounded"></div>
                <div class="h-3 w-full bg-[#181818] rounded"></div>
              </div>
              <div class="space-y-2 pt-4 border-t border-[#1C1C1C]">
                <div class="h-1.5 w-full bg-[#181818] rounded-full"></div>
                <div class="h-8 w-full bg-[#181818] rounded-xl"></div>
              </div>
            </div>
          `;
        } else if (type === 'row') {
          html += `
            <div class="flex items-center justify-between p-3.5 rounded-xl bg-[#0A0A0A] border border-[#202020] animate-pulse">
              <div class="flex items-center space-x-3.5"><div class="w-4 h-4 rounded bg-[#181818]"></div><div class="h-4 w-48 bg-[#181818] rounded"></div></div>
              <div class="h-5 w-14 bg-[#181818] rounded-full"></div>
            </div>
          `;
        }
      }
      return html;
    },

    /**
     * Render Empty State
     */
    renderEmptyState({ title = 'No items found', message = 'Get started by creating your first item below.', iconHtml = '📭', actionHtml = '' }) {
      return `
        <div class="p-8 rounded-2xl bg-[#0A0A0A]/60 border border-dashed border-[#2A2A2A] text-center space-y-3 my-4 animate-fadeIn">
          <div class="w-12 h-12 rounded-2xl bg-[#151515] border border-[#252525] flex items-center justify-center text-2xl mx-auto text-[#A855F7] shadow-[0_0_15px_rgba(168,85,247,0.15)]">${iconHtml}</div>
          <h4 class="text-sm font-bold text-[#FAFAFA]">${title}</h4>
          <p class="text-xs text-[#6B7280] max-w-sm mx-auto leading-relaxed">${message}</p>
          ${actionHtml ? `<div class="pt-2">${actionHtml}</div>` : ''}
        </div>
      `;
    },

    /**
     * Render Error Component
     */
    renderError({ title = 'Something went wrong', message = 'We encountered an error loading this section.', retryAction = 'window.location.reload()' }) {
      const alertSvg = `<svg class="w-5 h-5 text-red-400 fill-current" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>`;
      return `
        <div class="p-6 rounded-2xl bg-red-500/10 border border-red-500/30 text-center space-y-3 my-4 animate-fadeIn" role="alert">
          <div class="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center mx-auto shadow-[0_0_15px_rgba(239,68,68,0.2)]">${alertSvg}</div>
          <h4 class="text-sm font-bold text-red-400">${title}</h4>
          <p class="text-xs text-[#A1A1AA] max-w-md mx-auto leading-relaxed">${message}</p>
          <button onclick="${retryAction}" class="px-4 py-2 bg-[#151515] hover:bg-red-500/20 text-red-400 rounded-xl text-xs font-bold transition border border-red-500/30">Try Again</button>
        </div>
      `;
    },

    /**
     * Show Custom StudyFlow Confirmation Modal
     */
    showConfirm(options = {}) {
      const {
        title = "Delete Goal?",
        description = "This action cannot be undone. The goal and all of its subtasks will be permanently deleted.",
        confirmText = "Delete Goal",
        cancelText = "Cancel",
        onConfirm = () => {},
        onCancel = () => {}
      } = options;

      const existing = document.getElementById('sf-confirm-modal');
      if (existing) existing.remove();

      const trashSvg = `<svg class="w-4 h-4 shrink-0 fill-current" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>`;

      const modalHtml = `
        <div id="sf-confirm-modal" class="sf-confirm-overlay fixed inset-0 z-[200000] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn transition-opacity duration-200" role="dialog" aria-modal="true" aria-labelledby="sf-confirm-title">
          <div id="sf-confirm-card" class="bg-[#0E0E0E]/95 border border-[#2A2A2A] rounded-2xl p-6 max-w-md w-full mx-4 shadow-[0_0_50px_rgba(168,85,247,0.15)] relative transform transition-all duration-200 scale-95 opacity-0">
            <div class="flex items-start space-x-4">
              <div class="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shrink-0 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                ${trashSvg}
              </div>
              <div class="flex-1 space-y-1.5">
                <h3 id="sf-confirm-title" class="text-base font-bold text-[#FAFAFA]">${title}</h3>
                <p class="text-xs text-[#A1A1AA] leading-relaxed">${description}</p>
              </div>
            </div>
            <div class="flex items-center justify-end space-x-3 mt-6 pt-4 border-t border-[#1C1C1C]">
              <button id="sf-confirm-cancel-btn" class="px-4 py-2 rounded-xl bg-[#151515] hover:bg-[#202020] text-[#A1A1AA] hover:text-[#FAFAFA] text-xs font-bold transition border border-[#2A2A2A]">
                ${cancelText}
              </button>
              <button id="sf-confirm-proceed-btn" class="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white text-xs font-bold transition shadow-[0_0_15px_rgba(239,68,68,0.3)] flex items-center space-x-1.5">
                ${trashSvg}
                <span>${confirmText}</span>
              </button>
            </div>
          </div>
        </div>
      `;

      document.body.insertAdjacentHTML('beforeend', modalHtml);

      const modalEl = document.getElementById('sf-confirm-modal');
      const cardEl = document.getElementById('sf-confirm-card');
      const cancelBtn = document.getElementById('sf-confirm-cancel-btn');
      const proceedBtn = document.getElementById('sf-confirm-proceed-btn');

      requestAnimationFrame(() => {
        if (cardEl) {
          cardEl.classList.remove('scale-95', 'opacity-0');
          cardEl.classList.add('scale-100', 'opacity-100');
        }
        if (cancelBtn) cancelBtn.focus();
      });

      const close = () => {
        if (cardEl) {
          cardEl.classList.remove('scale-100', 'opacity-100');
          cardEl.classList.add('scale-95', 'opacity-0');
        }
        if (modalEl) modalEl.classList.add('opacity-0');
        setTimeout(() => {
          if (modalEl) modalEl.remove();
          document.removeEventListener('keydown', keydownHandler);
        }, 150);
      };

      const keydownHandler = (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onCancel();
          close();
        } else if (e.key === 'Tab') {
          if (document.activeElement === proceedBtn && !e.shiftKey) {
            e.preventDefault();
            cancelBtn.focus();
          } else if (document.activeElement === cancelBtn && e.shiftKey) {
            e.preventDefault();
            proceedBtn.focus();
          }
        }
      };

      document.addEventListener('keydown', keydownHandler);

      cancelBtn.addEventListener('click', () => {
        onCancel();
        close();
      });

      proceedBtn.addEventListener('click', () => {
        close();
        onConfirm();
      });

      modalEl.addEventListener('click', (e) => {
        if (e.target === modalEl) {
          onCancel();
          close();
        }
      });
    },

    confirm(options = {}) {
      return this.showConfirm(options);
    },

    /**
     * Show Floating Toast Notification
     */
    showToast(message, type = 'info', duration = 3500) {
      let container = document.getElementById('sf-toast-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'sf-toast-container';
        container.className = 'sf-toast-container fixed bottom-5 right-5 z-[2147483647] flex flex-col gap-2.5 pointer-events-none max-w-xs w-full px-4 md:px-0';
        document.body.appendChild(container);
      }
      container.style.setProperty('z-index', '2147483647', 'important');
      if (container !== document.body.lastElementChild) {
        document.body.appendChild(container);
      }

      const toastId = 'toast-' + Math.random().toString(36).substring(2, 9);
      const toastEl = document.createElement('div');
      toastEl.id = toastId;

      let icon = `<svg class="w-4 h-4 text-[#A855F7] fill-current" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>`;
      let borderGlow = 'border-[#A855F7]/40 text-[#FAFAFA] bg-[#0D0D0D]/95 shadow-[0_0_20px_rgba(168,85,247,0.2)]';
      if (type === 'success') {
        icon = `<svg class="w-4 h-4 text-green-400 fill-current" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`;
        borderGlow = 'border-green-500/40 text-[#FAFAFA] bg-[#0D0D0D]/95 shadow-[0_0_20px_rgba(34,197,94,0.2)]';
      } else if (type === 'error') {
        icon = `<svg class="w-4 h-4 text-red-400 fill-current" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>`;
        borderGlow = 'border-red-500/40 text-red-400 bg-[#0D0D0D]/95 shadow-[0_0_20px_rgba(239,68,68,0.2)]';
      }

      toastEl.className = `pointer-events-auto flex items-center justify-between p-3.5 rounded-xl border backdrop-blur-md transition-all duration-300 transform translate-y-2 opacity-0 ${borderGlow}`;
      toastEl.innerHTML = `
        <div class="flex items-center space-x-3 overflow-hidden">
          <span class="shrink-0 flex items-center">${icon}</span>
          <span class="text-xs font-semibold truncate">${message}</span>
        </div>
        <button onclick="const t = document.getElementById('${toastId}'); if(t) { t.style.opacity='0'; setTimeout(()=>t.remove(),200); }" class="text-[#6B7280] hover:text-[#FAFAFA] ml-3 text-xs shrink-0">✕</button>
      `;

      container.appendChild(toastEl);

      // Animate in
      requestAnimationFrame(() => {
        toastEl.classList.remove('translate-y-2', 'opacity-0');
      });

      // Auto dismiss
      setTimeout(() => {
        if (document.getElementById(toastId)) {
          toastEl.style.opacity = '0';
          toastEl.style.transform = 'translateY(8px)';
          setTimeout(() => {
            if (toastEl && toastEl.parentNode) toastEl.remove();
          }, 250);
        }
      }, duration);
    }
  };

  window.calculateGoalProgress = window.SF_COMPONENTS.calculateGoalProgress;
})();

// Premium Schedule Milestone Modal
window.ScheduleModal = {
  date: new Date(),
  timeStr: '09:00',
  duration: 60,
  
  open(goalId, milestoneId) {
    const goal = window.SF_STORE?.state?.goals?.items?.find(g => g.id === goalId) || { title: 'Goal' };
    const milestone = goal.subtasks?.find(s => s.id === milestoneId) || { title: 'Milestone', priority: 'High', estimate: '1 hr' };
    
    this.goalId = goalId;
    this.milestoneId = milestoneId;
    this.goalTitle = goal.title;
    this.milestoneTitle = milestone.title;
    this.milestonePriority = milestone.priority || 'High';
    this.milestoneEstimate = milestone.estimate || '1 hr';
    
    const now = new Date();
    this.date = now;
    let h = now.getHours() + 1;
    if (h > 23) h = 23;
    this.timeStr = `${String(h).padStart(2, '0')}:00`;
    this.duration = 60;
    
    this.currentMonth = this.date.getMonth();
    this.currentYear = this.date.getFullYear();
    
    this.render();
  },

  render() {
    let modalEl = document.getElementById('globalScheduleModal');
    if (!modalEl) {
      modalEl = document.createElement('div');
      modalEl.id = 'globalScheduleModal';
      modalEl.className = 'fixed inset-0 z-[999999999] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn p-4';
      document.body.appendChild(modalEl);
      
      modalEl.addEventListener('click', e => {
        if (e.target === modalEl) this.close();
      });
    }

    modalEl.innerHTML = this.getModalHtml();
    modalEl.style.display = 'flex';
    
    this.updateDisplay();

    // Close dropdowns on outside click within modal
    modalEl.querySelector('.modal-content-box').addEventListener('click', e => {
      if (!e.target.closest('#sm-date-wrapper')) document.getElementById('sm-date-dropdown').classList.add('hidden');
      if (!e.target.closest('#sm-time-wrapper')) document.getElementById('sm-time-dropdown').classList.add('hidden');
    });
  },
  
  close() {
    const modalEl = document.getElementById('globalScheduleModal');
    if (modalEl) {
      modalEl.classList.remove('animate-fadeIn');
      modalEl.style.opacity = '0';
      setTimeout(() => {
        modalEl.style.display = 'none';
        modalEl.style.opacity = '1';
        modalEl.classList.add('animate-fadeIn');
      }, 200);
    }
  },

  getModalHtml() {
    const badgeColor = this.milestonePriority === 'High' ? 'text-red-400 bg-red-500/10 border-red-500/20' : this.milestonePriority === 'Medium' ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' : 'text-green-400 bg-green-500/10 border-green-500/20';

    return `
      <div class="modal-content-box bg-[#0D0D0D] border border-[#2A2A2A] p-[22px] rounded-[20px] w-full max-w-[420px] shadow-saas relative animate-scaleIn flex flex-col gap-[18px]">
        
        <!-- Header -->
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3.5">
            <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-[#A855F7]/20 to-[#A855F7]/5 border border-[#A855F7]/30 flex items-center justify-center text-[#A855F7] shadow-[0_0_15px_rgba(168,85,247,0.25)]">
              <svg class="w-[18px] h-[18px] fill-current" viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7v-5z"/></svg>
            </div>
            <h3 class="text-[17px] font-bold text-[#FAFAFA] tracking-tight">Schedule to Planner</h3>
          </div>
          <button onclick="window.ScheduleModal.close()" class="w-7 h-7 flex items-center justify-center rounded-full text-[#6B7280] hover:bg-[#1A1A24] hover:text-[#FAFAFA] transition duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0">
            <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg>
          </button>
        </div>

        <!-- Premium Context Card -->
        <div class="bg-gradient-to-br from-[#121218] to-[#0D0D12] border border-[#22222E] rounded-[14px] p-3.5 flex flex-col shadow-inner">
          <div class="flex items-center space-x-1.5 text-[#A1A1AA] mb-2.5 border-b border-[#22222E] pb-2">
            <svg class="w-[14px] h-[14px] fill-current" viewBox="0 0 24 24"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>
            <span class="text-[10px] font-bold tracking-widest uppercase">Goal</span>
            <span class="text-[12px] font-medium text-[#D4D4D8] truncate ml-1">${this.goalTitle}</span>
          </div>
          <div class="flex flex-col gap-1">
            <div class="flex items-center space-x-1.5 text-[#A855F7]">
              <svg class="w-[14px] h-[14px] fill-current" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
              <span class="text-[10px] font-bold tracking-widest uppercase">Milestone</span>
            </div>
            <div class="text-[15px] font-bold text-[#FAFAFA] truncate">${this.milestoneTitle}</div>
            <div class="flex items-center space-x-2 mt-1">
              <span class="px-2 py-[3px] rounded-full text-[9px] font-bold border ${badgeColor}">${this.milestonePriority} Priority</span>
              <span class="text-[10px] font-medium text-[#6B7280]">Est. ${this.milestoneEstimate}</span>
            </div>
          </div>
        </div>
        
        <!-- Pickers Row -->
        <div class="grid grid-cols-2 gap-4">
          
          <!-- Date Picker -->
          <div id="sm-date-wrapper" class="relative">
            <label class="block text-[11px] font-bold text-[#8A8A98] uppercase tracking-wider mb-2">Date</label>
            <div onclick="window.ScheduleModal.toggleDatePicker()" class="w-full bg-[#111116] border border-[#2A2A35] hover:border-[#A855F7]/50 rounded-[12px] px-[15px] py-[13px] flex items-center justify-between cursor-pointer transition-all duration-200 ease-out group shadow-sm">
              <span id="sm-date-display" class="text-[14px] font-semibold text-[#A1A1AA]">Choose a date</span>
              <svg class="w-[18px] h-[18px] text-[#6B7280] group-hover:text-[#A855F7] transition duration-200 ease-out" viewBox="0 0 24 24"><path fill="currentColor" d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7v-5z"/></svg>
            </div>
            
            <div id="sm-date-dropdown" class="hidden absolute top-[calc(100%+8px)] left-0 min-w-[220px] bg-[#12121A]/95 backdrop-blur-xl border border-[#2A2A38] rounded-xl shadow-[0_12px_35px_rgba(0,0,0,0.85)] p-3 z-[999999999] animate-scaleIn origin-top">
              <div class="flex items-center justify-between mb-2">
                <button type="button" onclick="window.ScheduleModal.changeMonth(-1); event.stopPropagation();" class="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-[#1A1A24] hover:text-[#FAFAFA] text-[#A1A1AA] transition-all duration-200 ease-out">&lsaquo;</button>
                <div id="sm-calendar-title" class="text-[12px] font-bold text-[#FAFAFA] tracking-wide"></div>
                <button type="button" onclick="window.ScheduleModal.changeMonth(1); event.stopPropagation();" class="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-[#1A1A24] hover:text-[#FAFAFA] text-[#A1A1AA] transition-all duration-200 ease-out">&rsaquo;</button>
              </div>
              <div class="grid grid-cols-7 gap-1 text-center text-[9px] font-bold text-[#6B7280] mb-2">
                <div>SU</div><div>MO</div><div>TU</div><div>WE</div><div>TH</div><div>FR</div><div>SA</div>
              </div>
              <div id="sm-calendar-grid" class="grid grid-cols-7 gap-1"></div>
            </div>
          </div>

          <!-- Time Picker -->
          <div id="sm-time-wrapper" class="relative">
            <label class="block text-[11px] font-bold text-[#8A8A98] uppercase tracking-wider mb-2">Time</label>
            <div onclick="window.ScheduleModal.toggleTimePicker()" class="w-full bg-[#111116] border border-[#2A2A35] hover:border-[#A855F7]/50 rounded-[12px] px-[15px] py-[13px] flex items-center justify-between cursor-pointer transition-all duration-200 ease-out group shadow-sm">
              <span id="sm-time-display" class="text-[14px] font-semibold text-[#A1A1AA]">Choose a time</span>
              <svg class="w-[18px] h-[18px] text-[#6B7280] group-hover:text-[#A855F7] transition duration-200 ease-out" viewBox="0 0 24 24"><path fill="currentColor" d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
            </div>
            <div id="sm-time-dropdown" class="hidden absolute top-[calc(100%+8px)] left-0 right-0 bg-[#12121A]/95 backdrop-blur-xl border border-[#2A2A38] rounded-xl shadow-[0_12px_35px_rgba(0,0,0,0.85)] p-1 z-[999999999] animate-scaleIn origin-top font-mono text-xs">
            </div>
          </div>
        </div>

        <!-- Duration Quick Chips (No Dropdown) -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="block text-[11px] font-bold text-[#8A8A98] uppercase tracking-wider">Duration</label>
            <span id="sm-duration-display" class="text-[12px] font-semibold text-[#A855F7]">60 min</span>
          </div>
          <div class="flex items-center gap-2.5 flex-wrap">
             <div onclick="window.ScheduleModal.selectDuration(30)" class="duration-chip px-3.5 py-2 rounded-full text-[13px] font-bold cursor-pointer transition-all duration-200 ease-out border border-[#2A2A35] text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#1A1A24] hover:scale-105 active:scale-95">30m</div>
             <div onclick="window.ScheduleModal.selectDuration(45)" class="duration-chip px-3.5 py-2 rounded-full text-[13px] font-bold cursor-pointer transition-all duration-200 ease-out border border-[#2A2A35] text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#1A1A24] hover:scale-105 active:scale-95">45m</div>
             <div onclick="window.ScheduleModal.selectDuration(60)" class="duration-chip px-3.5 py-2 rounded-full text-[13px] font-bold cursor-pointer transition-all duration-200 ease-out border border-[#2A2A35] text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#1A1A24] hover:scale-105 active:scale-95">60m</div>
             <div onclick="window.ScheduleModal.selectDuration(90)" class="duration-chip px-3.5 py-2 rounded-full text-[13px] font-bold cursor-pointer transition-all duration-200 ease-out border border-[#2A2A35] text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#1A1A24] hover:scale-105 active:scale-95">90m</div>
             <div onclick="window.ScheduleModal.selectDuration(120)" class="duration-chip px-3.5 py-2 rounded-full text-[13px] font-bold cursor-pointer transition-all duration-200 ease-out border border-[#2A2A35] text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#1A1A24] hover:scale-105 active:scale-95">120m</div>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-end space-x-2 pt-3 border-t border-[#22222E]">
          <button type="button" onclick="window.ScheduleModal.close()" class="px-4.5 py-2 rounded-[10px] text-[13px] font-bold text-[#8A8A98] hover:text-[#FAFAFA] transition duration-200 ease-out hover:bg-[#1A1A24]">Cancel</button>
          <button type="button" onclick="window.ScheduleModal.submit()" id="scheduleSubmitBtn" class="px-6 py-2.5 rounded-[10px] bg-gradient-to-r from-[#A855F7] to-[#9333EA] hover:from-[#9333EA] hover:to-[#7E22CE] text-white text-[13.5px] font-bold shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all duration-200 ease-out flex items-center space-x-1.5 hover:-translate-y-0.5 active:translate-y-0">
            <span id="scheduleSubmitText">Schedule to Planner</span>
            <svg id="scheduleSubmitSpinner" class="animate-spin -mr-1 ml-2 h-4 w-4 text-white hidden" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </button>
        </div>
      </div>
    `;
  },

  updateDisplay() {
    const dStr = this.date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
    document.getElementById('sm-date-display').innerText = dStr;

    let [h, m] = this.timeStr.split(':').map(Number);
    let ampm = h >= 12 ? 'PM' : 'AM';
    let hr12 = h % 12 || 12;
    document.getElementById('sm-time-display').innerText = `${String(hr12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;

    document.getElementById('sm-duration-display').innerText = `${this.duration} min`;
    
    // Update chips visual state
    const chips = document.querySelectorAll('.duration-chip');
    chips.forEach(chip => {
      const val = parseInt(chip.innerText);
      if (val === this.duration) {
        chip.className = "duration-chip px-3 py-1.5 rounded-full text-[12px] font-bold cursor-pointer transition-all duration-200 ease-out bg-[#A855F7]/20 border border-[#A855F7]/50 text-[#FAFAFA] shadow-[0_0_12px_rgba(168,85,247,0.3)] hover:scale-105 active:scale-95";
      } else {
        chip.className = "duration-chip px-3 py-1.5 rounded-full text-[12px] font-bold cursor-pointer transition-all duration-200 ease-out border border-[#2A2A35] text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#1A1A24] hover:scale-105 active:scale-95";
      }
    });
    
    this.renderCalendar();
    this.renderTimePicker();
  },

  toggleDatePicker() {
    const dd = document.getElementById('sm-date-dropdown');
    const wasHidden = dd.classList.contains('hidden');
    this.hideAllDropdowns();
    if (wasHidden) dd.classList.remove('hidden');
  },

  toggleTimePicker() {
    const dd = document.getElementById('sm-time-dropdown');
    const wasHidden = dd.classList.contains('hidden');
    this.hideAllDropdowns();
    if (wasHidden) dd.classList.remove('hidden');
  },

  hideAllDropdowns() {
    document.getElementById('sm-date-dropdown').classList.add('hidden');
    document.getElementById('sm-time-dropdown').classList.add('hidden');
  },

  changeMonth(dir) {
    this.currentMonth += dir;
    if (this.currentMonth > 11) { this.currentMonth = 0; this.currentYear++; }
    if (this.currentMonth < 0) { this.currentMonth = 11; this.currentYear--; }
    this.renderCalendar();
  },

  selectDate(d, e) {
    e.stopPropagation();
    this.date = new Date(this.currentYear, this.currentMonth, d);
    this.hideAllDropdowns();
    this.updateDisplay();
  },

  renderCalendar() {
    const grid = document.getElementById('sm-calendar-grid');
    if (!grid) return;
    grid.innerHTML = '';
    
    const d = new Date(this.currentYear, this.currentMonth, 1);
    const monthName = d.toLocaleString('default', { month: 'long' });
    document.getElementById('sm-calendar-title').innerText = `${monthName} ${this.currentYear}`;
    
    const startDay = d.getDay();
    const daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(this.currentYear, this.currentMonth, 0).getDate();
    
    for (let i = 0; i < startDay; i++) {
      grid.innerHTML += `<div class="p-1 text-center text-[10px] font-medium text-[#3A3A3A]">${daysInPrevMonth - startDay + i + 1}</div>`;
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      const isSelected = (this.date.getDate() === i && this.date.getMonth() === this.currentMonth && this.date.getFullYear() === this.currentYear);
      const isToday = (new Date().getDate() === i && new Date().getMonth() === new Date().getMonth() && new Date().getFullYear() === new Date().getFullYear());
      
      let classes = "p-1 text-center text-[11px] font-bold rounded-[6px] cursor-pointer transition-all duration-200 ease-out flex items-center justify-center w-6 h-6 mx-auto ";
      if (isSelected) {
        classes += "bg-[#A855F7] text-white shadow-[0_0_12px_rgba(168,85,247,0.5)] scale-110";
      } else if (isToday) {
        classes += "text-[#A855F7] border border-[#A855F7]/30 hover:bg-[#1A1A24] hover:scale-105 active:scale-95";
      } else {
        classes += "text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#1A1A24] hover:scale-105 active:scale-95";
      }
      
      grid.innerHTML += `<div><div onclick="window.ScheduleModal.selectDate(${i}, event)" class="${classes}">${i}</div></div>`;
    }
    
    const remaining = 42 - (startDay + daysInMonth);
    for (let i = 1; i <= remaining && i <= 14; i++) {
      grid.innerHTML += `<div class="p-1 text-center text-[10px] font-medium text-[#3A3A3A] flex items-center justify-center w-6 h-6 mx-auto">${i}</div>`;
    }
  },

  selectHour(hr12, e) {
    e.stopPropagation();
    let [h, m] = this.timeStr.split(':').map(Number);
    let ampm = h >= 12 ? 'PM' : 'AM';
    let newH = ampm === 'PM' ? (hr12 === 12 ? 12 : hr12 + 12) : (hr12 === 12 ? 0 : hr12);
    this.timeStr = `${String(newH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    this.updateDisplay();
  },

  selectMinute(m, e) {
    e.stopPropagation();
    let [h, _oldM] = this.timeStr.split(':').map(Number);
    this.timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    this.updateDisplay();
  },

  selectAmPm(newAmPm, e) {
    e.stopPropagation();
    let [h, m] = this.timeStr.split(':').map(Number);
    let ampm = h >= 12 ? 'PM' : 'AM';
    if (newAmPm !== ampm) {
      if (newAmPm === 'PM') h = (h % 12) + 12;
      else h = h % 12;
    }
    this.timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    this.updateDisplay();
  },

  renderTimePicker() {
    const container = document.getElementById('sm-time-dropdown');
    if (!container) return;
    
    let [h, m] = this.timeStr.split(':').map(Number);
    let ampm = h >= 12 ? 'PM' : 'AM';
    let hr12 = h % 12 || 12;
    
    let hrHtml = '';
    for (let i = 1; i <= 12; i++) {
      const isSel = i === hr12;
      hrHtml += `<div onclick="window.ScheduleModal.selectHour(${i}, event)" class="py-0.5 rounded text-[11px] cursor-pointer text-center transition-all duration-150 ${isSel ? 'bg-[#A855F7] text-white font-bold shadow-[0_0_10px_rgba(168,85,247,0.4)]' : 'hover:bg-[#20202A] text-[#A1A1AA] hover:text-white'}">${String(i).padStart(2, '0')}</div>`;
    }

    let minHtml = '';
    for (let i = 0; i < 60; i += 5) {
      const isSel = i === m || (Math.abs(i - m) < 5 && i <= m && (i+5 > m));
      minHtml += `<div onclick="window.ScheduleModal.selectMinute(${i}, event)" class="py-0.5 rounded text-[11px] cursor-pointer text-center transition-all duration-150 ${isSel ? 'bg-[#A855F7] text-white font-bold shadow-[0_0_10px_rgba(168,85,247,0.4)]' : 'hover:bg-[#20202A] text-[#A1A1AA] hover:text-white'}">${String(i).padStart(2, '0')}</div>`;
    }

    let ampmHtml = `<div onclick="window.ScheduleModal.selectAmPm('AM', event)" class="py-1 rounded text-[11px] cursor-pointer text-center transition-all duration-150 ${ampm === 'AM' ? 'bg-[#A855F7] text-white font-bold shadow-[0_0_10px_rgba(168,85,247,0.4)]' : 'hover:bg-[#20202A] text-[#A1A1AA] hover:text-white'}">AM</div>`;
    ampmHtml += `<div onclick="window.ScheduleModal.selectAmPm('PM', event)" class="py-1 rounded text-[11px] cursor-pointer text-center transition-all duration-150 ${ampm === 'PM' ? 'bg-[#A855F7] text-white font-bold shadow-[0_0_10px_rgba(168,85,247,0.4)]' : 'hover:bg-[#20202A] text-[#A1A1AA] hover:text-white'}">PM</div>`;
    
    container.innerHTML = `<div class="grid grid-cols-3 gap-1 text-center h-32 select-none"><div class="flex flex-col border-r border-[#2A2A38]/60 pr-1 overflow-hidden"><div class="text-[9px] font-bold text-[#A855F7] pb-1 sticky top-0 bg-[#12121A]">HR</div><div class="overflow-y-auto space-y-0.5 flex-1 sf-scrollbar pr-0.5">${hrHtml}</div></div><div class="flex flex-col border-r border-[#2A2A38]/60 px-1 overflow-hidden"><div class="text-[9px] font-bold text-[#A855F7] pb-1 sticky top-0 bg-[#12121A]">MIN</div><div class="overflow-y-auto space-y-0.5 flex-1 sf-scrollbar pr-0.5">${minHtml}</div></div><div class="flex flex-col pl-1 overflow-hidden"><div class="text-[9px] font-bold text-[#A855F7] pb-1 sticky top-0 bg-[#12121A]">AM/PM</div><div class="overflow-y-auto space-y-1 flex-1 sf-scrollbar pr-0.5">${ampmHtml}</div></div></div>`;
  },

  selectDuration(mins) {
    this.duration = mins;
    this.updateDisplay();
  },

  async submit() {
    const btn = document.getElementById('scheduleSubmitBtn');
    btn.disabled = true;
    btn.style.opacity = '0.7';
    btn.style.transform = 'scale(0.98)';
    document.getElementById('scheduleSubmitText').textContent = 'Scheduling...';
    document.getElementById('scheduleSubmitSpinner').classList.remove('hidden');

    try {
      let [h, m] = this.timeStr.split(':').map(Number);
      const start = new Date(this.date);
      start.setHours(h, m, 0, 0);
      
      const end = new Date(start);
      end.setMinutes(end.getMinutes() + this.duration);
      
      const payload = {
        goalId: this.goalId,
        milestoneId: this.milestoneId,
        startTime: start.toISOString(),
        endTime: end.toISOString()
      };
      
      await window.SF_STORE.dispatch('planner/SCHEDULE_MILESTONE', payload);
      
      document.getElementById('scheduleSubmitSpinner').classList.add('hidden');
      document.getElementById('scheduleSubmitText').innerHTML = '✓ Scheduled';
      btn.style.opacity = '1';
      btn.className = "px-7 py-3 rounded-[12px] bg-[#16A34A] text-white text-[14px] font-bold shadow-[0_0_24px_rgba(22,163,74,0.4)] transition-all duration-200 ease-out flex items-center justify-center space-x-2";
      
      setTimeout(() => {
        this.close();
        if (window.SF_COMPONENTS && window.SF_COMPONENTS.showToast) {
          window.SF_COMPONENTS.showToast('Milestone scheduled successfully!', 'success');
        }
      }, 1000);
    } catch (error) {
      if (window.SF_COMPONENTS && window.SF_COMPONENTS.showToast) {
        window.SF_COMPONENTS.showToast(error.message || 'Failed to schedule milestone.', 'error');
      }
    } finally {
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.style.transform = 'none';
      document.getElementById('scheduleSubmitText').textContent = 'Schedule to Planner';
      document.getElementById('scheduleSubmitSpinner').classList.add('hidden');
    }
  }
};

window.openScheduleMilestoneModal = function(goalId, milestoneId) {
  window.ScheduleModal.open(goalId, milestoneId);
};


window.createDeadlineSelector = function(containerElement, initialValue = null) {
  if (!containerElement) {
    console.error('createDeadlineSelector requires a container element');
    return null;
  }

  let state = {
    mode: 'NONE',
    date: '',
    time: '',
    value: '',
    unit: 'days'
  };

  if (initialValue) {
    if (typeof initialValue === 'object') {
      state = { ...state, ...initialValue };
    } else if (typeof initialValue === 'string') {
      if (/^\d{4}-\d{2}-\d{2}$/.test(initialValue) || /^\d{4}-\d{2}-\d{2}T/.test(initialValue)) {
        state.mode = 'SPECIFIC_DATE';
        state.date = initialValue.substring(0, 10);
      } else {
        state.mode = 'NONE';
      }
    }
  }

  containerElement.innerHTML = `
    <div class="space-y-3">
      <div class="flex p-1 space-x-1 bg-[#0A0A0A] rounded-xl border border-[#202020] text-xs">
        <button type="button" data-mode="NONE" class="flex-1 py-1.5 px-3 rounded-lg text-center font-medium transition-all duration-200 hover:text-white text-[#A1A1AA]">No Deadline</button>
        <button type="button" data-mode="SPECIFIC_DATE" class="flex-1 py-1.5 px-3 rounded-lg text-center font-medium transition-all duration-200 hover:text-white text-[#A1A1AA]">Specific Date</button>
        <button type="button" data-mode="DURATION" class="flex-1 py-1.5 px-3 rounded-lg text-center font-medium transition-all duration-200 hover:text-white text-[#A1A1AA]">Duration</button>
      </div>

      <div class="relative transition-all duration-300" style="min-height: 48px;" id="deadline-panels-container">
        
        <div data-panel="NONE" class="absolute inset-0 transition-opacity duration-300 flex items-center justify-center opacity-0 pointer-events-none">
          <span class="text-[#A1A1AA] text-xs italic">This goal has no deadline.</span>
        </div>

        <div data-panel="SPECIFIC_DATE" class="absolute inset-0 transition-opacity duration-300 flex flex-col gap-2 opacity-0 pointer-events-none">
          <div class="flex items-center gap-2">
            <div class="relative sf-custom-select-container flex-grow">
              <input type="date" id="dl-date" class="hidden" value="${state.date}" />
              <button type="button" id="btn-dl-date" onclick="this.nextElementSibling.classList.toggle('hidden')" class="w-full px-3 py-2.5 rounded-xl bg-[#0A0A0A] border border-[#2A2A2A] hover:border-[#A855F7]/60 text-white text-xs font-semibold focus:outline-none focus:border-[#A855F7] transition-all duration-200 flex items-center justify-between group">
                <span id="sf-display-dl-date" class="flex items-center gap-2 text-white">${state.date ? new Date(state.date + 'T00:00:00').toLocaleDateString('en-US', {month:'2-digit', day:'2-digit', year:'numeric'}) : 'mm/dd/yyyy'}</span>
                <svg class="w-3.5 h-3.5 text-[#A1A1AA] group-hover:text-white transition-transform shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              </button>
              <div id="sf-menu-dl-date" class="hidden absolute left-0 bottom-full mb-2 w-[260px] bg-[#12121A]/95 backdrop-blur-xl border border-[#2A2A38] rounded-xl shadow-[0_12px_35px_rgba(0,0,0,0.85)] p-3 z-[999999999] select-none origin-bottom animate-scaleIn">
                <div class="flex items-center justify-between mb-3 px-1">
                  <button type="button" id="dl-cal-prev" class="text-[#A1A1AA] hover:text-white p-1 rounded hover:bg-white/5 transition"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg></button>
                  <span id="dl-cal-title" class="text-white text-[13px] font-bold tracking-wide">Month Year</span>
                  <button type="button" id="dl-cal-next" class="text-[#A1A1AA] hover:text-white p-1 rounded hover:bg-white/5 transition"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg></button>
                </div>
                <div class="grid grid-cols-7 gap-1 mb-2 text-center text-[10px] font-bold text-[#A1A1AA]">
                  <div>SU</div><div>MO</div><div>TU</div><div>WE</div><div>TH</div><div>FR</div><div>SA</div>
                </div>
                <div id="dl-cal-grid" class="grid grid-cols-7 gap-1"></div>
                <div class="flex justify-between mt-3 pt-3 border-t border-[#2A2A38]/50 text-xs text-[#A855F7] font-semibold">
                  <button type="button" id="dl-cal-clear" class="hover:text-white hover:bg-white/5 px-2 py-1 rounded transition">Clear</button>
                  <button type="button" id="dl-cal-today" class="hover:text-white hover:bg-white/5 px-2 py-1 rounded transition">Today</button>
                </div>
              </div>
            </div>
            <div class="relative sf-custom-select-container w-[130px]">
              <input type="time" id="dl-time" class="hidden" value="${state.time}" />
              <button type="button" id="btn-dl-time" class="w-full px-3 py-2.5 rounded-xl bg-[#0A0A0A] border border-[#2A2A2A] hover:border-[#A855F7]/60 text-white text-xs font-mono font-semibold focus:outline-none focus:border-[#A855F7] transition-all duration-200 flex items-center justify-between group">
                <span id="sf-display-dl-time" class="flex items-center gap-2 text-white text-[11px]">${state.time ? (() => { let [h,m]=state.time.split(':'); return (h%12||12)+':'+m+' '+(h>=12?'PM':'AM'); })() : 'Time'}</span>
                <svg class="w-3.5 h-3.5 text-[#A1A1AA] group-hover:text-white transition-transform shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
              </button>
              <div id="sf-menu-dl-time" class="hidden absolute right-0 bottom-full mb-2 w-[200px] bg-[#12121A]/95 backdrop-blur-xl border border-[#2A2A38] rounded-xl shadow-[0_12px_35px_rgba(0,0,0,0.85)] p-1 z-[999999999] font-mono text-xs origin-bottom animate-scaleIn">
                <!-- Injected via JS -->
              </div>
            </div>
          </div>
          <span class="text-[#A1A1AA] text-[10px] pl-1">If no time is selected, the deadline will only use the selected date.</span>
        </div>

        <div data-panel="DURATION" class="absolute inset-0 transition-opacity duration-300 flex flex-col gap-2 opacity-0 pointer-events-none">
          <div class="flex items-center gap-2">
            <div class="flex items-center bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl focus-within:border-[#A855F7] transition-colors h-[38px] shrink-0">
              <button type="button" class="w-7 h-full flex items-center justify-center text-[#A1A1AA] hover:text-white hover:bg-white/5 rounded-l-xl transition font-medium" onclick="const i=this.nextElementSibling; i.value=Math.max(1, (parseInt(i.value)||0)-1); i.dispatchEvent(new Event('input'))">−</button>
              <input type="number" id="dl-value" min="1" placeholder="1" class="w-10 h-full p-0 text-center text-xs bg-transparent border-none text-white outline-none no-spinners" value="${state.value || 1}" />
              <button type="button" class="w-7 h-full flex items-center justify-center text-[#A1A1AA] hover:text-white hover:bg-white/5 rounded-r-xl transition font-medium" onclick="const i=this.previousElementSibling; i.value=(parseInt(i.value)||0)+1; i.dispatchEvent(new Event('input'))">+</button>
            </div>
            <div class="relative sf-custom-select-container flex-grow">
              <select id="dl-unit" class="hidden">
                <option value="days" ${state.unit === 'days' ? 'selected' : ''}>Days</option>
                <option value="weeks" ${state.unit === 'weeks' ? 'selected' : ''}>Weeks</option>
                <option value="months" ${state.unit === 'months' ? 'selected' : ''}>Months</option>
              </select>
              <button type="button" id="btn-dl-unit" onclick="this.nextElementSibling.classList.toggle('hidden')" class="w-full px-3 py-2.5 rounded-xl bg-[#0A0A0A] border border-[#2A2A2A] hover:border-[#A855F7]/60 text-white text-xs font-semibold focus:outline-none focus:border-[#A855F7] transition-all duration-200 flex items-center justify-between group">
                <span id="sf-display-dl-unit" class="flex items-center gap-2 text-white capitalize">${state.unit}</span>
                <svg class="w-3.5 h-3.5 text-[#A1A1AA] group-hover:text-white transition-transform shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
              </button>
              <div id="sf-menu-dl-unit" class="hidden absolute left-0 right-0 bottom-full mb-2 bg-[#12121A]/95 backdrop-blur-xl border border-[#2A2A38] rounded-xl shadow-[0_12px_35px_rgba(0,0,0,0.85)] p-1 z-[999999999] space-y-0.5 origin-bottom animate-scaleIn">
                ${['days', 'weeks', 'months'].map(t => {
                  return `<div onclick="document.getElementById('dl-unit').value='${t}'; document.getElementById('dl-unit').dispatchEvent(new Event('change')); document.getElementById('sf-display-dl-unit').innerText='${t.charAt(0).toUpperCase() + t.slice(1)}'; document.getElementById('sf-menu-dl-unit').classList.add('hidden');" class="px-2.5 py-1.5 rounded-lg cursor-pointer flex items-center gap-2 text-xs transition-all duration-150 hover:bg-[#20202A] text-[#A1A1AA] hover:text-white capitalize">${t}</div>`;
                }).join('')}
              </div>
            </div>
          </div>
          <span id="dl-duration-calc-text" class="text-[#A1A1AA] text-[10px] pl-1 font-mono">Target Date: Not set</span>
        </div>
      </div>
    </div>
  `;

  const buttons = containerElement.querySelectorAll('button[data-mode]');
  const panels = containerElement.querySelectorAll('div[data-panel]');
  const container = containerElement.querySelector('#deadline-panels-container');
  const inputs = {
    date: containerElement.querySelector('#dl-date'),
    time: containerElement.querySelector('#dl-time'),
    value: containerElement.querySelector('#dl-value'),
    unit: containerElement.querySelector('#dl-unit')
  };

  const updateUI = () => {
    buttons.forEach(btn => {
      if (btn.dataset.mode === state.mode) {
        btn.classList.add('bg-[#A855F7]', 'text-white', 'shadow-sm');
        btn.classList.remove('text-[#A1A1AA]');
      } else {
        btn.classList.remove('bg-[#A855F7]', 'text-white', 'shadow-sm');
        btn.classList.add('text-[#A1A1AA]');
      }
    });

    panels.forEach(panel => {
      if (panel.dataset.panel === state.mode) {
        panel.classList.remove('opacity-0', 'pointer-events-none');
        panel.classList.add('opacity-100');
        container.style.height = panel.scrollHeight + 'px';
      } else {
        panel.classList.add('opacity-0', 'pointer-events-none');
        panel.classList.remove('opacity-100');
      }
    });
  };

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      state.mode = btn.dataset.mode;
      updateUI();
    });
  });

  const timeBtn = containerElement.querySelector('#btn-dl-time');
  const timeMenu = containerElement.querySelector('#sf-menu-dl-time');
  const timeDisplay = containerElement.querySelector('#sf-display-dl-time');

  const updateTimeMenuSelection = (h24, m) => {
    let hr12 = h24 % 12;
    if (hr12 === 0) hr12 = 12;
    const isPM = h24 >= 12;
    timeMenu.querySelectorAll('[data-col="hr"]').forEach(el => {
      const v = parseInt(el.dataset.val, 10);
      el.className = `py-0.5 rounded text-[11px] cursor-pointer transition-all duration-150 text-center ${v === hr12 ? 'bg-[#A855F7] text-white font-bold shadow-[0_0_10px_rgba(168,85,247,0.4)]' : 'hover:bg-[#20202A] text-[#A1A1AA] hover:text-white'}`;
    });
    timeMenu.querySelectorAll('[data-col="min"]').forEach(el => {
      const v = parseInt(el.dataset.val, 10);
      el.className = `py-0.5 rounded text-[11px] cursor-pointer transition-all duration-150 text-center ${v === m ? 'bg-[#A855F7] text-white font-bold shadow-[0_0_10px_rgba(168,85,247,0.4)]' : 'hover:bg-[#20202A] text-[#A1A1AA] hover:text-white'}`;
    });
    timeMenu.querySelectorAll('[data-col="ampm"]').forEach(el => {
      const v = el.dataset.val;
      el.className = `py-1 rounded text-[11px] cursor-pointer transition-all duration-150 text-center ${v === (isPM ? 'PM' : 'AM') ? 'bg-[#A855F7] text-white font-bold shadow-[0_0_10px_rgba(168,85,247,0.4)]' : 'hover:bg-[#20202A] text-[#A1A1AA] hover:text-white'}`;
    });
  };

  const setTimeFromParts = (h24, m) => {
    state.time = `${String(h24).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
    inputs.time.value = state.time;
    let hr12 = h24 % 12;
    if (hr12 === 0) hr12 = 12;
    timeDisplay.innerText = `${hr12}:${String(m).padStart(2,'0')} ${h24 >= 12 ? 'PM' : 'AM'}`;
    updateTimeMenuSelection(h24, m);
  };

  if (timeMenu) {
    let hrHtml = '';
    for (let h = 1; h <= 12; h++) hrHtml += `<div data-col="hr" data-val="${h}" class="py-0.5 rounded text-[11px] cursor-pointer text-center">${String(h).padStart(2, '0')}</div>`;
    let minHtml = '';
    for (let m = 0; m < 60; m += 5) minHtml += `<div data-col="min" data-val="${m}" class="py-0.5 rounded text-[11px] cursor-pointer text-center">${String(m).padStart(2, '0')}</div>`;
    let ampmHtml = `<div data-col="ampm" data-val="AM" class="py-1 rounded text-xs cursor-pointer text-center">AM</div><div data-col="ampm" data-val="PM" class="py-1 rounded text-xs cursor-pointer text-center">PM</div>`;
    timeMenu.innerHTML = `<div class="grid grid-cols-3 gap-1 text-center h-32 select-none"><div class="flex flex-col border-r border-[#2A2A38]/60 pr-1 overflow-hidden"><div class="text-[9px] font-bold text-[#A855F7] pb-1 sticky top-0 bg-[#12121A]">HR</div><div class="overflow-y-auto space-y-0.5 flex-1 sf-scrollbar pr-0.5">${hrHtml}</div></div><div class="flex flex-col border-r border-[#2A2A38]/60 px-1 overflow-hidden"><div class="text-[9px] font-bold text-[#A855F7] pb-1 sticky top-0 bg-[#12121A]">MIN</div><div class="overflow-y-auto space-y-0.5 flex-1 sf-scrollbar pr-0.5">${minHtml}</div></div><div class="flex flex-col pl-1 overflow-hidden"><div class="text-[9px] font-bold text-[#A855F7] pb-1 sticky top-0 bg-[#12121A]">AM/PM</div><div class="overflow-y-auto space-y-1 flex-1 sf-scrollbar pr-0.5">${ampmHtml}</div></div></div>`;

    timeMenu.addEventListener('click', (e) => {
      const col = e.target.closest('[data-col]');
      if (!col) return;
      e.stopPropagation();
      let [h24, m] = (state.time || '10:00').split(':').map(Number);
      if(isNaN(h24)) h24 = 10; if(isNaN(m)) m = 0;
      let isPM = h24 >= 12;
      const type = col.dataset.col;
      const val = col.dataset.val;
      if (type === 'hr') {
        const hr12 = parseInt(val, 10);
        h24 = isPM ? (hr12 === 12 ? 12 : hr12 + 12) : (hr12 === 12 ? 0 : hr12);
      } else if (type === 'min') {
        m = parseInt(val, 10);
      } else if (type === 'ampm') {
        isPM = val === 'PM';
        let hr12 = h24 % 12;
        if (hr12 === 0) hr12 = 12;
        h24 = isPM ? (hr12 === 12 ? 12 : hr12 + 12) : (hr12 === 12 ? 0 : hr12);
      }
      setTimeFromParts(h24, m);
    });

    timeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.sf-custom-select-container .absolute').forEach(m => {
        if(m !== timeMenu) m.classList.add('hidden');
      });
      timeMenu.classList.toggle('hidden');
      if (!timeMenu.classList.contains('hidden')) {
        let [h24, m] = (state.time || '10:00').split(':').map(Number);
        if(isNaN(h24)) h24 = 10; if(isNaN(m)) m = 0;
        updateTimeMenuSelection(h24, m);
      }
    });
  }

  let currentMonth = new Date().getMonth();
  let currentYear = new Date().getFullYear();
  if (state.date) {
    const d = new Date(state.date + 'T00:00:00');
    if (!isNaN(d.getTime())) {
      currentMonth = d.getMonth();
      currentYear = d.getFullYear();
    }
  }

  const updateDlCalendar = () => {
    const grid = containerElement.querySelector('#dl-cal-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const d = new Date(currentYear, currentMonth, 1);
    const monthName = d.toLocaleString('default', { month: 'long' });
    containerElement.querySelector('#dl-cal-title').innerText = `${monthName} ${currentYear}`;
    
    const startDay = d.getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();
    
    for (let i = 0; i < startDay; i++) {
      grid.innerHTML += `<div class="p-1 text-center text-[11px] font-medium text-[#3A3A3A] flex items-center justify-center w-7 h-7 mx-auto">${daysInPrevMonth - startDay + i + 1}</div>`;
    }
    
    let selectedDate = state.date ? new Date(state.date + 'T00:00:00') : null;
    let today = new Date();
    
    for (let i = 1; i <= daysInMonth; i++) {
      const isSelected = selectedDate && (selectedDate.getDate() === i && selectedDate.getMonth() === currentMonth && selectedDate.getFullYear() === currentYear);
      const isToday = (today.getDate() === i && today.getMonth() === currentMonth && today.getFullYear() === currentYear);
      
      let classes = "p-1 text-center text-[11px] font-bold rounded-[8px] cursor-pointer transition-all duration-200 ease-out flex items-center justify-center w-7 h-7 mx-auto ";
      if (isSelected) {
        classes += "bg-[#A855F7] text-white shadow-[0_0_10px_rgba(168,85,247,0.5)]";
      } else if (isToday) {
        classes += "text-[#A855F7] border border-[#A855F7]/30 hover:bg-[#20202A]";
      } else {
        classes += "text-[#A1A1AA] hover:text-white hover:bg-[#20202A]";
      }
      grid.innerHTML += `<div data-date="${i}" class="${classes}">${i}</div>`;
    }
    
    const remaining = 42 - (startDay + daysInMonth);
    for (let i = 1; i <= remaining && i <= 14; i++) {
      grid.innerHTML += `<div class="p-1 text-center text-[11px] font-medium text-[#3A3A3A] flex items-center justify-center w-7 h-7 mx-auto">${i}</div>`;
    }
  };

  containerElement.addEventListener('click', (e) => {
    if (e.target.closest('#dl-cal-prev')) {
      currentMonth--; if(currentMonth < 0) { currentMonth=11; currentYear--; }
      updateDlCalendar();
    }
    if (e.target.closest('#dl-cal-next')) {
      currentMonth++; if(currentMonth > 11) { currentMonth=0; currentYear++; }
      updateDlCalendar();
    }
    if (e.target.closest('#dl-cal-clear')) {
      state.date = ''; inputs.date.value = '';
      containerElement.querySelector('#sf-display-dl-date').innerText = 'mm/dd/yyyy';
      updateDlCalendar();
    }
    if (e.target.closest('#dl-cal-today')) {
      let d = new Date();
      currentMonth = d.getMonth(); currentYear = d.getFullYear();
      let padM = String(currentMonth+1).padStart(2,'0');
      let padD = String(d.getDate()).padStart(2,'0');
      state.date = `${currentYear}-${padM}-${padD}`;
      inputs.date.value = state.date;
      containerElement.querySelector('#sf-display-dl-date').innerText = d.toLocaleDateString('en-US', {month:'2-digit', day:'2-digit', year:'numeric'});
      updateDlCalendar();
    }
    const dayBtn = e.target.closest('[data-date]');
    if (dayBtn) {
      let padM = String(currentMonth+1).padStart(2,'0');
      let padD = String(dayBtn.dataset.date).padStart(2,'0');
      state.date = `${currentYear}-${padM}-${padD}`;
      inputs.date.value = state.date;
      const d = new Date(state.date + 'T00:00:00');
      containerElement.querySelector('#sf-display-dl-date').innerText = d.toLocaleDateString('en-US', {month:'2-digit', day:'2-digit', year:'numeric'});
      containerElement.querySelector('#sf-menu-dl-date').classList.add('hidden');
      updateDlCalendar();
    }
  });

  const btnDate = containerElement.querySelector('#btn-dl-date');
  if (btnDate) {
    btnDate.addEventListener('click', () => {
      document.querySelectorAll('.sf-custom-select-container .absolute').forEach(m => {
        if(m !== containerElement.querySelector('#sf-menu-dl-date')) m.classList.add('hidden');
      });
      updateDlCalendar();
    });
  }

  const updateDurationCalculatedDate = () => {
    const calcEl = containerElement.querySelector('#dl-duration-calc-text');
    if (!calcEl) return;
    if (!state.value || isNaN(state.value) || state.value <= 0) {
      calcEl.innerText = 'Target Date: Not set';
      return;
    }
    const d = new Date();
    if (state.unit === 'days') {
      d.setDate(d.getDate() + state.value);
    } else if (state.unit === 'weeks') {
      d.setDate(d.getDate() + (state.value * 7));
    } else if (state.unit === 'months') {
      d.setMonth(d.getMonth() + state.value);
    }
    calcEl.innerText = 'Target Date: ' + d.toLocaleDateString('en-US', {weekday:'short', month:'short', day:'numeric', year:'numeric'});
  };

  inputs.value.addEventListener('input', (e) => {
    state.value = parseInt(e.target.value, 10);
    updateDurationCalculatedDate();
  });
  inputs.unit.addEventListener('change', (e) => {
    state.unit = e.target.value;
    updateDurationCalculatedDate();
  });

  setTimeout(() => {
    updateUI();
    updateDlCalendar();
    updateDurationCalculatedDate();
  }, 10);

  return {
    getValue: () => {
      if (state.mode === 'NONE') {
        return { mode: 'NONE' };
      } else if (state.mode === 'SPECIFIC_DATE') {
        return { mode: 'SPECIFIC_DATE', date: state.date, time: state.time };
      } else if (state.mode === 'DURATION') {
        return { mode: 'DURATION', value: state.value, unit: state.unit };
      }
    },
    setValue: (deadlineObj) => {
      if (deadlineObj) {
        if (typeof deadlineObj === 'object') {
          state = { ...state, ...deadlineObj };
        } else if (typeof deadlineObj === 'string') {
          if (/^\d{4}-\d{2}-\d{2}$/.test(deadlineObj) || /^\d{4}-\d{2}-\d{2}T/.test(deadlineObj)) {
            state.mode = 'SPECIFIC_DATE';
            state.date = deadlineObj.substring(0, 10);
            state.time = '';
          } else {
            state.mode = 'NONE';
          }
        }
        inputs.date.value = state.date || '';
        inputs.time.value = state.time || '';
        inputs.value.value = state.value || '';
        inputs.unit.value = state.unit || 'days';
        updateUI();
        updateDurationCalculatedDate();
      }
    },
    validate: () => {
      if (state.mode === 'SPECIFIC_DATE' && !state.date) {
        return { valid: false, error: 'Please select a specific date.' };
      }
      if (state.mode === 'DURATION') {
        if (!state.value || state.value <= 0) {
          return { valid: false, error: 'Duration value must be a positive number.' };
        }
        if (!['days', 'weeks', 'months'].includes(state.unit)) {
          return { valid: false, error: 'Invalid duration unit.' };
        }
      }
      return { valid: true };
    },
    reset: () => {
      state = { mode: 'NONE', date: '', time: '', value: '', unit: 'days' };
      inputs.date.value = '';
      inputs.time.value = '';
      inputs.value.value = '';
      inputs.unit.value = 'days';
      updateUI();
      updateDurationCalculatedDate();
    }
  };
};
