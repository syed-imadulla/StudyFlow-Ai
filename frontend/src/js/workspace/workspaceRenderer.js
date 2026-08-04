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
        return models.filter(m => m.lifecycle.isCompleted);
      case 'ALL':
      default:
        return models.filter(m => !m.lifecycle.isCompleted);
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
    const emptyHtml = window.SF_COMPONENTS.renderEmptyState({
      title,
      message,
      actionHtml: '<button onclick="window.WorkspaceActions.editGoal(null)" class="btn btn-primary px-5 py-2.5 text-xs font-bold shadow-[0_0_20px_rgba(168,85,247,0.3)]">+ Create AI Goal</button>'
    });
    container.innerHTML = emptyHtml;
    if (cardsContainer) cardsContainer.innerHTML = emptyHtml;
  },
  
  renderFilterEmptyState(container, cardsContainer, filterType) {
    let title = 'No Goals Found';
    let message = 'Adjust your filters or search query.';
    
    switch (filterType) {
      case 'HEALTHY':
        title = 'No Healthy Goals';
        message = 'None of your goals are currently healthy.';
        break;
      case 'OVERDUE':
        title = 'You\'re on track! 🎉';
        message = 'No overdue goals found in your workspace.';
        break;
      case 'DUE_TODAY':
        title = 'No Goals Due Today';
        message = 'You have no goals with deadlines for today.';
        break;
      case 'BLOCKING':
        title = 'Clear Path';
        message = 'No blocking milestones currently require your attention.';
        break;
      case 'COMPLETED':
        title = 'No completed goals yet';
        message = 'Keep pushing forward!';
        break;
    }
    
    const emptyHtml = window.SF_COMPONENTS.renderEmptyState({
      title,
      message,
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
