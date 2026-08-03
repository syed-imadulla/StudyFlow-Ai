// StudyFlow AI Router & Client-Side Component Engine (Subtle Border & Pure Black SaaS Vibe)
// Preserves 100% existing functionality, token replacement, and routing

/**
 * StudyFlowDB – Backward-Compatibility Shim
 * ------------------------------------------
 * All data logic has been moved to src/js/services/goalsService.js.
 * This shim ensures every existing `window.StudyFlowDB.*` call continues to work
 * without any changes to HTML pages. Internally it delegates to goalsService.
 *
 * Pages that call StudyFlowDB directly should gradually migrate to goalsService.
 */
window.StudyFlowDB = {
  init() {
    // Seeding and loading are handled cleanly by SF_STORE.bootstrap() or explicit service calls.
    // Early cache invalidation if store hasn't initialized yet
    try {
      const CURRENT_VERSION = '2';
      const version = localStorage.getItem('studyflow_store_version');
      if (version !== CURRENT_VERSION) {
        localStorage.removeItem('studyflow_goals');
        localStorage.setItem('studyflow_store_version', CURRENT_VERSION);
      }
    } catch (e) {}
  },

  getGoals() {
    // Synchronous shim: reads from localStorage directly (goalsService manages the key).
    this.init();
    try { return JSON.parse(localStorage.getItem('studyflow_goals') || '[]'); } catch { return []; }
  },

  saveGoals(goals) {
    if (window.goalsService) return window.goalsService.saveGoals(goals);
    localStorage.setItem('studyflow_goals', JSON.stringify(goals));
  },

  toggleSubtask(goalId, subtaskId) {
    // Synchronous shim for inline onclick handlers in HTML templates.
    // Returns the updated goal synchronously (from localStorage).
    if (window.goalsService) {
      window.goalsService.toggleSubtask(goalId, subtaskId); // async, fire-and-forget
    }
    // Sync fallback so render functions immediately get updated data
    const goals = this.getGoals();
    const goal  = goals.find(g => g.id === goalId);
    if (goal) {
      const sub = goal.subtasks.find(s => s.id === subtaskId);
      if (sub) {
        sub.completed = !sub.completed;
        if (window.calculateGoalProgress) {
          goal.progress = window.calculateGoalProgress(goal);
        } else {
          const total = goal.subtasks.length;
          const done  = goal.subtasks.filter(s => s.completed).length;
          goal.progress = total > 0 ? Math.round((done / total) * 100) : 0;
        }
        this.saveGoals(goals);
        return goal;
      }
    }
    return null;
  },

  createGoalWithSubtasks(title, urgency, description, finalDeadlineDaysStr, rawDump) {
    if (window.SF_STORE) {
      return window.SF_STORE.dispatch('goals/CREATE_WITH_SUBTASKS', { title, urgency, description, finalDeadlineDaysStr, rawDump });
    }
    if (window.goalsService) {
      return window.goalsService.createGoalWithSubtasks(title, urgency, description, finalDeadlineDaysStr, rawDump);
    }
    return Promise.resolve(null);
  }
};

window.StudyFlowTemplates = {
  'components/navbar.html': `
    <header class="sticky top-4 z-[500000] bg-[#080808]/90 backdrop-blur-xl border border-[#171717] px-6 py-3.5 mx-6 md:mx-10 my-4 rounded-2xl shadow-saas flex items-center justify-between transition-all">
      <div class="flex items-center space-x-4">
        <h2 id="pageTitleDisplay" class="text-base font-bold text-[#FAFAFA] capitalize tracking-tight font-sans">Dashboard</h2>
      </div>
      <div class="flex items-center space-x-5">
        <div class="relative cursor-pointer group" onclick="alert('✨ Search anything... (Simulated Raycast QuickSearch)')">
          <div class="flex items-center space-x-3 bg-[#0A0A0A] border border-[#2A2A2A] group-hover:border-[#A855F7]/50 px-3.5 py-1.5 rounded-xl text-xs text-[#6B7280] transition duration-200">
            <svg class="w-3.5 h-3.5 text-[#A855F7]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            <span class="w-40 md:w-52 text-left truncate">Search anything...</span>
            <kbd class="bg-[#0E0E0E] border border-[#202020] px-1.5 py-0.5 rounded text-[10px] font-mono text-[#A1A1AA]">⌘K</kbd>
          </div>
        </div>
        <button class="relative p-2 text-[#A1A1AA] hover:text-[#FAFAFA] transition rounded-xl hover:bg-[#151515] border border-transparent hover:border-[#202020]" onclick="alert('✨ No new notifications')">
          <span class="absolute top-2 right-2 w-2 h-2 bg-[#A855F7] rounded-full animate-ping"></span>
          <span class="absolute top-2 right-2 w-2 h-2 bg-[#A855F7] rounded-full"></span>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
        </button>
        <div class="flex items-center space-x-3 pl-2 border-l border-[#171717] cursor-pointer" onclick="window.location.href='settings.html'">
          <img src="https://ui-avatars.com/api/?name=Imadulla&background=A855F7&color=fff&rounded=true" alt="Imadulla" class="w-8 h-8 rounded-full ring-2 ring-[#A855F7]/40 hover:ring-[#A855F7] transition" />
        </div>
      </div>
    </header>
  `,

  'components/sidebar.html': `
    <aside class="w-[260px] bg-[#050505] border-r border-[#171717] flex flex-col justify-between p-5 h-screen sticky top-0 shrink-0 z-50 selection:bg-[#A855F7]">
      <div>
        <!-- Brand Logo -->
        <div class="flex items-center space-x-3 px-3 py-3 mb-8 cursor-pointer group" onclick="window.location.href='index.html'">
          <div class="w-9 h-9 rounded-xl bg-[#A855F7]/15 border border-[#A855F7]/40 flex items-center justify-center text-[#A855F7] group-hover:scale-105 transition shadow-[0_0_20px_rgba(168,85,247,0.25)]">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
          </div>
          <span class="text-lg font-bold tracking-tight text-[#FAFAFA] font-sans">StudyFlow AI</span>
        </div>

        <!-- Primary Navigation -->
        <nav class="space-y-1.5 font-medium text-sm">
          <a href="dashboard.html" class="nav-item flex items-center space-x-3 px-4 py-3 rounded-xl transition duration-200 text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#0A0A0A]">
            <svg class="w-5 h-5 text-[#A855F7] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
            <span>Home</span>
          </a>
          <a href="workspace.html" class="nav-item flex items-center space-x-3 px-4 py-3 rounded-xl transition duration-200 text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#0A0A0A]">
            <svg class="w-5 h-5 text-[#A855F7] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
            <span>Goals</span>
          </a>
          <a href="idealab.html" class="nav-item flex items-center space-x-3 px-4 py-3 rounded-xl transition duration-200 text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#0A0A0A]">
            <svg class="w-5 h-5 text-[#A855F7] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>
            <span>IdeaLab</span>
          </a>
          <a href="planner.html" class="nav-item flex items-center space-x-3 px-4 py-3 rounded-xl transition duration-200 text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#0A0A0A]">
            <svg class="w-5 h-5 text-[#A855F7] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
            <span>Planner</span>
          </a>
          <a href="focus.html" class="nav-item flex items-center space-x-3 px-4 py-3 rounded-xl transition duration-200 text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#0A0A0A]">
            <svg class="w-5 h-5 text-[#A855F7] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <span>Focus</span>
          </a>
          <a href="analytics.html" class="nav-item flex items-center space-x-3 px-4 py-3 rounded-xl transition duration-200 text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#0A0A0A]">
            <svg class="w-5 h-5 text-[#A855F7] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
            <span>Analytics</span>
          </a>
          <a href="settings.html" class="nav-item flex items-center space-x-3 px-4 py-3 rounded-xl transition duration-200 text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#0A0A0A]">
            <svg class="w-5 h-5 text-[#A855F7] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            <span>Settings</span>
          </a>
        </nav>
      </div>

      <!-- Bottom Profile Controls -->
      <div class="pt-6 border-t border-[#171717] space-y-4">
        <div class="flex items-center justify-between px-2">
          <div class="flex items-center space-x-3">
            <img src="https://ui-avatars.com/api/?name=Imadulla&background=A855F7&color=fff&rounded=true" alt="Imadulla" class="w-8 h-8 rounded-full ring-2 ring-[#202020]" />
            <div class="overflow-hidden">
              <h4 class="text-xs font-semibold text-[#FAFAFA] truncate">Imadulla</h4>
              <p class="text-[10px] text-[#6B7280] truncate">Student Plan</p>
            </div>
          </div>
          <button id="themeToggle" class="p-1.5 text-[#6B7280] hover:text-[#FAFAFA] transition rounded-lg hover:bg-[#0A0A0A]" title="Toggle Theme">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>
          </button>
        </div>
        <button onclick="window.authService ? window.authService.logout() : window.location.href='login.html'" class="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl text-xs font-bold text-[#EF4444] bg-[#EF4444]/15 border border-[#EF4444]/40 hover:bg-[#EF4444] hover:text-white transition shadow-[0_0_15px_rgba(239,68,68,0.2)] cursor-pointer">
          <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  `,

  'components/timer-widget.html': `
    <div class="card bg-[#0E0E0E] border border-[#2A2A2A] p-6 rounded-[20px] w-full max-w-sm mx-auto flex flex-col items-center justify-center relative overflow-hidden group">
      <div class="flex items-center space-x-2 mb-4">
        <span class="w-2 h-2 rounded-full bg-[#A855F7] animate-pulse"></span>
        <span class="text-xs font-semibold tracking-wider uppercase text-[#A1A1AA]">Focus Timer</span>
      </div>
      <div class="relative flex items-center justify-center my-4">
        <svg class="w-44 h-44 transform -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="44" fill="none" stroke="#202020" stroke-width="6" />
          <circle cx="50" cy="50" r="44" fill="none" stroke="#A855F7" stroke-width="6" stroke-dasharray="276.46" stroke-dashoffset="50" stroke-linecap="round" class="transition-all duration-1000 shadow-[0_0_20px_rgba(168,85,247,0.25)]" />
        </svg>
        <div id="timerDisplay" class="absolute text-4xl font-mono font-bold text-[#FAFAFA] tracking-wider">25:00</div>
      </div>
      <div class="flex space-x-3 w-full mt-4">
        <button id="startBtn" class="btn btn-primary flex-1 py-3 text-sm rounded-xl font-bold tracking-wide">Start</button>
        <button id="pauseBtn" class="btn btn-secondary hidden flex-1 py-3 text-sm rounded-xl font-bold">Pause</button>
        <button id="resetBtn" class="btn btn-ghost hidden px-4 py-3 text-sm rounded-xl">Reset</button>
      </div>
    </div>
  `,

  'components/task-card.html': `
    <div class="flex items-center justify-between p-4 rounded-2xl bg-[#0E0E0E] border border-[#202020] hover:border-[#343434] transition duration-200 group">
      <div class="flex items-center space-x-4">
        <input type="checkbox" class="w-5 h-5 rounded border-[#2A2A2A] bg-[#0A0A0A] text-[#A855F7] focus:ring-[#A855F7] cursor-pointer" />
        <div>
          <h4 class="text-sm font-semibold text-[#FAFAFA] group-hover:text-[#A855F7] transition">[[TITLE]]</h4>
          <p class="text-xs text-[#6B7280] mt-0.5">[[ESTIMATE]]</p>
        </div>
      </div>
      <div class="flex items-center space-x-3">
        <span class="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#151515] border border-[#2A2A2A] text-[#A855F7]">[[PRIORITY]]</span>
        <button onclick="window.location.href='focus.html'" class="p-2 rounded-xl bg-[#0A0A0A] border border-[#202020] hover:border-[#A855F7] text-[#A1A1AA] hover:text-[#FAFAFA] transition">
          <svg class="w-4 h-4 text-[#A855F7]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
        </button>
      </div>
    </div>
  `,

  'components/ai-chat.html': `
    <div class="card bg-[#0E0E0E] border border-[#202020] p-6 rounded-[20px] flex flex-col h-full min-h-[380px]">
      <div class="flex items-center space-x-3 pb-4 mb-4 border-b border-[#171717]">
        <div class="w-8 h-8 rounded-xl bg-[#A855F7]/20 border border-[#A855F7]/40 flex items-center justify-center text-[#A855F7] shadow-[0_0_20px_rgba(168,85,247,0.25)] shrink-0">
          <svg class="w-4 h-4 text-[#A855F7] fill-current drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]" viewBox="0 0 24 24"><path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z"/><path d="M5 2L5.8 4.2L8 5L5.8 5.8L5 8L4.2 5.8L2 5L4.2 4.2L5 2Z" opacity="0.7"/><path d="M19 16L19.8 18.2L22 19L19.8 19.8L19 22L18.2 19.8L16 19L18.2 18.2L19 16Z" opacity="0.7"/></svg>
        </div>
        <div>
          <h4 class="font-bold text-sm text-[#FAFAFA]">StudyFlow AI Copilot</h4>
          <p class="text-[11px] text-[#6B7280]">Guided Study Assistant</p>
        </div>
      </div>
      <div class="flex-1 overflow-y-auto space-y-4 pr-2 mb-4 max-h-[300px]" id="chatContainer">
        <div class="flex items-start space-x-3">
          <div class="w-7 h-7 rounded-lg bg-[#151515] border border-[#2A2A2A] flex items-center justify-center text-[#A855F7] shrink-0 mt-0.5">
            <svg class="w-3.5 h-3.5 text-[#A855F7] fill-current drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]" viewBox="0 0 24 24"><path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z"/><path d="M5 2L5.8 4.2L8 5L5.8 5.8L5 8L4.2 5.8L2 5L4.2 4.2L5 2Z" opacity="0.7"/><path d="M19 16L19.8 18.2L22 19L19.8 19.8L19 22L18.2 19.8L16 19L18.2 18.2L19 16Z" opacity="0.7"/></svg>
          </div>
          <div class="bg-[#151515] border border-[#2A2A2A] p-3.5 rounded-2xl rounded-tl-sm text-xs text-[#A1A1AA] leading-relaxed">
            I am your AI Study Coach. I’ve analyzed your deadlines—you are closest to finishing the <strong class="text-[#FAFAFA]">DBMS Mini Project</strong>. Ready to draft your schema?
          </div>
        </div>
      </div>
      <form id="aiChatForm" class="flex items-center space-x-2 mt-auto pt-3 border-t border-[#171717]">
        <input type="text" placeholder="Ask AI anything..." class="input py-3 text-xs bg-[#0A0A0A] border-[#2A2A2A] focus:border-[#A855F7]" required />
        <button type="submit" class="btn btn-primary px-4 py-3 text-xs rounded-xl shrink-0">Send</button>
      </form>
    </div>
  `
};

// IdeaLab Integration for Individual Subtasks (Structured Task Completion Blueprint)
window.openSubtaskIdeaLab = function (goalId, subtaskId) {
  const goals = window.StudyFlowDB ? window.StudyFlowDB.getGoals() : [];
  const goal = goals.find(g => g.id === goalId);
  if (!goal) return;
  const sub = goal.subtasks.find(s => s.id === subtaskId);
  if (!sub) return;

  let blueprintModal = document.getElementById('ideaLabBlueprintModal');
  if (!blueprintModal) {
    blueprintModal = document.createElement('div');
    blueprintModal.id = 'ideaLabBlueprintModal';
    blueprintModal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn p-4';
    document.body.appendChild(blueprintModal);
  }

  // Generate structured completion blueprint based on title keywords
  let p1 = "Define objective parameters and review core documentation / rubric requirements.";
  let p2 = "Break down execution into two 25-minute uninterrupted Pomodoro focus blocks.";
  let p3 = "Test output against expected rubric criteria and commit final changes.";

  const lower = sub.title.toLowerCase();
  if (lower.includes('schema') || lower.includes('diagram') || lower.includes('e-r') || lower.includes('dbms') || lower.includes('sql')) {
    p1 = "List all entities (e.g. Students, Courses, Enrollments) and define primary/foreign keys.";
    p2 = "Draft relational tables ensuring 3NF (no transitive dependencies or redundant fields).";
    p3 = "Verify index performance and test queries with sample mock data.";
  } else if (lower.includes('code') || lower.includes('api') || lower.includes('algorithm') || lower.includes('express') || lower.includes('fcfs')) {
    p1 = "Setup project boilerplate and import required libraries / routing frameworks.";
    p2 = "Write core logic functions with edge-case handling and console log tracing.";
    p3 = "Run automated API unit tests (Postman/Jest) and verify zero memory leaks.";
  }

  const bodyHtml = `
    <!-- Clear Structured Completion Blueprint -->
    <div class="space-y-4">
      <h4 class="text-xs font-bold text-[#FAFAFA] uppercase tracking-wider flex items-center gap-2 font-mono">
        <span>⚡ Structured Completion Guide</span>
      </h4>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
        <div class="p-4 rounded-xl bg-[#141414] border border-[#202020] space-y-1.5 relative overflow-hidden">
          <span class="text-[10px] font-mono font-bold text-[#A855F7] block">PHASE 1 • PREP</span>
          <p class="text-[#A1A1AA] leading-relaxed">${p1}</p>
        </div>
        <div class="p-4 rounded-xl bg-[#141414] border border-[#202020] space-y-1.5 relative overflow-hidden">
          <span class="text-[10px] font-mono font-bold text-[#FACC15] block">PHASE 2 • EXECUTION</span>
          <p class="text-[#A1A1AA] leading-relaxed">${p2}</p>
        </div>
        <div class="p-4 rounded-xl bg-[#141414] border border-[#202020] space-y-1.5 relative overflow-hidden">
          <span class="text-[10px] font-mono font-bold text-[#22C55E] block">PHASE 3 • REVIEW</span>
          <p class="text-[#A1A1AA] leading-relaxed">${p3}</p>
        </div>
      </div>
    </div>

    <!-- Quick AI Copilot Interaction -->
    <div class="p-4 rounded-xl bg-[#0A0A0A] border border-[#202020] space-y-3">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-[#FAFAFA] flex items-center gap-1.5">
          <svg class="w-3.5 h-3.5 text-[#A855F7] fill-current drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]" viewBox="0 0 24 24"><path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z"/><path d="M5 2L5.8 4.2L8 5L5.8 5.8L5 8L4.2 5.8L2 5L4.2 4.2L5 2Z" opacity="0.7"/><path d="M19 16L19.8 18.2L22 19L19.8 19.8L19 22L18.2 19.8L16 19L18.2 18.2L19 16Z" opacity="0.7"/></svg>
          Ask IdeaLab Copilot about this task
        </span>
        <span class="text-[10px] font-mono text-[#6B7280]">AI Assistant</span>
      </div>
      <div class="flex gap-2">
        <input type="text" id="subtaskAiInput" placeholder="e.g. Give me a code example for this step..." class="input py-2 text-xs bg-[#161616] border-[#2A2A2A] flex-1" />
        <button onclick="alert('✨ IdeaLab AI: Here is a recommended approach for ' + document.getElementById('subtaskAiInput').value + '... Check documentation for optimal efficiency!')" class="btn btn-secondary text-xs px-4 py-2 border-[#2A2A2A] hover:border-[#A855F7]">Ask</button>
      </div>
    </div>
  `;

  const footerHtml = `
    <button onclick="window.StudyFlowDB.toggleSubtask('${goal.id}', '${sub.id}'); document.getElementById('ideaLabBlueprintModal').style.display='none'; if(window.location.pathname.includes('workspace')) renderWorkspaceGoals(); if(window.location.pathname.includes('dashboard')) renderDashboardTasks();" class="btn btn-secondary px-4 py-2.5 text-xs font-semibold border-[#202020] hover:border-[#22C55E] text-[#22C55E]">
      ${sub.completed ? '↩ Mark Incomplete' : '✓ Mark Subtask Complete'}
    </button>
    <div class="flex items-center space-x-3">
      <button onclick="document.getElementById('ideaLabBlueprintModal').style.display='none'" class="btn btn-ghost px-4 py-2.5 text-xs">Close</button>
      <button onclick="window.location.href='focus.html'" class="btn btn-primary px-5 py-2.5 text-xs font-bold shadow-[0_0_20px_rgba(168,85,247,0.25)] flex items-center space-x-1.5">
        <span>Start Focus Block</span>
        <span>→</span>
      </button>
    </div>
  `;

  if (window.SF_COMPONENTS && window.SF_COMPONENTS.renderModal) {
    blueprintModal.innerHTML = window.SF_COMPONENTS.renderModal({
      id: 'ideaLabBlueprintModal',
      title: sub.title,
      subtitle: 'IdeaLab Task Blueprint',
      bodyHtml: `<p class="text-xs text-[#6B7280] -mt-2 mb-2">Goal: <strong class="text-[#A1A1AA]">${goal.title}</strong> • Deadline: <strong class="text-[#FACC15]">${sub.deadlineInfo?.label || 'Assigned'}</strong></p>` + bodyHtml,
      footerHtml
    });
  } else {
    blueprintModal.innerHTML = `<div class="bg-[#0D0D0D] p-6 rounded-xl text-white">Loading blueprint...</div>`;
  }
  blueprintModal.style.display = 'flex';
};

// Global Add Task / Time Block / AI Goal Modal Handler
window.openAddItemModal = function (targetContainerId, isTimeBlock = false) {
  let modalEl = document.getElementById('globalAddModal');
  if (!modalEl) {
    modalEl = document.createElement('div');
    modalEl.id = 'globalAddModal';
    modalEl.className = 'fixed inset-0 z-[999999999] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn p-4';
    modalEl.innerHTML = `
      <div class="bg-[#0D0D0D] border border-[#2A2A2A] p-6 rounded-[20px] w-full max-w-md shadow-saas space-y-5">
        <div class="flex items-center justify-between pb-3 border-b border-[#1C1C1C]">
          <h3 id="modalTitle" class="text-base font-bold text-[#FAFAFA]">Add New Item</h3>
          <button onclick="document.getElementById('globalAddModal').style.display='none'" class="text-[#6B7280] hover:text-[#FAFAFA]">✕</button>
        </div>
        <form id="globalAddForm" class="space-y-4" onsubmit="event.preventDefault(); window.submitGlobalAdd();">
          <div>
            <label class="block text-xs font-semibold text-[#A1A1AA] uppercase mb-1.5" id="modalInput1Label">Title</label>
            <input id="modalInputTitle" type="text" placeholder="e.g. Complete Database Normalization" class="input py-2.5 text-xs bg-[#0A0A0A] border-[#2A2A2A]" required />
          </div>
          <div id="modalDeadlineSection">
            <label class="block text-xs font-semibold text-[#A1A1AA] uppercase mb-1.5">Deadline</label>
            <div id="modalAddDeadlineContainer"></div>
          </div>
          <div id="modalTimeBlockSection" style="display: none;">
            <label class="block text-xs font-semibold text-[#A1A1AA] uppercase mb-1.5">Time Range (e.g. 18:00 - 19:30)</label>
            <input id="modalInputSub" type="text" class="input py-2.5 text-xs bg-[#0A0A0A] border-[#2A2A2A]" />
          </div>
          <div class="relative sf-custom-select-container">
            <label class="block text-xs font-semibold text-[#A1A1AA] uppercase mb-1.5">Priority / Urgency</label>
            <select id="modalInputTag" class="hidden">
              <option value="High">High / Urgent</option>
              <option value="Focus">Focus</option>
              <option value="Review">Review</option>
              <option value="Study">Study</option>
              <option value="Medium">Medium</option>
            </select>
            <button type="button" onclick="document.getElementById('sf-menu-modalInputTag').classList.toggle('hidden')" class="w-full px-3 py-2.5 rounded-xl bg-[#0A0A0A] border border-[#2A2A2A] hover:border-[#A855F7]/60 text-white text-xs font-semibold focus:outline-none focus:border-[#A855F7] transition-all duration-200 flex items-center justify-between group">
              <span id="sf-display-modalInputTag" class="flex items-center gap-2 text-white">High / Urgent</span>
              <svg class="w-3.5 h-3.5 text-[#A1A1AA] group-hover:text-white transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
            </button>
            <div id="sf-menu-modalInputTag" class="hidden absolute left-0 right-0 mt-1 bg-[#12121A]/95 backdrop-blur-xl border border-[#2A2A38] rounded-xl shadow-[0_12px_35px_rgba(0,0,0,0.85)] p-1 z-[999999999] space-y-0.5 max-h-40 overflow-y-auto">
              ${['High / Urgent', 'Focus', 'Review', 'Study', 'Medium'].map(t => {
                const val = t.split(' / ')[0];
                return `<div onclick="document.getElementById('modalInputTag').value='${val}'; document.getElementById('sf-display-modalInputTag').innerText='${t}'; document.getElementById('sf-menu-modalInputTag').classList.add('hidden');" class="px-2.5 py-1.5 rounded-lg cursor-pointer flex items-center gap-2 text-xs transition-all duration-150 hover:bg-white/5 text-[#A1A1AA] hover:text-white">${t}</div>`;
              }).join('')}
            </div>
          </div>
          <div id="aiBreakdownToggleWrapper" class="pt-2 border-t border-[#1C1C1C]">
            <label class="flex items-center space-x-3 cursor-pointer">
              <input type="checkbox" id="modalAiBreakdownCheck" checked class="w-4 h-4 rounded border-[#2A2A2A] bg-[#0A0A0A] text-[#A855F7] focus:ring-[#A855F7]" />
              <span class="text-xs font-bold text-[#A855F7] flex items-center gap-1.5"><svg class="w-3.5 h-3.5 text-[#A855F7] fill-current drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]" viewBox="0 0 24 24"><path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z"/><path d="M5 2L5.8 4.2L8 5L5.8 5.8L5 8L4.2 5.8L2 5L4.2 4.2L5 2Z" opacity="0.7"/><path d="M19 16L19.8 18.2L22 19L19.8 19.8L19 22L18.2 19.8L16 19L18.2 18.2L19 16Z" opacity="0.7"/></svg> AI Auto-Breakdown into Subtasks & Deadlines</span>
            </label>
            <textarea id="modalBraindumpText" rows="2" placeholder="Optional rough notes: e.g. Schema design, API routing, frontend testing..." class="input mt-2 py-2 text-xs bg-[#0A0A0A] border-[#2A2A2A] resize-none"></textarea>
          </div>
          <div class="flex items-center justify-end space-x-3 pt-2">
            <button type="button" onclick="document.getElementById('globalAddModal').style.display='none'" class="btn btn-ghost px-4 py-2 text-xs">Cancel</button>
            <button type="submit" class="btn btn-primary px-5 py-2 text-xs font-bold shadow-[0_0_20px_rgba(168,85,247,0.25)]">Create & Save →</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modalEl);
  }

  const aiWrapper = document.getElementById('aiBreakdownToggleWrapper');
  const deadlineSection = document.getElementById('modalDeadlineSection');
  const timeBlockSection = document.getElementById('modalTimeBlockSection');

  if (isTimeBlock) {
    aiWrapper.style.display = 'none';
    deadlineSection.style.display = 'none';
    timeBlockSection.style.display = 'block';
  } else {
    aiWrapper.style.display = 'block';
    deadlineSection.style.display = 'block';
    timeBlockSection.style.display = 'none';
  }

  document.getElementById('modalTitle').textContent = isTimeBlock ? 'Add Time Block' : 'Create AI Goal / Task';
  document.getElementById('modalInput1Label').textContent = isTimeBlock ? 'Block Activity' : 'Main Goal / Task Name';
  document.getElementById('modalInputTitle').value = '';
  document.getElementById('modalInputSub').value = '';
  document.getElementById('modalBraindumpText').value = '';
  
  if (!isTimeBlock && window.createDeadlineSelector) {
    if (!window.addDeadlineSelector) {
      window.addDeadlineSelector = window.createDeadlineSelector(document.getElementById('modalAddDeadlineContainer'));
    }
    window.addDeadlineSelector.reset();
  }

  modalEl.style.display = 'flex';
  document.getElementById('modalInputTitle').focus();

  window.submitGlobalAdd = async function () {
    const title = document.getElementById('modalInputTitle').value.trim();
    const tag = document.getElementById('modalInputTag').value;
    const autoBreakdown = !isTimeBlock && document.getElementById('modalAiBreakdownCheck').checked;
    const braindump = document.getElementById('modalBraindumpText').value.trim();

    let sub = '';
    let deadlinePayload = null;

    if (isTimeBlock) {
      sub = document.getElementById('modalInputSub').value.trim();
      if (!title || !sub) return;
    } else {
      if (!title) return;
      const validation = window.addDeadlineSelector.validate();
      if (!validation.valid) {
        if (window.SF_COMPONENTS && window.SF_COMPONENTS.showToast) {
          window.SF_COMPONENTS.showToast(validation.error, 'error');
        }
        return;
      }
      deadlinePayload = window.addDeadlineSelector.getValue();
    }

    if (!isTimeBlock) {
      modalEl.style.display = 'none';
      const urgency = tag === 'High' ? 'URGENT' : tag === 'Medium' || tag === 'Review' ? 'UPCOMING' : 'ACTIVE';
      try {
        if (autoBreakdown) {
          await window.SF_STORE.dispatch('goals/CREATE_WITH_SUBTASKS', {
            title,
            urgency,
            description: 'Created via AI Goal Breakdown Modal',
            deadline: deadlinePayload,
            rawDump: braindump
          });
          if (window.SF_COMPONENTS && window.SF_COMPONENTS.showToast) {
            window.SF_COMPONENTS.showToast('AI Goal Breakdown created successfully!', 'success');
          }
        } else {
          await window.SF_STORE.dispatch('goals/CREATE', {
            title,
            urgency,
            description: 'Created via Add Item Modal',
            deadline: deadlinePayload
          });
          if (window.SF_COMPONENTS && window.SF_COMPONENTS.showToast) {
            window.SF_COMPONENTS.showToast(`Goal "${title}" created successfully!`, 'success');
          }
        }
      } catch (err) {
        console.error('[Create Goal Error]:', err);
        if (window.SF_COMPONENTS && window.SF_COMPONENTS.showToast) {
          window.SF_COMPONENTS.showToast(err.message || 'Failed to create goal', 'error');
        }
      }
      return;
    }

    const container = document.getElementById(targetContainerId);
    if (container) {
      const newItem = document.createElement('div');
      let tagClass = "bg-[#A855F7]/15 border-[#A855F7]/40 text-[#A855F7]";
      let circleClass = "bg-[#A855F7]";
      if (tag === 'Review' || tag === 'Medium') { tagClass = "bg-[#FACC15]/15 border-[#FACC15]/40 text-[#FACC15]"; circleClass = "bg-[#FACC15]"; }
      if (tag === 'Study' || tag === 'Low') { tagClass = "bg-[#151515] border-[#2A2A2A] text-[#A1A1AA]"; circleClass = "bg-[#6B7280]"; }

      newItem.className = "p-4 rounded-xl bg-[#0A0A0A] border border-[#202020] flex items-center justify-between group hover:border-[#A855F7]/50 transition animate-fadeIn mt-3.5";
      newItem.innerHTML = `
        <div class="flex items-center space-x-3.5 overflow-hidden">
          <span class="font-mono text-xs text-[#6B7280] shrink-0">${sub}</span>
          <div class="w-1 h-8 ${circleClass} rounded-full shrink-0"></div>
          <div class="truncate">
            <h4 class="font-bold text-xs text-[#FAFAFA] truncate">${title}</h4>
            <p class="text-[11px] text-[#6B7280] truncate">User Time Block</p>
          </div>
        </div>
        <span class="px-2.5 py-1 rounded-md text-[10px] font-semibold border ${tagClass} shrink-0 ml-2">${tag}</span>
      `;
      container.appendChild(newItem);
      if (window.SF_COMPONENTS && window.SF_COMPONENTS.showToast) {
        window.SF_COMPONENTS.showToast(`Added "${title}" successfully!`, 'success');
      }
      modalEl.style.display = 'none';
    }
  };
};

// Global Custom Dropdown Menu Helpers (Pure Black SaaS Glassmorphism Theme)
window.toggleCustomDropdown = function (menuId, arrowId) {
  document.querySelectorAll('.custom-dropdown-menu').forEach(m => {
    if (m.id !== menuId) m.classList.add('hidden');
  });
  const menu = document.getElementById(menuId);
  const arrow = document.getElementById(arrowId);
  if (menu) {
    menu.classList.toggle('hidden');
    if (arrow) {
      arrow.style.transform = menu.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(180deg)';
    }
  }
};

window.openEditGoalModal = function (goalId) {
  const goal = window.SF_STORE?.getSlice('goals')?.items?.find(g => g.id === goalId);
  if (!goal) return;

  let modalEl = document.getElementById('globalEditGoalModal');
  if (!modalEl) {
    modalEl = document.createElement('div');
    modalEl.id = 'globalEditGoalModal';
    modalEl.className = 'fixed inset-0 z-[999999999] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn p-4';
    modalEl.innerHTML = `
      <div class="bg-[#0D0D0D] border border-[#2A2A2A] p-6 rounded-[20px] w-full max-w-md shadow-saas space-y-5">
        <div class="flex items-center justify-between pb-3 border-b border-[#1C1C1C]">
          <h3 class="text-base font-bold text-[#FAFAFA]">Edit Goal</h3>
          <button onclick="document.getElementById('globalEditGoalModal').style.display='none'" class="text-[#6B7280] hover:text-[#FAFAFA]">✕</button>
        </div>
        <form id="globalEditGoalForm" class="space-y-4" onsubmit="event.preventDefault(); window.submitEditGoal();">
          <input id="editGoalIdHidden" type="hidden" />
          <div>
            <label class="block text-xs font-semibold text-[#A1A1AA] uppercase mb-1.5">Title</label>
            <input id="editGoalTitle" type="text" class="input py-2.5 text-xs bg-[#0A0A0A] border-[#2A2A2A]" required />
          </div>
          <div>
            <label class="block text-xs font-semibold text-[#A1A1AA] uppercase mb-1.5">Description</label>
            <input id="editGoalDesc" type="text" class="input py-2.5 text-xs bg-[#0A0A0A] border-[#2A2A2A]" />
          </div>
          <div class="relative sf-custom-select-container">
            <label class="block text-xs font-semibold text-[#A1A1AA] uppercase mb-1.5">Priority / Urgency</label>
            <select id="editGoalUrgency" class="hidden">
              <option value="High">High / Urgent</option>
              <option value="Focus">Focus</option>
              <option value="Review">Review</option>
              <option value="Study">Study</option>
              <option value="Medium">Medium</option>
            </select>
            <button type="button" onclick="document.getElementById('sf-menu-editGoalUrgency').classList.toggle('hidden')" class="w-full px-3 py-2.5 rounded-xl bg-[#0A0A0A] border border-[#2A2A2A] hover:border-[#A855F7]/60 text-white text-xs font-semibold focus:outline-none focus:border-[#A855F7] transition-all duration-200 flex items-center justify-between group">
              <span id="sf-display-editGoalUrgency" class="flex items-center gap-2 text-white">High / Urgent</span>
              <svg class="w-3.5 h-3.5 text-[#A1A1AA] group-hover:text-white transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
            </button>
            <div id="sf-menu-editGoalUrgency" class="hidden absolute left-0 right-0 mt-1 bg-[#12121A]/95 backdrop-blur-xl border border-[#2A2A38] rounded-xl shadow-[0_12px_35px_rgba(0,0,0,0.85)] p-1 z-[999999999] space-y-0.5 max-h-40 overflow-y-auto">
              ${['High / Urgent', 'Focus', 'Review', 'Study', 'Medium'].map(t => {
                const val = t.split(' / ')[0];
                return `<div onclick="document.getElementById('editGoalUrgency').value='${val}'; document.getElementById('sf-display-editGoalUrgency').innerText='${t}'; document.getElementById('sf-menu-editGoalUrgency').classList.add('hidden');" class="px-2.5 py-1.5 rounded-lg cursor-pointer flex items-center gap-2 text-xs transition-all duration-150 hover:bg-white/5 text-[#A1A1AA] hover:text-white">${t}</div>`;
              }).join('')}
            </div>
          </div>
          <div>
            <label class="block text-xs font-semibold text-[#A1A1AA] uppercase mb-1.5">Deadline</label>
            <div id="modalEditDeadlineContainer"></div>
          </div>
          <div>
            <label class="block text-xs font-semibold text-[#A1A1AA] uppercase mb-1.5">Subtasks (One per line)</label>
            <textarea id="editGoalSubtasks" rows="3" class="input py-2 text-xs bg-[#0A0A0A] border-[#2A2A2A] resize-none"></textarea>
          </div>
          <div class="flex items-center justify-end space-x-3 pt-2">
            <button type="button" onclick="document.getElementById('globalEditGoalModal').style.display='none'" class="btn btn-ghost px-4 py-2 text-xs">Cancel</button>
            <button type="submit" class="btn btn-primary px-5 py-2 text-xs font-bold shadow-[0_0_20px_rgba(168,85,247,0.25)]">Save Changes →</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modalEl);
  }

  document.getElementById('editGoalIdHidden').value = goal.id;
  document.getElementById('editGoalTitle').value = goal.title || '';
  document.getElementById('editGoalDesc').value = goal.description || '';
  const urgencyValue = goal.urgency === 'URGENT' ? 'High' : goal.urgency === 'UPCOMING' ? 'Medium' : 'Focus';
  const urgencyDisplay = urgencyValue === 'High' ? 'High / Urgent' : urgencyValue;
  const eInput = document.getElementById('editGoalUrgency');
  eInput.value = urgencyValue;
  document.getElementById('sf-display-editGoalUrgency').innerText = urgencyDisplay;
  document.getElementById('editGoalSubtasks').value = (goal.subtasks || []).map(s => s.title).join('\n');
  
  if (window.createDeadlineSelector) {
    if (!window.editDeadlineSelector) {
      window.editDeadlineSelector = window.createDeadlineSelector(document.getElementById('modalEditDeadlineContainer'));
    }
    window.editDeadlineSelector.setValue(goal.deadline || goal.finalDeadlineDisplay || goal.finalDeadline || null);
  }

  modalEl.style.display = 'flex';
};

window.submitEditGoal = async function () {
  const goalId = document.getElementById('editGoalIdHidden').value;
  const title = document.getElementById('editGoalTitle').value.trim();
  const description = document.getElementById('editGoalDesc').value.trim();
  const tag = document.getElementById('editGoalUrgency').value;
  const urgency = tag === 'High' ? 'URGENT' : (tag === 'Medium' || tag === 'Review' ? 'UPCOMING' : 'ACTIVE');
  const subtasksText = document.getElementById('editGoalSubtasks').value;

  if (!title || !goalId) return;

  const validation = window.editDeadlineSelector.validate();
  if (!validation.valid) {
    if (window.SF_COMPONENTS && window.SF_COMPONENTS.showToast) {
      window.SF_COMPONENTS.showToast(validation.error, 'error');
    }
    return;
  }
  const deadlinePayload = window.editDeadlineSelector.getValue();

  const existing = window.SF_STORE?.getSlice('goals')?.items?.find(g => g.id === goalId);
  const lines = subtasksText.split('\n').map(l => l.trim()).filter(Boolean);
  const subtasks = lines.map((line, idx) => {
    const oldSub = existing?.subtasks?.find(s => s.title.toLowerCase() === line.toLowerCase()) || existing?.subtasks?.[idx];
    return {
      id: oldSub?.id || ('sub_' + Math.random().toString(36).substr(2, 7)),
      title: line,
      completed: oldSub ? oldSub.completed : false,
      priority: oldSub?.priority || 'High',
      estimate: oldSub?.estimate || '2 Pomodoros',
      deadline: oldSub?.deadline || null
    };
  });

  document.getElementById('globalEditGoalModal').style.display = 'none';
  try {
    await window.SF_STORE.dispatch('goals/UPDATE', {
      goalId,
      patch: {
        title,
        description,
        urgency,
        deadline: deadlinePayload,
        subtasks
      }
    });
    if (window.SF_COMPONENTS && window.SF_COMPONENTS.showToast) {
      window.SF_COMPONENTS.showToast('Goal updated successfully.', 'success');
    }
  } catch (err) {
    console.error('[Edit Goal Error]:', err);
    if (window.SF_COMPONENTS && window.SF_COMPONENTS.showToast) {
      window.SF_COMPONENTS.showToast(err.message || 'Failed to update goal', 'error');
    }
  }
};

window.confirmDeleteGoal = function (goalId, event) {
  if (event && typeof event.stopPropagation === 'function') {
    event.stopPropagation();
  }

  const performDelete = async () => {
    try {
      await window.SF_STORE.dispatch('goals/DELETE', { goalId });
      if (window.SF_COMPONENTS && window.SF_COMPONENTS.showToast) {
        window.SF_COMPONENTS.showToast("Goal deleted successfully.", "success");
      }
    } catch (err) {
      console.error("[Delete Goal Error]:", err);
      if (window.SF_COMPONENTS && window.SF_COMPONENTS.showToast) {
        window.SF_COMPONENTS.showToast(err.message || "Failed to delete goal.", "error");
      }
    }
  };

  if (window.SF_COMPONENTS && typeof window.SF_COMPONENTS.showConfirm === 'function') {
    window.SF_COMPONENTS.showConfirm({
      title: "Delete Goal?",
      description: "This action cannot be undone. The goal and all of its associated subtasks will be permanently deleted.",
      confirmText: "Delete Goal",
      cancelText: "Cancel",
      onConfirm: performDelete
    });
  } else if (confirm("Delete this goal?")) {
    performDelete();
  }
};

window.selectCustomDropdownItem = function (menuId, arrowId, textId, displayValue, callback) {
  const textEl = document.getElementById(textId);
  if (textEl) textEl.textContent = displayValue;
  window.toggleCustomDropdown(menuId, arrowId);
  if (typeof callback === 'function') callback();
};

document.addEventListener('click', function (e) {
  if (!e.target || typeof e.target.closest !== 'function') return;
  if (!e.target.closest('.custom-dropdown-container')) {
    document.querySelectorAll('.custom-dropdown-menu').forEach(m => m.classList.add('hidden'));
    document.querySelectorAll('.custom-dropdown-arrow').forEach(a => a.style.transform = 'rotate(0deg)');
  }
  if (!e.target.closest('.sf-custom-select-container')) {
    document.querySelectorAll('.sf-custom-select-container .absolute').forEach(m => m.classList.add('hidden'));
  }
});

// Global Modular Router Registry
window.SF_ROUTER = window.SF_ROUTER || {
  routes: {},
  register(routeName, handler) {
    this.routes[routeName] = handler;
    if (this._activeRoute === routeName && typeof handler.init === 'function') {
      handler.init();
    }
  },
  dispatch() {
    const page = window.location.pathname.split('/').pop() || 'dashboard.html';
    const routeKey = page.replace('.html', '') || 'dashboard';
    this._activeRoute = routeKey === 'index' ? 'dashboard' : routeKey;

    const protectedRoutes = ['dashboard', 'workspace', 'planner', 'analytics', 'focus', 'settings', 'idealab'];
    if (protectedRoutes.includes(this._activeRoute)) {
      if (window.SF_CONFIG && !window.SF_CONFIG.USE_MOCK_API) {
        const tokenKey = window.SF_CONFIG.AUTH_TOKEN_KEY || 'accessToken';
        const isAuth = window.authService ? window.authService.isAuthenticated() : !!localStorage.getItem(tokenKey);
        if (!isAuth) {
          window.location.replace('login.html');
          return;
        }
      }
    } else if (['login', 'register'].includes(this._activeRoute)) {
      if (window.authService && window.authService.isAuthenticated()) {
        setTimeout(async () => {
          const user = await window.authService.restoreSession();
          if (user) {
            window.location.href = 'dashboard.html';
          }
        }, 50);
      }
    }
    
    if (window._sfPendingRoutes && window._sfPendingRoutes[this._activeRoute]) {
      this.routes[this._activeRoute] = window._sfPendingRoutes[this._activeRoute];
    }

    if (this.routes[this._activeRoute] && typeof this.routes[this._activeRoute].init === 'function') {
      this.routes[this._activeRoute].init();
    } else {
      const script = document.createElement('script');
      script.src = `router/${this._activeRoute}.router.js`;
      script.async = false;
      document.head.appendChild(script);
    }
  }
};

// Router & Injection Engine
function initializeStudyFlowRouter() {
  if (!window.SF_CONFIG) {
    const sc = document.createElement('script');
    sc.src = 'src/js/config.js';
    sc.async = false;
    document.head.appendChild(sc);
  }
  if (!window.SF_HTTP) {
    const sc = document.createElement('script');
    sc.src = 'src/js/http.js';
    sc.async = false;
    document.head.appendChild(sc);
  }
  if (!window.authService) {
    const sc = document.createElement('script');
    sc.src = 'src/js/services/authService.js';
    sc.async = false;
    document.head.appendChild(sc);
  }
  if (!window.SF_COMPONENTS) {
    const sc = document.createElement('script');
    sc.src = 'src/js/components.js';
    sc.async = false;
    document.head.appendChild(sc);
  }

  // Global escape key listener to close modals
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      ['globalAddModal', 'ideaLabBlueprintModal', 'globalDialogModal'].forEach(id => {
        const m = document.getElementById(id);
        if (m && m.style.display !== 'none') m.style.display = 'none';
      });
    }
  });

  const includeTags = document.querySelectorAll('include');
  includeTags.forEach(tag => {
    const src = tag.getAttribute('src');
    const id = tag.getAttribute('id');
    if (window.StudyFlowTemplates[src]) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = window.StudyFlowTemplates[src].trim();
      const injectedEl = tempDiv.firstElementChild;
      if (id && injectedEl) injectedEl.id = id;
      if (injectedEl) tag.replaceWith(injectedEl);
    }
  });

  // Apply saved platform settings across UI
  const savedSettings = JSON.parse(localStorage.getItem('studyflow_settings') || '{}');
  if (savedSettings.name) {
    document.querySelectorAll('aside h4, header img + span, .nav-profile-name').forEach(el => {
      if (el) el.textContent = savedSettings.name;
    });
  }
  if (savedSettings.email) {
    document.querySelectorAll('aside p').forEach(el => {
      if (el && el.textContent.includes('Plan')) el.title = savedSettings.email;
    });
  }

  // Active Pill Styling
  const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';
  document.querySelectorAll('.nav-item').forEach(item => {
    const href = item.getAttribute('href');
    if (href === currentPage || (currentPage === 'index.html' && href === 'dashboard.html')) {
      item.className = 'nav-item flex items-center space-x-3 px-4 py-3 rounded-xl transition duration-200 border border-[#A855F7] bg-[#A855F7]/15 text-[#FAFAFA] shadow-[0_0_20px_rgba(168,85,247,0.25)] font-semibold';
    }
  });

  const pageTitleEl = document.getElementById('pageTitleDisplay');
  if (pageTitleEl) {
    const name = currentPage.replace('.html', '').replace('-', ' ');
    pageTitleEl.textContent = name === 'index' ? 'Dashboard' : name;
  }

  const htmlEl = document.documentElement;
  htmlEl.classList.add('dark');

  // Timer Initialization
  const startBtn = document.getElementById('startBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const resetBtn = document.getElementById('resetBtn');
  const timerDisplay = document.getElementById('timerDisplay');
  if (startBtn && timerDisplay) {
    let totalSeconds = 1500;
    let remaining = totalSeconds;
    let timerInterval = null;

    const updateDisplay = () => {
      const mins = String(Math.floor(remaining / 60)).padStart(2, '0');
      const secs = String(remaining % 60).padStart(2, '0');
      timerDisplay.textContent = `${mins}:${secs}`;
    };

    startBtn.onclick = () => {
      if (timerInterval) return;
      startBtn.classList.add('hidden');
      pauseBtn.classList.remove('hidden');
      resetBtn.classList.remove('hidden');
      timerInterval = setInterval(() => {
        if (remaining > 0) { remaining--; updateDisplay(); }
        else { clearInterval(timerInterval); timerInterval = null; alert('🎉 Focus Block Complete!'); }
      }, 1000);
    };

    if (pauseBtn) {
      pauseBtn.onclick = () => { clearInterval(timerInterval); timerInterval = null; pauseBtn.classList.add('hidden'); startBtn.classList.remove('hidden'); startBtn.textContent = 'Resume'; };
    }
    if (resetBtn) {
      resetBtn.onclick = () => { clearInterval(timerInterval); timerInterval = null; remaining = totalSeconds; updateDisplay(); startBtn.classList.remove('hidden'); startBtn.textContent = 'Start'; pauseBtn.classList.add('hidden'); resetBtn.classList.add('hidden'); };
    }
  }

  // Chat Form
  const aiForm = document.getElementById('aiChatForm');
  const chatContainer = document.getElementById('chatContainer');
  if (aiForm && chatContainer) {
    aiForm.onsubmit = (e) => {
      e.preventDefault();
      const inputEl = aiForm.querySelector('input');
      const text = inputEl.value.trim();
      if (!text) return;

      const userDiv = document.createElement('div');
      userDiv.className = 'flex items-start justify-end space-x-3 mt-3';
      userDiv.innerHTML = `<div class="bg-[#A855F7] text-[#FAFAFA] p-3.5 rounded-2xl rounded-tr-sm text-xs max-w-[85%] shadow-md">${text}</div>`;
      chatContainer.appendChild(userDiv);
      inputEl.value = '';
      chatContainer.scrollTop = chatContainer.scrollHeight;

      setTimeout(() => {
        const botDiv = document.createElement('div');
        botDiv.className = 'flex items-start space-x-3 mt-3';
        botDiv.innerHTML = `<div class="w-7 h-7 rounded-lg bg-[#151515] border border-[#2A2A2A] flex items-center justify-center text-[#A855F7] shrink-0 mt-0.5"><svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 2A2 2 0 0 1 14 4C14 4.74 13.6 5.39 13 5.73V7H14A7 7 0 0 1 21 14H22A1 1 0 0 1 23 15V18A1 1 0 0 1 22 19H21V20A2 2 0 0 1 19 22H5A2 2 0 0 1 3 20V19H2A1 1 0 0 1 1 18V15A1 1 0 0 1 2 14H3A7 7 0 0 1 10 7H11V5.73C10.4 5.39 10 4.74 10 4A2 2 0 0 1 12 2M7.5 13A2.5 2.5 0 0 0 5 15.5A2.5 2.5 0 0 0 7.5 18A2.5 2.5 0 0 0 10 15.5A2.5 2.5 0 0 0 7.5 13M16.5 13A2.5 2.5 0 0 0 14 15.5A2.5 2.5 0 0 0 16.5 18A2.5 2.5 0 0 0 19 15.5A2.5 2.5 0 0 0 16.5 13Z"/></svg></div>
          <div class="bg-[#151515] border border-[#2A2A2A] p-3.5 rounded-2xl rounded-tl-sm text-xs text-[#A1A1AA] leading-relaxed max-w-[85%]">
            ✨ Excellent strategy! Let’s allocate 2 focus blocks for that today.
          </div>`;
        chatContainer.appendChild(botDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }, 600);
    };
  }

  // Universal Pure Black Glassmorphism Tooltip Engine (Targeted Debugging & Lifecycle Polish)
  if (!window._sfTooltipEngineInitialized) {
    window._sfTooltipEngineInitialized = true;

    let activeTooltipEl = null;
    let activeTriggerEl = null;
    let mousemoveListener = null;
    let domCheckInterval = null;

    function getActivePopupCount() {
      return document.querySelectorAll('#studyflow-custom-tooltip, .sf-floating-tooltip').length;
    }

    function destroyTooltip(reason = '') {
      const allTooltips = document.querySelectorAll('#studyflow-custom-tooltip, .sf-floating-tooltip');
      const hadTooltips = allTooltips.length > 0 || activeTooltipEl !== null;

      allTooltips.forEach(el => {
        if (el && el.parentNode) {
          el.parentNode.removeChild(el);
        }
      });

      if (mousemoveListener) {
        document.removeEventListener('mousemove', mousemoveListener);
        mousemoveListener = null;
      }
      if (domCheckInterval) {
        clearInterval(domCheckInterval);
        domCheckInterval = null;
      }

      activeTooltipEl = null;
      activeTriggerEl = null;

      if (hadTooltips) {
        console.log('popup destroyed | active popup count:', getActivePopupCount());
      }
    }
    window._destroySfTooltip = destroyTooltip;

    function createTooltip(target, text, initialEvent) {
      // If currently dragging or resizing or holding down mouse button, do not create tooltip
      if ((initialEvent && initialEvent.buttons !== 0) || window._sfIsDraggingOrResizing) {
        return;
      }
      // If already active for this exact target and element is in DOM, just return
      if (activeTriggerEl === target && activeTooltipEl && document.body.contains(activeTooltipEl)) {
        return;
      }

      destroyTooltip('re-create');

      activeTriggerEl = target;
      activeTooltipEl = document.createElement('div');
      activeTooltipEl.id = 'studyflow-custom-tooltip';
      activeTooltipEl.className = 'sf-floating-tooltip fixed z-[99999] px-3 py-1.5 rounded-xl bg-[#0E0E0E]/95 backdrop-blur-md border border-[#A855F7]/50 text-xs font-bold text-[#FAFAFA] shadow-[0_0_20px_rgba(168,85,247,0.3)] pointer-events-none transition-all duration-150 opacity-100 scale-100 tracking-wide font-sans';
      activeTooltipEl.textContent = text;
      document.body.appendChild(activeTooltipEl);

      console.log('popup created | active popup count:', getActivePopupCount());

      function positionTooltip(x, y) {
        if (!activeTooltipEl || !document.body.contains(activeTooltipEl)) return;
        const rect = activeTooltipEl.getBoundingClientRect();
        const finalX = x + 12 + rect.width > window.innerWidth ? x - rect.width - 8 : x + 12;
        const finalY = y + 14 + rect.height > window.innerHeight ? y - rect.height - 8 : y + 14;
        if (activeTooltipEl.style.left !== `${finalX}px` || activeTooltipEl.style.top !== `${finalY}px`) {
          activeTooltipEl.style.left = `${finalX}px`;
          activeTooltipEl.style.top = `${finalY}px`;
          console.log('popup repositioned');
        }
      }

      if (initialEvent) {
        positionTooltip(initialEvent.clientX, initialEvent.clientY);
      }

      mousemoveListener = (e) => {
        if (!activeTriggerEl || !document.body.contains(activeTriggerEl) || !activeTriggerEl.isConnected) {
          destroyTooltip('trigger removed on mousemove');
          return;
        }
        if (e.buttons !== 0 || window._sfIsDraggingOrResizing) {
          destroyTooltip('mouse button held or dragging');
          return;
        }
        positionTooltip(e.clientX, e.clientY);
      };
      document.addEventListener('mousemove', mousemoveListener);

      // Automatically destroy if trigger element is removed from DOM
      domCheckInterval = setInterval(() => {
        if (!activeTriggerEl || !document.body.contains(activeTriggerEl) || !activeTriggerEl.isConnected) {
          destroyTooltip('trigger removed from DOM');
        } else if (window._sfIsDraggingOrResizing) {
          destroyTooltip('dragging active');
        }
      }, 150);
    }

    // 1. Enter events (mouseenter, mouseover, pointerenter)
    ['mouseover', 'mouseenter', 'pointerenter'].forEach(evt => {
      document.addEventListener(evt, (e) => {
        if (e.buttons !== 0 || window._sfIsDraggingOrResizing) return;
        if (!e.target || typeof e.target.closest !== 'function') return;
        const target = e.target.closest('[title], [data-tooltip]');
        if (target) {
          const text = target.getAttribute('title') || target.getAttribute('data-tooltip');
          if (text) {
            target.setAttribute('data-tooltip', text);
            target.removeAttribute('title');
            createTooltip(target, text, e);
          }
        }
      }, true);
    });

    // 2. Leave events (mouseleave, mouseout, pointerleave)
    ['mouseout', 'mouseleave', 'pointerleave'].forEach(evt => {
      document.addEventListener(evt, (e) => {
        if (!activeTriggerEl) return;
        if (activeTriggerEl === e.target || activeTriggerEl.contains(e.target)) {
          if (!e.relatedTarget || !activeTriggerEl.contains(e.relatedTarget)) {
            destroyTooltip('leave event: ' + evt);
          }
        }
      }, true);
    });

    // 3. Click, drag, and mouse button events (click, mousedown, mouseup, dragstart, dragend)
    ['click', 'mousedown', 'mouseup', 'dragstart', 'dragend', 'pointerdown', 'pointerup', 'blur'].forEach(evt => {
      document.addEventListener(evt, () => {
        destroyTooltip('cancel event: ' + evt);
      }, true);
    });

    // 4. Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') destroyTooltip('Escape key');
    }, true);
  } else {
    // If router initialized again, ensure any stale tooltip is cleaned up
    if (window._destroySfTooltip) window._destroySfTooltip('re-init');
  }

  // Dispatch modular route handler
  window.SF_ROUTER.dispatch();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeStudyFlowRouter);
} else {
  initializeStudyFlowRouter();
}
