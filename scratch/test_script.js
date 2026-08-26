  <script>tailwind.config = { darkMode: 'class' };</script>
  <!-- Services Layer -->
  <script src="src/js/config.js"></script>
  <script>
    let currentStep = 1;
    let editingGoalId = null;
    let idealabThreadId = 'idealab_' + Date.now();
    
    document.addEventListener('DOMContentLoaded', async () => {
      await window.SF_STORE.bootstrap(['user', 'goals']);
      const params = new URLSearchParams(window.location.search);
      editingGoalId = params.get('goalId');
      if (editingGoalId) {
        // Not supporting editing in real flow yet, redirect or reset for now.
      }
    });

    function updateAdaptiveTitle(newTitle, newSub) {
      document.getElementById('stepTitle').innerHTML = newTitle;
      document.getElementById('stepSub').textContent = newSub;
    }

    function updateVisualStep(step) {
      currentStep = Math.min(step, 7);
      for (let i = 1; i <= 7; i++) {
        const icon = document.getElementById(`stepIcon-${i}`);
        const label = document.getElementById(`stepLabel-${i}`);
        if (!icon || !label) continue;
        
        if (i < currentStep) {
          // Completed
          icon.className = "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 shadow-[0_0_15px_rgba(168,85,247,0.5)] bg-[#A855F7] text-white border-2 border-[#A855F7]";
          icon.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>';
          label.className = "mt-2 text-[10px] font-bold tracking-widest uppercase transition-colors duration-300 text-white";
        } else if (i === currentStep) {
          // Active
          icon.className = "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 shadow-[0_0_15px_rgba(168,85,247,0.5)] bg-[#A855F7] text-white border-2 border-[#A855F7]";
          icon.innerHTML = i;
          label.className = "mt-2 text-[10px] font-bold tracking-widest uppercase transition-colors duration-300 text-white";
        } else {
          // Upcoming
          icon.className = "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 bg-[#151520] text-[#6B7280] border-2 border-[#252535]";
          icon.innerHTML = i;
          label.className = "mt-2 text-[10px] font-bold tracking-widest uppercase transition-colors duration-300 text-[#6B7280]";
        }
         async function sendToAI(text) {
      appendAssistantMessage(text, 'user');
      
      const inputEl = document.getElementById('stepInput');
      const nextBtn = document.getElementById('nextBtn');
      const nextBtnText = nextBtn ? nextBtn.innerHTML : 'Ask AI & Next'; // Fallback text just in case
      
      // Prevent double calls
      if (nextBtn && nextBtn.disabled) return;
      
      // Show loading state
      if (inputEl) inputEl.disabled = true;
      if (nextBtn) {
          nextBtn.disabled = true;
          nextBtn.innerHTML = 'Thinking...';
          nextBtn.classList.add('opacity-70', 'cursor-not-allowed');
      }
      
      // Append temporary typing indicator
      const feed = document.getElementById('aiChatFeed');
      const typingId = 'typing-' + Date.now();
      if (feed) {
          const div = document.createElement('div');
          div.id = typingId;
          div.className = "flex items-start space-x-3 animate-fadeIn mt-3";
          div.innerHTML = `
            <div class="w-7 h-7 rounded-lg bg-[#A855F7]/20 border border-[#A855F7]/40 flex items-center justify-center text-[#A855F7] shrink-0 mt-0.5">
              <svg class="w-4 h-4 fill-current animate-pulse" viewBox="0 0 24 24"><path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z"/></svg>
            </div>
            <div class="bg-[#151520] border border-[#252535] p-3.5 rounded-2xl rounded-tl-sm text-xs text-[#D4D4D8] shadow-sm flex items-center space-x-1">
              <div class="w-1.5 h-1.5 bg-[#A1A1AA] rounded-full animate-bounce"></div>
              <div class="w-1.5 h-1.5 bg-[#A1A1AA] rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
              <div class="w-1.5 h-1.5 bg-[#A1A1AA] rounded-full animate-bounce" style="animation-delay: 0.4s"></div>
            </div>
          `;
          feed.appendChild(div);
          feed.scrollTop = feed.scrollHeight;
      }
      
      // Fail-safe cleanup timer to absolutely guarantee UI reset if fetch completely hangs
      const failSafeTimer = setTimeout(() => {
        cleanupUI();
        appendAssistantMessage("Request timed out entirely. Please try again.", 'ai');
      }, 30000); // 30s max wait for UI

      function cleanupUI() {
        const typingEl = document.getElementById(typingId);
        if (typingEl) typingEl.remove();
        if (inputEl) {
            inputEl.disabled = false;
            inputEl.focus();
        }
        if (nextBtn) {
            nextBtn.disabled = false;
            // Always restore to something sane
            nextBtn.innerHTML = nextBtnText === 'Thinking...' ? 'Ask AI & Next' : nextBtnText;
            nextBtn.classList.remove('opacity-70', 'cursor-not-allowed');
        }
      }

      try {
        console.log("[DEBUG] Calling SF_HTTP.post with prompt:", text);
        const res = await SF_HTTP.post('/agent/chat', {
          prompt: text,
          thread_id: idealabThreadId
        });
        console.log("[DEBUG] SF_HTTP.post returned:", res);
        
        clearTimeout(failSafeTimer);
        cleanupUI(); // Cleanup immediately on success

        if (res && res.message) {
          appendAssistantMessage(res.message, 'ai');
          
          if (res.pending_action) {
            handlePendingAction(res.pending_action);
          } else {
            // Keep the title as generic brainstorm or update it based on AI message if desired
            updateAdaptiveTitle(
              'Let\'s build your <span class="text-[#A855F7] drop-shadow-[0_0_15px_rgba(168,85,247,0.4)]">plan</span>',
              'Chat with the AI to refine your goal and generate a structured blueprint.'
            );
          }
        } else if (res && res.error) {
           appendAssistantMessage("AI Error: " + res.error, 'ai');
        }
      } catch (err) {
        clearTimeout(failSafeTimer);
        cleanupUI();
        console.error("AI Chat Error (Caught in sendToAI):", err);
        appendAssistantMessage("Sorry, I encountered an error. Please try again.", 'ai');
      }
    }

    function handleStepAdvance() {
      const inputEl = document.getElementById('stepInput');
      const text = inputEl.value.trim();
      if (!text) return;
      inputEl.value = '';
      sendToAI(text);
      updateVisualStep(currentStep + 1);
    }

    function prevStep() {
      if (currentStep > 1) updateVisualStep(currentStep - 1);
    }

    function appendAssistantMessage(msg, sender) {
      const feed = document.getElementById('aiChatFeed');
      if (!feed) return;
      const div = document.createElement('div');
      
      if (sender === 'user') {
        div.className = "flex items-start justify-end space-x-3 animate-fadeIn mt-3";
        div.innerHTML = `
          <div class="bg-[#A855F7] text-white p-3.5 rounded-2xl rounded-tr-sm text-xs leading-relaxed max-w-[85%] shadow-md font-medium">
            ${msg}
          </div>
        `;
      } else {
        div.className = "flex items-start space-x-3 animate-fadeIn mt-3";
        div.innerHTML = `
          <div class="w-7 h-7 rounded-lg bg-[#A855F7]/20 border border-[#A855F7]/40 flex items-center justify-center text-[#A855F7] shrink-0 mt-0.5">
            <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z"/></svg>
          </div>
          <div class="bg-[#151520] border border-[#252535] p-3.5 rounded-2xl rounded-tl-sm text-xs leading-relaxed text-[#D4D4D8] shadow-sm max-w-[85%]">
            ${msg}
          </div>
        `;
      }
      feed.appendChild(div);
      feed.scrollTop = feed.scrollHeight;
    }

    function showProposalModal(payload) {
      document.getElementById('proposalTitle').textContent = payload.title;
      
      const escapeHtml = (unsafe) => {
        return (unsafe || '').toString()
           .replace(/&/g, "&amp;")
           .replace(/</g, "&lt;")
           .replace(/>/g, "&gt;")
           .replace(/"/g, "&quot;")
           .replace(/'/g, "&#039;");
      };

      if (payload.ai_summary) {
          let safeSummary = escapeHtml(payload.ai_summary);
          
          let htmlSummary = safeSummary
              // Headers (e.g. ### Header or 🎯 Header)
              .replace(/^#+\s*(.*$)/gim, '<h3 class="text-white font-bold mt-4 mb-2">$1</h3>')
              // Bold
              .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
              // Bullets
              .replace(/^\s*[-•*]\s+(.*$)/gim, '<li class="ml-4 list-disc marker:text-[#A855F7]">$1</li>')
              // Newlines
              .replace(/\n/g, '<br/>');
              
          // Clean up consecutive breaks if they get annoying
          htmlSummary = htmlSummary.replace(/(<br\/>\s*){3,}/g, '<br/><br/>');

          document.getElementById('proposalSummary').innerHTML = htmlSummary;
      } else {
          let subtasksHtml = '';
          if (payload.subtasks && payload.subtasks.length > 0) {
              subtasksHtml = payload.subtasks.map(s => `<li class="ml-4 list-disc marker:text-[#A855F7]"><strong class="text-white">${escapeHtml(s.title)}</strong> - ${escapeHtml(s.description)}</li>`).join('');
          } else {
              subtasksHtml = escapeHtml(payload.rawDump).replace(/\n/g, '<br/>');
          }

          document.getElementById('proposalSummary').innerHTML = `
              <strong>Description:</strong> ${escapeHtml(payload.description)}<br/><br/>
              <strong>Timeline:</strong> ${escapeHtml(payload.deadline_value)} ${escapeHtml(payload.deadline_unit)}<br/><br/>
              <strong>Milestones:</strong><br/>
              <ul class="mt-2 space-y-1">
                 ${subtasksHtml}
              </ul>
          `;
      }
      document.getElementById('goalProposalModal').classList.remove('hidden');
      document.getElementById('goalProposalModal').classList.add('flex');
    }

    function closeProposalModal() {
      document.getElementById('goalProposalModal').classList.add('hidden');
      document.getElementById('goalProposalModal').classList.remove('flex');
    }

    async function submitProposal(approved) {
      closeProposalModal();
      
      const btn = document.getElementById('nextBtn');
      const originalText = btn.innerHTML;
      btn.innerHTML = 'Processing...';
      btn.disabled = true;

      try {
        const res = await SF_HTTP.post('/agent/action/resume', {
          thread_id: idealabThreadId,
          approved: approved
        });
        
        if (approved && res && res.success) {
          appendAssistantMessage("Goal created successfully! Preparing your workspace...", 'ai');
          setTimeout(() => { window.location.href = 'workspace.html'; }, 1000);
        } else if (!approved) {
          appendAssistantMessage("Goal creation was cancelled. What would you like to change?", 'ai');
        }
      } catch(e) {
        appendAssistantMessage("Error confirming goal: " + e.message, 'ai');
      } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
      }
    }

    async function handlePendingAction(action) {
      if (action.action === 'create_goal') {
        showProposalModal(action.payload);
      }
    }
  </script>
