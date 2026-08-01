import { LifecycleEngine } from './shared/lifecycle.engine.js';
import { DeadlineIntelligenceService } from './deadlineIntelligence.service.js';

/**
 * Milestone Lifecycle Engine
 * Derives the lifecycle state of a milestone dynamically from immutable data.
 */
export class MilestoneLifecycleService {
  /**
   * Calculates the full lifecycle object for a milestone
   * @param {Object} milestone - The milestone (subtask) document/object
   * @returns {Object} The computed lifecycle object
   */
  static calculate(milestone) {
    const lifecycle = LifecycleEngine.calculate(milestone);
    
    // We add deadlineInfo to the milestone itself for UI convenience, but the core engine 
    // just returns lifecycle. The service can also optionally map isBlocking in the aggregation service.
    // For now, let's just return the lifecycle object. 
    return lifecycle;
  }
}
