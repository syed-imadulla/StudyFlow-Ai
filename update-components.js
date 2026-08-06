const fs = require('fs');

let content = fs.readFileSync('frontend/src/js/components.js', 'utf8');

// 1. Replace the task card action buttons for both 'dashboard' and 'workspace' modes
const oldDashboardButtons = `<div class="flex items-center space-x-2.5 shrink-0">
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold \${badgeColor}">\${sub.priority ? sub.priority.charAt(0).toUpperCase() + sub.priority.slice(1).toLowerCase() : 'High'}</span>
              <button onclick="window.openScheduleMilestoneModal('\${goalId}', '\${sub.id}')" class="p-1.5 rounded-lg bg-[#151515] hover:bg-[#38BDF8]/20 text-[#38BDF8] transition" title="Schedule Milestone">
                <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7v-5z"/></svg>
              </button>
              <button onclick="window.location.href='focus.html'" class="p-1.5 rounded-lg bg-[#151515] hover:bg-[#A855F7]/20 text-[#A855F7] transition" title="Start Focus Block">
                <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              </button>
            </div>`;

const oldWorkspaceButtons = `<div class="flex items-center space-x-2.5 shrink-0">
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold \${badgeColor}">\${sub.priority ? sub.priority.charAt(0).toUpperCase() + sub.priority.slice(1).toLowerCase() : 'High'}</span>
              <div class="flex items-center bg-[#151520] rounded-lg border border-[#252535] p-0.5 space-x-0.5">
                <button onclick="window.openSubtaskIdeaLab('\${goalId}', '\${sub.id}')" class="p-1.5 rounded-md hover:bg-[#A855F7]/20 text-[#A855F7] transition flex items-center justify-center" title="Open IdeaLab Guide">
                  <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z"/></svg>
                </button>
                <button onclick="window.openScheduleMilestoneModal('\${goalId}', '\${sub.id}')" class="p-1.5 rounded-md hover:bg-[#38BDF8]/20 text-[#38BDF8] transition flex items-center justify-center" title="Schedule Milestone">
                  <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7v-5z"/></svg>
                </button>
                <button onclick="window.location.href='focus.html'" class="p-1.5 rounded-md hover:bg-[#FACC15]/20 text-[#FACC15] transition flex items-center justify-center" title="Start Focus Timer">
                  <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                </button>
              </div>
            </div>`;

const newButtons = `<div class="flex items-center space-x-3 shrink-0">
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold \${badgeColor}">\${sub.priority ? sub.priority.charAt(0).toUpperCase() + sub.priority.slice(1).toLowerCase() : 'High'}</span>
              <div class="flex items-center bg-[#111116] border border-[#20202A] rounded-[10px] p-0.5 space-x-1 hover:border-[#303040] shadow-sm transition">
                <button onclick="window.openSubtaskIdeaLab('\${goalId}', '\${sub.id}')" class="p-1 w-7 h-7 rounded-lg hover:bg-[#A855F7]/15 text-[#A855F7] transition flex items-center justify-center hover:shadow-[0_0_12px_rgba(168,85,247,0.3)] group relative" title="AI IdeaLab">
                  <svg class="w-3.5 h-3.5 fill-current group-hover:scale-110 transition-transform" viewBox="0 0 24 24"><path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z"/></svg>
                </button>
                <button onclick="window.openScheduleMilestoneModal('\${goalId}', '\${sub.id}')" class="p-1 w-7 h-7 rounded-lg hover:bg-[#A855F7]/15 text-[#A855F7] transition flex items-center justify-center hover:shadow-[0_0_12px_rgba(168,85,247,0.3)] group relative" title="Schedule to Planner">
                  <svg class="w-3.5 h-3.5 fill-current group-hover:scale-110 transition-transform" viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7v-5z"/></svg>
                </button>
                <button onclick="window.location.href='focus.html'" class="p-1 w-7 h-7 rounded-lg hover:bg-[#FACC15]/15 text-[#FACC15] transition flex items-center justify-center hover:shadow-[0_0_12px_rgba(250,204,21,0.3)] group relative" title="Start Focus Timer">
                  <svg class="w-3 h-3 fill-current group-hover:scale-110 transition-transform" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                </button>
              </div>
            </div>`;

content = content.replace(oldDashboardButtons, newButtons);
content = content.replace(oldWorkspaceButtons, newButtons);

// 2. Extract and replace the existing schedule modal logic
const oldModalLogicRegex = /\/\/ Global Schedule Milestone Modal Handler[\s\S]*/;
const newModalLogic = `// Premium Schedule Milestone Modal
window.ScheduleModal = {
  date: new Date(),
  timeStr: '09:00',
  duration: 60,
  
  open(goalId, milestoneId) {
    const goal = window.SF_STORE?.state?.goals?.items?.find(g => g.id === goalId) || { title: 'Goal' };
    const milestone = goal.subtasks?.find(s => s.id === milestoneId) || { title: 'Milestone' };
    
    this.goalId = goalId;
    this.milestoneId = milestoneId;
    this.goalTitle = goal.title;
    this.milestoneTitle = milestone.title;
    
    const now = new Date();
    this.date = now;
    let h = now.getHours() + 1;
    if (h > 23) h = 23;
    this.timeStr = \`\${String(h).padStart(2, '0')}:00\`;
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
      modalEl.className = 'fixed inset-0 z-[100000] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn p-4';
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
      if (!e.target.closest('#sm-duration-wrapper')) document.getElementById('sm-duration-dropdown').classList.add('hidden');
    });
  },
  
  close() {
    const modalEl = document.getElementById('globalScheduleModal');
    if (modalEl) modalEl.style.display = 'none';
  },

  getModalHtml() {
    return \`
      <div class="modal-content-box bg-[#0A0A0A] border border-[#202020] p-7 rounded-[24px] w-full max-w-[400px] shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_30px_rgba(168,85,247,0.15)] relative animate-fadeIn flex flex-col gap-6">
        
        <!-- Header -->
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3.5">
            <div class="w-10 h-10 rounded-[14px] bg-[#A855F7]/10 border border-[#A855F7]/20 flex items-center justify-center text-[#A855F7] shadow-[0_0_15px_rgba(168,85,247,0.2)]">
              <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7v-5z"/></svg>
            </div>
            <h3 class="text-[17px] font-bold text-[#FAFAFA] tracking-tight">Schedule to Planner</h3>
          </div>
          <button onclick="window.ScheduleModal.close()" class="w-8 h-8 flex items-center justify-center rounded-full text-[#6B7280] hover:bg-[#1A1A1A] hover:text-[#FAFAFA] transition">
            <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg>
          </button>
        </div>

        <!-- Read Only Goal/Milestone Card -->
        <div class="bg-[#111111] border border-[#202020] rounded-[16px] p-4 flex flex-col gap-3">
          <div>
            <div class="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-1">Goal</div>
            <div class="text-[13px] font-bold text-[#FAFAFA] truncate">\${this.goalTitle}</div>
          </div>
          <div>
            <div class="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-1">Milestone</div>
            <div class="text-[13px] font-bold text-[#A855F7] truncate">\${this.milestoneTitle}</div>
          </div>
        </div>
        
        <!-- Pickers -->
        <div class="flex flex-col gap-4">
          <!-- Date Picker -->
          <div id="sm-date-wrapper" class="relative">
            <label class="block text-[11px] font-bold text-[#A1A1AA] uppercase tracking-wider mb-2">Date</label>
            <div onclick="window.ScheduleModal.toggleDatePicker()" class="w-full bg-[#111111] border border-[#2A2A2A] hover:border-[#A855F7]/50 focus-within:border-[#A855F7]/50 rounded-[12px] p-3.5 flex items-center justify-between cursor-pointer transition group">
              <span id="sm-date-display" class="text-[13px] font-semibold text-[#FAFAFA]">Select Date</span>
              <svg class="w-4 h-4 text-[#6B7280] group-hover:text-[#A855F7] transition" viewBox="0 0 24 24"><path fill="currentColor" d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7v-5z"/></svg>
            </div>
            
            <div id="sm-date-dropdown" class="hidden absolute top-full left-0 right-0 mt-2 bg-[#111111] border border-[#2A2A2A] rounded-[16px] p-4 shadow-[0_20px_40px_rgba(0,0,0,0.8)] z-50 animate-fadeIn">
              <div class="flex items-center justify-between mb-4">
                <button type="button" onclick="window.ScheduleModal.changeMonth(-1); event.stopPropagation();" class="w-6 h-6 flex items-center justify-center rounded hover:bg-[#1A1A1A] hover:text-[#FAFAFA] text-[#A1A1AA]">&lsaquo;</button>
                <div id="sm-calendar-title" class="text-xs font-bold text-[#FAFAFA]"></div>
                <button type="button" onclick="window.ScheduleModal.changeMonth(1); event.stopPropagation();" class="w-6 h-6 flex items-center justify-center rounded hover:bg-[#1A1A1A] hover:text-[#FAFAFA] text-[#A1A1AA]">&rsaquo;</button>
              </div>
              <div class="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-[#6B7280] mb-2">
                <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
              </div>
              <div id="sm-calendar-grid" class="grid grid-cols-7 gap-1"></div>
            </div>
          </div>

          <!-- Time and Duration Row -->
          <div class="grid grid-cols-2 gap-4">
            <!-- Time Picker -->
            <div id="sm-time-wrapper" class="relative">
              <label class="block text-[11px] font-bold text-[#A1A1AA] uppercase tracking-wider mb-2">Time</label>
              <div onclick="window.ScheduleModal.toggleTimePicker()" class="w-full bg-[#111111] border border-[#2A2A2A] hover:border-[#A855F7]/50 rounded-[12px] p-3.5 flex items-center justify-between cursor-pointer transition group">
                <span id="sm-time-display" class="text-[13px] font-semibold text-[#FAFAFA]">--:-- --</span>
                <svg class="w-4 h-4 text-[#6B7280] group-hover:text-[#A855F7] transition" viewBox="0 0 24 24"><path fill="currentColor" d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
              </div>
              <div id="sm-time-dropdown" class="hidden absolute top-full left-0 w-full mt-2 bg-[#111111] border border-[#2A2A2A] rounded-[16px] p-2 shadow-[0_20px_40px_rgba(0,0,0,0.8)] z-50 animate-fadeIn flex justify-between gap-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              </div>
            </div>

            <!-- Duration Picker -->
            <div id="sm-duration-wrapper" class="relative">
              <label class="block text-[11px] font-bold text-[#A1A1AA] uppercase tracking-wider mb-2">Duration</label>
              <div onclick="window.ScheduleModal.toggleDurationPicker()" class="w-full bg-[#111111] border border-[#2A2A2A] hover:border-[#A855F7]/50 rounded-[12px] p-3.5 flex items-center justify-between cursor-pointer transition group">
                <span id="sm-duration-display" class="text-[13px] font-semibold text-[#FAFAFA]">Select duration</span>
                <svg class="w-4 h-4 text-[#6B7280] group-hover:text-[#A855F7] transition" viewBox="0 0 24 24"><path fill="currentColor" d="M7 10l5 5 5-5z"/></svg>
              </div>
              <div id="sm-duration-dropdown" class="hidden absolute top-full right-0 w-full mt-2 bg-[#111111] border border-[#2A2A2A] rounded-[16px] py-2 shadow-[0_20px_40px_rgba(0,0,0,0.8)] z-50 animate-fadeIn">
                 <div onclick="window.ScheduleModal.selectDuration(30)" class="px-4 py-2.5 text-[13px] font-medium text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#1A1A1A] cursor-pointer transition">30 min</div>
                 <div onclick="window.ScheduleModal.selectDuration(45)" class="px-4 py-2.5 text-[13px] font-medium text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#1A1A1A] cursor-pointer transition">45 min</div>
                 <div onclick="window.ScheduleModal.selectDuration(60)" class="px-4 py-2.5 text-[13px] font-medium text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#1A1A1A] cursor-pointer transition">60 min</div>
                 <div onclick="window.ScheduleModal.selectDuration(90)" class="px-4 py-2.5 text-[13px] font-medium text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#1A1A1A] cursor-pointer transition">90 min</div>
                 <div onclick="window.ScheduleModal.selectDuration(120)" class="px-4 py-2.5 text-[13px] font-medium text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#1A1A1A] cursor-pointer transition">120 min</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-end space-x-3 pt-2">
          <button type="button" onclick="window.ScheduleModal.close()" class="px-5 py-2.5 rounded-[12px] text-[13px] font-bold text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#1A1A1A] transition">Cancel</button>
          <button type="button" onclick="window.ScheduleModal.submit()" id="scheduleSubmitBtn" class="px-6 py-2.5 rounded-[12px] bg-gradient-to-r from-[#A855F7] to-[#9333EA] hover:from-[#9333EA] hover:to-[#7E22CE] text-white text-[13px] font-bold shadow-[0_0_20px_rgba(168,85,247,0.3)] transition flex items-center space-x-2">
            <span id="scheduleSubmitText">Schedule</span>
            <svg id="scheduleSubmitSpinner" class="animate-spin -mr-1 ml-2 h-4 w-4 text-white hidden" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </button>
        </div>
      </div>
    \`;
  },

  updateDisplay() {
    const dStr = this.date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
    document.getElementById('sm-date-display').innerText = dStr;

    let [h, m] = this.timeStr.split(':').map(Number);
    let ampm = h >= 12 ? 'PM' : 'AM';
    let hr12 = h % 12 || 12;
    document.getElementById('sm-time-display').innerText = \`\${String(hr12).padStart(2, '0')}:\${String(m).padStart(2, '0')} \${ampm}\`;

    document.getElementById('sm-duration-display').innerText = \`\${this.duration} min\`;
    
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

  toggleDurationPicker() {
    const dd = document.getElementById('sm-duration-dropdown');
    const wasHidden = dd.classList.contains('hidden');
    this.hideAllDropdowns();
    if (wasHidden) dd.classList.remove('hidden');
  },

  hideAllDropdowns() {
    document.getElementById('sm-date-dropdown').classList.add('hidden');
    document.getElementById('sm-time-dropdown').classList.add('hidden');
    document.getElementById('sm-duration-dropdown').classList.add('hidden');
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
    document.getElementById('sm-calendar-title').innerText = \`\${monthName} \${this.currentYear}\`;
    
    const startDay = d.getDay();
    const daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(this.currentYear, this.currentMonth, 0).getDate();
    
    for (let i = 0; i < startDay; i++) {
      grid.innerHTML += \`<div class="p-1.5 text-center text-[11px] font-medium text-[#3A3A3A]">\${daysInPrevMonth - startDay + i + 1}</div>\`;
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      const isSelected = (this.date.getDate() === i && this.date.getMonth() === this.currentMonth && this.date.getFullYear() === this.currentYear);
      const isToday = (new Date().getDate() === i && new Date().getMonth() === new Date().getMonth() && new Date().getFullYear() === new Date().getFullYear());
      
      let classes = "p-1.5 text-center text-[11px] font-semibold rounded-[8px] cursor-pointer transition ";
      if (isSelected) {
        classes += "bg-[#A855F7]/20 text-[#FAFAFA] border border-[#A855F7]/50 shadow-[0_0_10px_rgba(168,85,247,0.3)]";
      } else if (isToday) {
        classes += "text-[#A855F7] hover:bg-[#1A1A1A]";
      } else {
        classes += "text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#1A1A1A]";
      }
      
      grid.innerHTML += \`<div onclick="window.ScheduleModal.selectDate(\${i}, event)" class="\${classes}">\${i}</div>\`;
    }
    
    const remaining = 42 - (startDay + daysInMonth);
    for (let i = 1; i <= remaining && i <= 14; i++) {
      grid.innerHTML += \`<div class="p-1.5 text-center text-[11px] font-medium text-[#3A3A3A]">\${i}</div>\`;
    }
  },

  selectHour(hr12, e) {
    e.stopPropagation();
    let [h, m] = this.timeStr.split(':').map(Number);
    let ampm = h >= 12 ? 'PM' : 'AM';
    let newH = ampm === 'PM' ? (hr12 === 12 ? 12 : hr12 + 12) : (hr12 === 12 ? 0 : hr12);
    this.timeStr = \`\${String(newH).padStart(2, '0')}:\${String(m).padStart(2, '0')}\`;
    this.updateDisplay();
  },

  selectMinute(m, e) {
    e.stopPropagation();
    let [h, _oldM] = this.timeStr.split(':').map(Number);
    this.timeStr = \`\${String(h).padStart(2, '0')}:\${String(m).padStart(2, '0')}\`;
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
    this.timeStr = \`\${String(h).padStart(2, '0')}:\${String(m).padStart(2, '0')}\`;
    this.updateDisplay();
  },

  renderTimePicker() {
    const container = document.getElementById('sm-time-dropdown');
    if (!container) return;
    
    let [h, m] = this.timeStr.split(':').map(Number);
    let ampm = h >= 12 ? 'PM' : 'AM';
    let hr12 = h % 12 || 12;
    
    let hrHtml = '<div class="flex-1 h-[140px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] snap-y flex flex-col text-center px-1">';
    hrHtml += '<div class="text-[9px] font-bold text-[#A855F7] sticky top-0 bg-[#111111] py-1 mb-1 uppercase tracking-wider z-10">HR</div>';
    for (let i = 1; i <= 12; i++) {
      const isSel = i === hr12;
      const pad = String(i).padStart(2, '0');
      hrHtml += \`<div onclick="window.ScheduleModal.selectHour(\${i}, event)" class="py-1.5 my-0.5 cursor-pointer text-[12px] font-bold rounded-[8px] transition \${isSel ? 'bg-[#A855F7] text-white shadow-[0_0_10px_rgba(168,85,247,0.4)]' : 'text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#1A1A1A]'} snap-center">\${pad}</div>\`;
    }
    hrHtml += '</div>';

    let minHtml = '<div class="flex-1 h-[140px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] snap-y flex flex-col text-center border-l border-[#202020] px-1">';
    minHtml += '<div class="text-[9px] font-bold text-[#A855F7] sticky top-0 bg-[#111111] py-1 mb-1 uppercase tracking-wider z-10">MIN</div>';
    for (let i = 0; i < 60; i+=15) {
      const isSel = i === m || (Math.abs(i - m) < 15 && i <= m && (i+15 > m));
      const pad = String(i).padStart(2, '0');
      minHtml += \`<div onclick="window.ScheduleModal.selectMinute(\${i}, event)" class="py-1.5 my-0.5 cursor-pointer text-[12px] font-bold rounded-[8px] transition \${isSel ? 'bg-[#A855F7] text-white shadow-[0_0_10px_rgba(168,85,247,0.4)]' : 'text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#1A1A1A]'} snap-center">\${pad}</div>\`;
    }
    minHtml += '</div>';

    let ampmHtml = '<div class="flex-1 h-[140px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] flex flex-col text-center justify-start gap-2 border-l border-[#202020] px-1">';
    ampmHtml += '<div class="text-[9px] font-bold text-[#A855F7] py-1 uppercase tracking-wider sticky top-0 bg-[#111111] z-10">AM/PM</div>';
    ampmHtml += \`<div onclick="window.ScheduleModal.selectAmPm('AM', event)" class="py-2 cursor-pointer text-[11px] font-bold rounded-[8px] transition \${ampm === 'AM' ? 'bg-[#A855F7] text-white shadow-[0_0_10px_rgba(168,85,247,0.4)]' : 'text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#1A1A1A]'}">AM</div>\`;
    ampmHtml += \`<div onclick="window.ScheduleModal.selectAmPm('PM', event)" class="py-2 cursor-pointer text-[11px] font-bold rounded-[8px] transition \${ampm === 'PM' ? 'bg-[#A855F7] text-white shadow-[0_0_10px_rgba(168,85,247,0.4)]' : 'text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#1A1A1A]'}">PM</div>\`;
    ampmHtml += '</div>';
    
    container.innerHTML = hrHtml + minHtml + ampmHtml;
  },

  selectDuration(mins) {
    this.duration = mins;
    this.hideAllDropdowns();
    this.updateDisplay();
  },

  async submit() {
    const btn = document.getElementById('scheduleSubmitBtn');
    btn.disabled = true;
    btn.style.opacity = '0.5';
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
      
      this.close();
      if (window.SF_COMPONENTS && window.SF_COMPONENTS.showToast) {
        window.SF_COMPONENTS.showToast('Milestone scheduled successfully!', 'success');
      }
    } catch (error) {
      if (window.SF_COMPONENTS && window.SF_COMPONENTS.showToast) {
        window.SF_COMPONENTS.showToast(error.message || 'Failed to schedule milestone.', 'error');
      }
    } finally {
      btn.disabled = false;
      btn.style.opacity = '1';
      document.getElementById('scheduleSubmitText').textContent = 'Schedule';
      document.getElementById('scheduleSubmitSpinner').classList.add('hidden');
    }
  }
};

window.openScheduleMilestoneModal = function(goalId, milestoneId) {
  window.ScheduleModal.open(goalId, milestoneId);
};
`;

content = content.replace(oldModalLogicRegex, newModalLogic);

fs.writeFileSync('frontend/src/js/components.js', content, 'utf8');
console.log('Successfully updated components.js');
