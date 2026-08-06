/**
 * Workspace Renderer
 * Pure orchestrator for Workspace rendering based on ViewModels.
 */
window.WorkspaceRenderer = {
  render(rawGoals, isLoading = false) {
    const container = document.getElementById('goalsDynamicContainer');
    const cardsContainer = document.getElementById('goalsCardsContainer');
    
    if (!container) return;
    
    if (isLoading) {
      this.renderSkeletons(container, cardsContainer);
      return;
    }
    
    if (!rawGoals || rawGoals.length === 0) {
      this.renderEmptyState(container, cardsContainer, 'WORKSPACE');
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
  
  renderSkeletons(container, cardsContainer) {
    const skeletonExpanded = window.SF_COMPONENTS.renderGoalCardSkeleton('expanded');
    const skeletonGrid = window.SF_COMPONENTS.renderGoalCardSkeleton('grid');
    
    // Expanded View -> 4 skeletons, Grid View -> 8 skeletons
    container.innerHTML = skeletonExpanded.repeat(4);
    if (cardsContainer) {
      cardsContainer.innerHTML = skeletonGrid.repeat(8);
    }
  },
  
  renderEmptyState(container, cardsContainer, type) {
    let stateConfig = window.SF_COMPONENTS.EMPTY_STATES.workspace_empty;
    if (type && window.SF_COMPONENTS.EMPTY_STATES[type]) {
      stateConfig = window.SF_COMPONENTS.EMPTY_STATES[type];
    }
    
    const emptyHtml = window.SF_COMPONENTS.renderEmptyState(stateConfig);
    container.innerHTML = emptyHtml;
    if (cardsContainer) cardsContainer.innerHTML = emptyHtml;
  },
  
  renderFilterEmptyState(container, cardsContainer) {
    const filters = window.WorkspaceState.filters || {};
    const isSearching = !!window.WorkspaceState.searchQuery;
    let stateConfig;
    
    if (isSearching) {
      stateConfig = window.SF_COMPONENTS.EMPTY_STATES.search_empty(window.WorkspaceState.searchQuery, window.WorkspaceState.hasFilters);
    } else if (filters.archived === true) {
      stateConfig = window.SF_COMPONENTS.EMPTY_STATES.archive_empty;
    } else if (filters.completed === true) {
      stateConfig = window.SF_COMPONENTS.EMPTY_STATES.completed_empty;
    } else {
      stateConfig = window.SF_COMPONENTS.EMPTY_STATES.filter_empty;
    }
    
    const emptyHtml = window.SF_COMPONENTS.renderEmptyState(stateConfig);
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
