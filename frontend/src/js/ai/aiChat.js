class AiChat {
  constructor() {
    this.threadId = sessionStorage.getItem('sf_ai_thread_id');
    if (!this.threadId) {
      this.threadId = 'thread_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('sf_ai_thread_id', this.threadId);
    }
    this.isOpen = false;
    this.isProcessing = false;
    this.container = null;
    this.messagesContainer = null;
    this.inputElement = null;
    this.sendButton = null;
    this.toggleButton = null;
  }

  init() {
    this.renderWidget();
    this.attachEventListeners();
  }

  renderWidget() {
    // Inject the floating widget CSS and HTML
    const widgetHtml = `
      <style>
        #sf-ai-widget {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 9999;
          font-family: inherit;
        }
        #sf-ai-toggle {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: linear-gradient(135deg, #FF3366 0%, #FF9933 100%);
          border: none;
          box-shadow: 0 4px 12px rgba(255, 51, 102, 0.4);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s;
        }
        #sf-ai-toggle:hover {
          transform: scale(1.05);
        }
        #sf-ai-toggle svg {
          width: 24px;
          height: 24px;
          fill: white;
        }
        #sf-ai-chat-window {
          display: none;
          position: absolute;
          bottom: 76px;
          right: 0;
          width: 380px;
          height: 500px;
          background: #0E0E0E;
          border: 1px solid #202020;
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5);
          flex-direction: column;
          overflow: hidden;
        }
        #sf-ai-chat-window.open {
          display: flex;
        }
        .sf-ai-header {
          padding: 16px;
          background: #141414;
          border-bottom: 1px solid #202020;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .sf-ai-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #FFF;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .sf-ai-close {
          background: transparent;
          border: none;
          color: #888;
          cursor: pointer;
          font-size: 20px;
        }
        .sf-ai-close:hover {
          color: #FFF;
        }
        .sf-ai-messages {
          flex: 1;
          padding: 16px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .sf-ai-msg {
          max-width: 85%;
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 14px;
          line-height: 1.4;
          word-wrap: break-word;
        }
        .sf-ai-msg.user {
          align-self: flex-end;
          background: #202020;
          color: #FFF;
        }
        .sf-ai-msg.ai {
          align-self: flex-start;
          background: linear-gradient(135deg, rgba(255, 51, 102, 0.1) 0%, rgba(255, 153, 51, 0.1) 100%);
          border: 1px solid rgba(255, 51, 102, 0.2);
          color: #FFF;
        }
        .sf-ai-msg.error {
          align-self: center;
          background: rgba(255, 0, 0, 0.1);
          color: #ff4444;
          border: 1px solid rgba(255, 0, 0, 0.2);
          font-size: 12px;
        }
        .sf-ai-input-area {
          padding: 16px;
          border-top: 1px solid #202020;
          display: flex;
          gap: 8px;
        }
        .sf-ai-input {
          flex: 1;
          background: #141414;
          border: 1px solid #202020;
          color: #FFF;
          padding: 10px 14px;
          border-radius: 8px;
          outline: none;
        }
        .sf-ai-input:focus {
          border-color: #FF3366;
        }
        .sf-ai-send {
          background: #FF3366;
          color: #FFF;
          border: none;
          border-radius: 8px;
          padding: 0 16px;
          cursor: pointer;
          font-weight: 600;
        }
        .sf-ai-send:disabled {
          background: #333;
          cursor: not-allowed;
          color: #666;
        }
        .sf-ai-action-card {
          background: #1A1A1A;
          border: 1px solid #333;
          border-radius: 8px;
          padding: 16px;
          margin-top: 8px;
          width: 100%;
          box-sizing: border-box;
        }
        .sf-ai-action-card h4 {
          margin: 0 0 8px 0;
          color: #FFF;
          font-size: 14px;
        }
        .sf-ai-action-card p {
          margin: 0 0 12px 0;
          color: #AAA;
          font-size: 12px;
        }
        .sf-ai-action-buttons {
          display: flex;
          gap: 8px;
        }
        .sf-ai-btn-approve, .sf-ai-btn-reject {
          flex: 1;
          padding: 8px 0;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          font-weight: 600;
          font-size: 12px;
        }
        .sf-ai-btn-approve {
          background: #FF3366;
          color: #FFF;
        }
        .sf-ai-btn-reject {
          background: transparent;
          border: 1px solid #444;
          color: #CCC;
        }
        .sf-ai-btn-approve:hover { background: #FF1A53; }
        .sf-ai-btn-reject:hover { background: #333; }
        
        .sf-ai-loading {
          display: flex;
          gap: 4px;
          padding: 12px;
          align-self: flex-start;
        }
        .sf-ai-dot {
          width: 6px;
          height: 6px;
          background: #888;
          border-radius: 50%;
          animation: sfAiBounce 1.4s infinite ease-in-out both;
        }
        .sf-ai-dot:nth-child(1) { animation-delay: -0.32s; }
        .sf-ai-dot:nth-child(2) { animation-delay: -0.16s; }
        @keyframes sfAiBounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
      </style>
      <div id="sf-ai-widget">
        <button id="sf-ai-toggle">
          <svg viewBox="0 0 24 24"><path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H5.17L4 17.17V4H20V16Z"/></svg>
        </button>
        <div id="sf-ai-chat-window">
          <div class="sf-ai-header">
            <h3>StudyFlow AI</h3>
            <button class="sf-ai-close" id="sf-ai-close">&times;</button>
          </div>
          <div class="sf-ai-messages" id="sf-ai-messages">
            <div class="sf-ai-msg ai">Hi! I'm your StudyFlow AI assistant. How can I help you today?</div>
          </div>
          <div class="sf-ai-input-area">
            <input type="text" class="sf-ai-input" id="sf-ai-input" placeholder="Ask something..." autocomplete="off">
            <button class="sf-ai-send" id="sf-ai-send">Send</button>
          </div>
        </div>
      </div>
    `;

    this.container = document.createElement('div');
    this.container.innerHTML = widgetHtml;
    document.body.appendChild(this.container);

    this.chatWindow = document.getElementById('sf-ai-chat-window');
    this.messagesContainer = document.getElementById('sf-ai-messages');
    this.inputElement = document.getElementById('sf-ai-input');
    this.sendButton = document.getElementById('sf-ai-send');
    this.toggleButton = document.getElementById('sf-ai-toggle');
    this.closeButton = document.getElementById('sf-ai-close');
  }

  attachEventListeners() {
    this.toggleButton.addEventListener('click', () => this.toggleChat());
    this.closeButton.addEventListener('click', () => this.toggleChat());
    
    this.sendButton.addEventListener('click', () => this.sendMessage());
    this.inputElement.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.sendMessage();
    });
  }

  toggleChat() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.chatWindow.classList.add('open');
      this.inputElement.focus();
    } else {
      this.chatWindow.classList.remove('open');
    }
  }

  appendMessage(role, content) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `sf-ai-msg ${role}`;
    msgDiv.textContent = content;
    this.messagesContainer.appendChild(msgDiv);
    this.scrollToBottom();
  }

  appendHtmlMessage(htmlContent) {
    const msgDiv = document.createElement('div');
    msgDiv.innerHTML = htmlContent;
    this.messagesContainer.appendChild(msgDiv);
    this.scrollToBottom();
  }

  showLoading() {
    this.isProcessing = true;
    this.inputElement.disabled = true;
    this.sendButton.disabled = true;
    const loadingHtml = `
      <div class="sf-ai-loading" id="sf-ai-loading">
        <div class="sf-ai-dot"></div><div class="sf-ai-dot"></div><div class="sf-ai-dot"></div>
      </div>
    `;
    this.appendHtmlMessage(loadingHtml);
  }

  hideLoading() {
    this.isProcessing = false;
    this.inputElement.disabled = false;
    this.sendButton.disabled = false;
    const loader = document.getElementById('sf-ai-loading');
    if (loader) loader.remove();
    this.inputElement.focus();
  }

  scrollToBottom() {
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  async sendMessage() {
    if (this.isProcessing) return;
    const prompt = this.inputElement.value.trim();
    if (!prompt) return;

    this.inputElement.value = '';
    this.appendMessage('user', prompt);
    this.showLoading();

    try {
      const baseUrl = window.SF_CONFIG?.API_BASE_URL || '/api/v1';
      const response = await fetch(`${baseUrl}/agent/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${window.SF_STORE?.state?.token || localStorage.getItem(window.SF_CONFIG?.AUTH_TOKEN_KEY || 'accessToken')}`
        },
        body: JSON.stringify({ prompt, thread_id: this.threadId })
      });

      const data = await response.json();
      this.hideLoading();

      if (data.pending_action) {
        this.renderPendingAction(data.pending_action);
      } else {
        this.appendMessage(data.success ? 'ai' : 'error', data.message || 'Unknown error occurred.');
      }
    } catch (err) {
      console.error('AI Chat Error:', err);
      this.hideLoading();
      this.appendMessage('error', 'Failed to communicate with AI server.');
    }
  }

  renderPendingAction(action) {
    let actionDesc = 'Unknown action';
    let actionTitle = 'Pending Action';
    if (action.action === 'create_goal') {
      actionTitle = 'Create Goal';
      actionDesc = `Goal: ${action.args.title}`;
    } else if (action.action === 'schedule_task') {
      actionTitle = 'Schedule Task';
      actionDesc = `Task: ${action.args.title}`;
    }

    const cardId = 'sf-action-' + Math.random().toString(36).substr(2, 9);
    const html = `
      <div class="sf-ai-action-card" id="${cardId}">
        <h4>AI wants to: ${actionTitle}</h4>
        <p>${actionDesc}</p>
        <div class="sf-ai-action-buttons">
          <button class="sf-ai-btn-reject" onclick="window._sfAiChat.handleResume(false, '${cardId}')">Reject</button>
          <button class="sf-ai-btn-approve" onclick="window._sfAiChat.handleResume(true, '${cardId}')">Approve</button>
        </div>
      </div>
    `;
    this.appendHtmlMessage(html);
  }

  async handleResume(approved, cardId) {
    if (this.isProcessing) return;
    const card = document.getElementById(cardId);
    if (card) {
      card.innerHTML = `<p style="color:#888; font-size:12px; margin:0;">${approved ? 'Approving...' : 'Rejecting...'}</p>`;
    }
    
    this.showLoading();

    try {
      const baseUrl = window.SF_CONFIG?.API_BASE_URL || '/api/v1';
      const response = await fetch(`${baseUrl}/agent/action/resume`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${window.SF_STORE?.state?.token || localStorage.getItem(window.SF_CONFIG?.AUTH_TOKEN_KEY || 'accessToken')}`
        },
        body: JSON.stringify({ thread_id: this.threadId, approved })
      });

      const data = await response.json();
      this.hideLoading();
      
      if (card) card.remove(); // Remove the action card entirely once processed

      if (data.pending_action) {
        this.renderPendingAction(data.pending_action);
      } else {
        this.appendMessage(data.success ? 'ai' : 'error', data.message || 'Action completed.');
        
        // Trigger a generic update to the store if it was approved, so UI refreshes
        if (approved && window.SF_STORE && typeof window.SF_STORE.dispatch === 'function') {
           // Reload goals/tasks passively so the UI reflects the AI's mutation
           window.SF_STORE.dispatch('goals/FETCH_ACTIVE').catch(()=>null);
           window.SF_STORE.dispatch('tasks/FETCH_TODAY').catch(()=>null);
        }
      }
    } catch (err) {
      console.error('AI Resume Error:', err);
      this.hideLoading();
      this.appendMessage('error', 'Failed to resume action.');
    }
  }
}

function initAiChat() {
  const tokenKey = window.SF_CONFIG?.AUTH_TOKEN_KEY || 'accessToken';
  const token = localStorage.getItem(tokenKey);
  const path = window.location.pathname;
  if (token && !path.includes('/login.html') && !path.includes('/register.html') && path !== '/' && !path.endsWith('/index.html')) {
    window._sfAiChat = new AiChat();
    window._sfAiChat.init();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAiChat);
} else {
  initAiChat();
}
