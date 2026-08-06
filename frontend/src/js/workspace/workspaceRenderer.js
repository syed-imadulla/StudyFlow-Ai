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
    
    // 2. Execute Discovery Pipeline
    const filteredModels = window.SF_DISCOVERY.DiscoveryPipeline.execute(viewModels, window.WorkspaceState);
    
    // 3. Cache pipeline results in WorkspaceState
    window.WorkspaceState.setPipelineResults(filteredModels);
    
    // Render Empty States if no results from search/filter
    if (filteredModels.length === 0) {
      this.renderFilterEmptyState(container, cardsContainer);
      return;
    }
    
    // Render Goals
    container.innerHTML = filteredModels.map(vm => window.SF_COMPONENTS.renderGoalCard(vm, 'expanded')).join('');
    
    if (cardsContainer) {
      cardsContainer.innerHTML = filteredModels.map(vm => window.SF_COMPONENTS.renderGoalCard(vm, 'grid')).join('');
    }
    
    this.handleUrlHash();
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
  
  renderFilterEmptyState(container, cardsContainer) {
    let title = 'No Goals Found';
    let message = 'Adjust your filters or search query.';
    let iconHtml = '<svg class="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>';
    
    // Removed legacy switch(filterType) to support unified discovery state
    
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
