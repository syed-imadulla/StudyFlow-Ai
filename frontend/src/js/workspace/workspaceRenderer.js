/**
 * Workspace Renderer
 * Pure orchestrator for Workspace rendering based on ViewModels.
 */
window.WorkspaceRenderer = {
  render(rawGoals) {
    const container = document.getElementById('goalsDynamicContainer');
    const cardsContainer = document.getElementById('goalsView');
    
    if (!container) return;
    
    if (!rawGoals || rawGoals.length === 0) {
      this.renderEmptyState(container, cardsContainer, 'No Active Workspace Goals', 'Get started by creating your first AI Goal Breakdown or structuring blueprints in IdeaLab.');
      return;
    }
    
    // 1. Map to ViewModels
    const viewModels = rawGoals.map(goal => window.WorkspaceMapper.toCardModel(goal));
    
    // 2. Filter
    const filteredModels = this.applyFilters(viewModels, window.WorkspaceState.filter);
    
    // 3. Search
    const searchedModels = this.applySearch(filteredModels, window.WorkspaceState.search);
    
    // 4. Sort
    const sortedModels = this.applySort(searchedModels, window.WorkspaceState.sort);
    
    // Render Empty States based on filters if necessary
    if (sortedModels.length === 0) {
      this.renderFilterEmptyState(container, cardsContainer, window.WorkspaceState.filter);
      return;
    }
    
    // Render Goals
    container.innerHTML = sortedModels.map(vm => window.SF_COMPONENTS.renderGoalCard(vm, 'expanded')).join('');
    
    if (cardsContainer) {
      cardsContainer.innerHTML = sortedModels.map(vm => window.SF_COMPONENTS.renderGoalCard(vm, 'grid')).join('');
    }
    
    this.handleUrlHash();
  },
  
  applyFilters(models, filterType) {
    switch (filterType) {
      case 'HEALTHY':
        return models.filter(m => m.health.status === 'HEALTHY');
      case 'OVERDUE':
        return models.filter(m => m.lifecycle.isOverdue);
      case 'DUE_TODAY':
        return models.filter(m => m.lifecycle.isDueToday);
      case 'BLOCKING':
        return models.filter(m => m.subtasks.some(s => s.isBlocking));
      case 'COMPLETED':
        return models.filter(m => m.lifecycle.isCompleted && !m.lifecycle.isArchived);
      case 'ARCHIVED':
        return models.filter(m => m.lifecycle.isArchived);
      case 'ALL':
      default:
        return models.filter(m => !m.lifecycle.isCompleted && !m.lifecycle.isArchived);
    }
  },
  
  applySearch(models, query) {
    if (!query || query.trim() === '') return models;
    const lowerQuery = query.toLowerCase();
    return models.filter(m => 
      m.title.toLowerCase().includes(lowerQuery) || 
      m.description.toLowerCase().includes(lowerQuery)
    );
  },
  
  applySort(models, sortType) {
    return [...models].sort((a, b) => {
      switch (sortType) {
        case 'PRIORITY':
        case 'DEADLINE': {
          const priorityDiff = (b.deadline.sortPriority || 0) - (a.deadline.sortPriority || 0);
          if (priorityDiff !== 0) return priorityDiff;
          return (a.deadline.timestamp || Infinity) - (b.deadline.timestamp || Infinity);
        }
        case 'HEALTH':
          return (a.health.score || 0) - (b.health.score || 0); // Lowest health first
        case 'PROGRESS':
          return (b.progress.percentage || 0) - (a.progress.percentage || 0); // Highest progress first
        case 'REMAINING':
          return (b.progress.remaining || 0) - (a.progress.remaining || 0); // Most remaining first
        default:
          return 0;
      }
    });
  },
  
  renderEmptyState(container, cardsContainer, title, message) {
    const iconHtml = '<svg class="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/><path d="M7 12h2v5H7zm4-3h2v8h-2zm4-3h2v11h-2z"/></svg>';
    const emptyHtml = window.SF_COMPONENTS.renderEmptyState({
      title,
      message,
      iconHtml,
      actionHtml: '<button onclick="window.WorkspaceActions.editGoal(null)" class="btn btn-primary px-5 py-2.5 text-xs font-bold shadow-[0_0_20px_rgba(168,85,247,0.3)]">+ Create AI Goal</button>'
    });
    container.innerHTML = emptyHtml;
    if (cardsContainer) cardsContainer.innerHTML = emptyHtml;
  },
  
  renderFilterEmptyState(container, cardsContainer, filterType) {
    let title = 'No Goals Found';
    let message = 'Adjust your filters or search query.';
    let iconHtml = '<svg class="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>';
    
    switch (filterType) {
      case 'HEALTHY':
        title = 'No Healthy Goals';
        message = 'None of your goals are currently healthy.';
        iconHtml = '<svg class="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>';
        break;
      case 'OVERDUE':
        title = 'You\'re on track! 🎉';
        message = 'No overdue goals found in your workspace.';
        iconHtml = '<svg class="w-6 h-6 fill-current text-green-400" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
        break;
      case 'DUE_TODAY':
        title = 'No Goals Due Today';
        message = 'You have no goals with deadlines for today.';
        iconHtml = '<svg class="w-6 h-6 fill-current text-orange-400" viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>';
        break;
      case 'BLOCKING':
        title = 'Clear Path';
        message = 'No blocking milestones currently require your attention.';
        iconHtml = '<svg class="w-6 h-6 fill-current text-green-400" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
        break;
      case 'COMPLETED':
        title = 'No completed goals yet';
        message = 'Keep pushing forward!';
        iconHtml = '<svg class="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>';
        break;
      case 'ARCHIVED':
        title = 'No archived goals';
        message = 'Your archive is empty. Completed goals you archive will appear here.';
        iconHtml = '<svg class="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM6.24 5h11.52l.81.97H5.44l.8-.97zM5 19V8h14v11H5zm6.55-6.55l-.71-.71L9 13.59V10h2v3.59l1.84-1.85.71.71L11.05 15 13.6 17.55l.71-.71L12.46 15z"/></svg>';
        break;
    }
    
    const emptyHtml = window.SF_COMPONENTS.renderEmptyState({
      title,
      message,
      iconHtml,
      actionHtml: '<button onclick="window.WorkspaceActions.setFilter(\'ALL\')" class="btn btn-secondary px-5 py-2.5 text-xs font-bold shadow-[0_0_20px_rgba(255,255,255,0.05)]">Clear Filters</button>'
    });
    container.innerHTML = emptyHtml;
    if (cardsContainer) cardsContainer.innerHTML = emptyHtml;
  },
  
  handleUrlHash() {
    if (window.location.hash && window.location.hash.startsWith('#goal-')) {
      setTimeout(() => {
        const target = document.querySelector(window.location.hash);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          target.classList.add('ring-2', 'ring-[#A855F7]', 'shadow-[0_0_30px_rgba(168,85,247,0.3)]', 'animate-pulse', 'bg-[#151520]');
          target.style.transition = 'all 0.5s ease-out';
          
          setTimeout(() => target.classList.remove('animate-pulse'), 1000);
          setTimeout(() => {
            target.classList.remove('ring-2', 'ring-[#A855F7]', 'shadow-[0_0_30px_rgba(168,85,247,0.3)]', 'bg-[#151520]');
            if (window.history && window.history.replaceState) {
              window.history.replaceState(null, null, window.location.pathname);
            }
          }, 2500);
        }
      }, 150);
    }
  }
};
