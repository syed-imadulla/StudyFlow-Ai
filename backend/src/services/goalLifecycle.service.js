import { LifecycleEngine } from './shared/lifecycle.engine.js';

/**
 * Goal Lifecycle Engine
 * Derives the lifecycle state of a goal dynamically from immutable data.
 */
export class GoalLifecycleService {
  /**
   * Calculates the full lifecycle object for a goal
   * @param {Object} goal - The goal document/object
   * @returns {Object} The computed lifecycle object
   */
  static calculate(goal) {
    // Simply proxy to the generic engine
    return LifecycleEngine.calculate(goal);
  }
}
