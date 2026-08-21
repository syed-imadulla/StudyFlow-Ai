import { Goal } from '../models/Goal.js';
import { Task } from '../models/Task.js';
import { FocusSession } from '../models/FocusSession.js';
import { TASK_STATUS, FOCUS_SESSION_STATUS, GOAL_STATUS, FOCUS_SESSION_TYPE } from '../constants/index.js';

export class AnalyticsService {
  /**
   * Helper to get date ranges for period comparison.
   */
  static getDateRange(period) {
    const now = new Date();
    let days = 7;
    if (period === 'last30') days = 30;
    if (period === 'last90') days = 90;
    
    let start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    let prevStart = new Date(start.getTime() - days * 24 * 60 * 60 * 1000);

    if (period === 'all') {
      start = new Date(0);
      prevStart = new Date(0);
      days = Math.max(1, Math.ceil((now.getTime() - new Date('2020-01-01').getTime()) / (1000 * 3600 * 24)));
    }

    return { start, prevStart, days };
  }

  /**
   * Calculate master analytics summary dynamically from collections
   */
  static async getSummary(userId, period = 'last7') {
    const { start, prevStart, days } = this.getDateRange(period);

    const goals = await Goal.find({ user: userId });
    const tasks = await Task.find({ user: userId });
    
    // Fetch ALL completed sessions to calculate streaks (streaks need historical continuity)
    const allSessions = await FocusSession.find({ 
      user: userId, 
      status: FOCUS_SESSION_STATUS.COMPLETED
    }).sort('-startTime');

    // Filter productive sessions for period-based analytics
    const productiveSessions = allSessions.filter(s => s.type !== FOCUS_SESSION_TYPE.SHORT_BREAK && s.type !== FOCUS_SESSION_TYPE.LONG_BREAK);
    const currentSessions = productiveSessions.filter(s => new Date(s.startTime) >= start);
    const prevSessions = productiveSessions.filter(s => new Date(s.startTime) >= prevStart && new Date(s.startTime) < start);

    const totalGoals = goals.length;
    const completedGoals = goals.filter(g => g.status === GOAL_STATUS.COMPLETED || g.status === 'COMPLETED').length;

    let totalSubtasks = 0;
    let completedSubtasks = 0;
    goals.forEach(g => {
      totalSubtasks += g.subtasks?.length || 0;
      completedSubtasks += g.subtasks?.filter(s => s.completed).length || 0;
    });

    const totalTasks = tasks.length + totalSubtasks;
    const completedTasks = tasks.filter(t => t.status === TASK_STATUS.COMPLETED || t.status === 'COMPLETED').length + completedSubtasks;

    const currentDurationSeconds = currentSessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    const focusHours = parseFloat((currentDurationSeconds / 3600).toFixed(1)) || 0;
    
    const prevDurationSeconds = prevSessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    const prevFocusHours = parseFloat((prevDurationSeconds / 3600).toFixed(1)) || 0;

    const totalInterruptions = currentSessions.reduce((sum, s) => sum + (s.interruptions || 0), 0);
    const avgInterruptions = currentSessions.length > 0 ? (totalInterruptions / currentSessions.length) : 0;
    
    const prevTotalInterruptions = prevSessions.reduce((sum, s) => sum + (s.interruptions || 0), 0);
    const prevAvgInterruptions = prevSessions.length > 0 ? (prevTotalInterruptions / prevSessions.length) : 0;

    // Daily streak logic uses all productive sessions
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    const sessionDates = [...new Set(productiveSessions.map(s => new Date(s.startTime).toISOString().split('T')[0]))].sort().reverse();

    if (sessionDates.length > 0) {
      const todayStr = new Date().toISOString().split('T')[0];
      const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      if (sessionDates[0] === todayStr || sessionDates[0] === yesterdayStr) {
        currentStreak = 1;
        let lastDate = new Date(sessionDates[0]);
        for (let i = 1; i < sessionDates.length; i++) {
          const currDate = new Date(sessionDates[i]);
          const diffDays = Math.round((lastDate - currDate) / 86400000);
          if (diffDays === 1) {
            currentStreak++;
            lastDate = currDate;
          } else {
            break;
          }
        }
      }

      if (sessionDates.length > 0) {
        tempStreak = 1;
        longestStreak = 1;
        for (let i = 0; i < sessionDates.length - 1; i++) {
          const d1 = new Date(sessionDates[i]);
          const d2 = new Date(sessionDates[i + 1]);
          if (Math.round((d1 - d2) / 86400000) === 1) {
            tempStreak++;
            if (tempStreak > longestStreak) longestStreak = tempStreak;
          } else {
            tempStreak = 1;
          }
        }
      }
    }

    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Calculate Peak Velocity
    const hoursCount = new Array(8).fill(0);
    currentSessions.forEach(s => {
      const hour = new Date(s.startTime).getHours();
      const bucket = Math.floor(hour / 3);
      hoursCount[bucket] += (s.duration || 0);
    });
    
    let maxBucketDuration = 0;
    let maxBucketIndex = -1;
    for (let i = 0; i < 8; i++) {
      if (hoursCount[i] > maxBucketDuration) {
        maxBucketDuration = hoursCount[i];
        maxBucketIndex = i;
      }
    }
    
    let peakVelocityStr = '--';
    if (currentDurationSeconds > 0 && maxBucketIndex !== -1 && maxBucketDuration > 0) {
      const startH = maxBucketIndex * 3;
      const endH = startH + 3;
      const formatH = (h) => {
        if (h === 0) return '12 AM';
        if (h === 12) return '12 PM';
        if (h === 24) return '12 AM';
        return h > 12 ? `${h - 12} PM` : `${h} AM`;
      };
      peakVelocityStr = `${formatH(startH)} – ${formatH(endH)}`;
    }

    const longestSessionSeconds = currentSessions.length > 0 ? Math.max(...currentSessions.map(s => s.duration || 0)) : 0;
    const longestSessionFormatted = longestSessionSeconds > 0 
      ? (longestSessionSeconds >= 3600 ? `${Math.floor(longestSessionSeconds / 3600)}h ${Math.floor((longestSessionSeconds % 3600) / 60)}m` : `${Math.floor(longestSessionSeconds / 60)}m`) 
      : '--';

    return {
      totalGoals,
      completedGoals,
      totalTasks,
      completedTasks,
      focusHours,
      prevFocusHours,
      currentStreak,
      longestStreak,
      avgInterruptions,
      prevAvgInterruptions,
      peakVelocity: peakVelocityStr,
      longestSessionFormatted,
      sessionsCount: currentSessions.length,
      currentDurationSeconds,
      daysInPeriod: days,
      weeklySummary: {
        focusHours,
        tasksDone: completedTasks
      },
      monthlySummary: {
        goalsCompleted: completedGoals,
        focusHours
      },
      productivityMetrics: {
        completionRate: isNaN(completionRate) ? 0 : completionRate
      }
    };
  }

  /**
   * Get KPIs formatted for UI compatibility (/analytics/kpis)
   */
  static async getKPIs(userId, period = 'last7') {
    const summary = await this.getSummary(userId, period);
    const rate = summary.productivityMetrics.completionRate || 0;
    
    const getPercentageChange = (curr, prev) => {
      if (curr === 0 && prev === 0) return { str: '0%', dir: 'none' };
      if (prev === 0) return { str: 'New', dir: 'up' };
      const change = ((curr - prev) / prev) * 100;
      if (change === 0) return { str: '0%', dir: 'none' };
      return { str: `${change > 0 ? '↑' : '↓'} ${Math.abs(Math.round(change))}%`, dir: change > 0 ? 'up' : 'down' };
    };

    const focusChange = getPercentageChange(summary.focusHours, summary.prevFocusHours);
    
    const avgInt = summary.avgInterruptions || 0;
    let distScore = 'Low';
    if (avgInt >= 3) distScore = 'High';
    else if (avgInt >= 1) distScore = 'Medium';
    
    const distChange = getPercentageChange(summary.avgInterruptions, summary.prevAvgInterruptions);

    const count = summary.sessionsCount || 0;
    const sessionWord = count === 1 ? 'productive session' : 'productive sessions';

    let focusTimeFormatted = '0m';
    const totalSecs = summary.currentDurationSeconds || 0;
    if (totalSecs > 0) {
      if (totalSecs < 60) {
        focusTimeFormatted = '1m';
      } else {
        const totalMinutes = Math.max(1, Math.round(totalSecs / 60));
        const h2 = Math.floor(totalMinutes / 60);
        const m2 = totalMinutes % 60;
        if (h2 > 0 && m2 > 0) {
          focusTimeFormatted = `${h2}h ${m2}m`;
        } else if (h2 > 0) {
          focusTimeFormatted = `${h2}h`;
        } else {
          focusTimeFormatted = `${m2}m`;
        }
      }
    }

    let avgDailySeconds = 0;
    if (summary.daysInPeriod > 0) {
      avgDailySeconds = summary.currentDurationSeconds / summary.daysInPeriod;
    }
    let peakAvgFormatted = '--';
    if (summary.peakVelocity !== '--') {
      if (avgDailySeconds > 0 && avgDailySeconds < 3600) {
        peakAvgFormatted = `${Math.ceil(avgDailySeconds / 60)}m avg`;
      } else {
        peakAvgFormatted = `${(summary.focusHours / summary.daysInPeriod).toFixed(1)}h avg`;
      }
    }

    return {
      focusTime: {
        value: focusTimeFormatted,
        change: focusChange.str,
        changeDirection: focusChange.dir,
        subtitle: `${count} ${sessionWord}`,
        comparisonLabel: `vs previous period`
      },
      taskCompletion: {
        value: `${rate}%`,
        change: '--',
        changeDirection: 'none',
        subtitle: `${summary.completedTasks} / ${summary.totalTasks} tasks finished`,
        rating: rate >= 80 ? 'Excellent' : rate >= 50 ? 'Good' : 'Building',
        comparisonLabel: `Unavailable`
      },
      peakVelocity: {
        value: summary.peakVelocity,
        subtitle: summary.peakVelocity !== '--' ? 'Highest cognitive flow' : 'Not enough data',
        avgHours: peakAvgFormatted
      },
      distractionScore: {
        value: distScore,
        change: distChange.str,
        changeDirection: distChange.dir,
        subtitle: `${avgInt.toFixed(1)} avg interruptions`,
        ranking: '--'
      },
      longestSession: {
        value: summary.longestSessionFormatted
      },
      _summary: summary
    };
  }

  /**
   * Get Focus Chart data for UI compatibility (/analytics/focus)
   */
  static async getFocusChart(userId, period = 'last7') {
    const { start, days } = this.getDateRange(period);
    const sessions = await FocusSession.find({ 
      user: userId, 
      status: FOCUS_SESSION_STATUS.COMPLETED,
      type: { $nin: [FOCUS_SESSION_TYPE.SHORT_BREAK, FOCUS_SESSION_TYPE.LONG_BREAK] },
      startTime: { $gte: start } 
    });

    let labels = [];
    let dataSeconds = [];
    
    const now = new Date();
    
    if (days <= 7) {
      labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      dataSeconds = [0, 0, 0, 0, 0, 0, 0];
      sessions.forEach(s => {
        const dayIdx = new Date(s.startTime).getDay();
        const mappedIdx = dayIdx === 0 ? 6 : dayIdx - 1;
        dataSeconds[mappedIdx] += (s.duration || 0);
      });
    } else {
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 86400000);
        labels.push(`${d.getMonth() + 1}/${d.getDate()}`);
        dataSeconds.push(0);
      }
      sessions.forEach(s => {
        const diffDays = Math.floor((now.getTime() - new Date(s.startTime).getTime()) / 86400000);
        const idx = (days - 1) - diffDays;
        if (idx >= 0 && idx < days) {
          dataSeconds[idx] += (s.duration || 0);
        }
      });
    }
    
    const data = dataSeconds.map(sec => sec > 0 ? Number((sec / 3600).toFixed(4)) : 0);

    return {
      labels,
      datasets: [
        {
          label: 'Focus Hours',
          data,
          borderColor: '#A855F7',
          backgroundColor: 'rgba(168, 85, 247, 0.15)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#A855F7',
          pointRadius: 4
        }
      ]
    };
  }

  /**
   * Get Velocity Chart data for UI compatibility (/analytics/velocity)
   */
  static async getVelocityChart(userId, period = 'last30') {
    const { start, days } = this.getDateRange(period);
    const sessions = await FocusSession.find({ 
      user: userId, 
      status: FOCUS_SESSION_STATUS.COMPLETED,
      type: { $nin: [FOCUS_SESSION_TYPE.SHORT_BREAK, FOCUS_SESSION_TYPE.LONG_BREAK] },
      startTime: { $gte: start } 
    }).sort('startTime');

    const numWeeks = Math.ceil(days / 7);
    const completedSeconds = new Array(numWeeks).fill(0);
    const labels = [];
    for (let i = 1; i <= numWeeks; i++) {
      labels.push(`Wk ${i}`);
    }
    
    const now = new Date();
    sessions.forEach(s => {
      const diffTime = Math.abs(now.getTime() - new Date(s.startTime).getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      let weekIdx = (numWeeks - 1) - Math.floor(diffDays / 7);
      if (weekIdx >= 0 && weekIdx < numWeeks) {
        completedSeconds[weekIdx] += (s.duration || 0);
      }
    });

    const completedData = completedSeconds.map(sec => parseFloat((sec / 3600).toFixed(1)));

    return {
      labels,
      datasets: [
        { label: 'Completed', data: completedData, backgroundColor: '#A855F7', borderRadius: 6 }
      ]
    };
  }

  /**
   * Get Weekly Comparison data for UI compatibility (/analytics/weekly-comparison)
   */
  static async getWeeklyComparison(userId, period = 'last7') {
    const focusChart = await this.getFocusChart(userId, period);
    const actualData = focusChart.datasets[0].data;

    return {
      labels: focusChart.labels,
      datasets: [
        { label: 'Actual Hours', data: actualData, backgroundColor: '#A855F7', borderRadius: 4 }
      ]
    };
  }

  /**
   * Get Goal Allocation data for UI compatibility (/analytics/goal-allocation)
   */
  static async getGoalAllocation(userId, period = 'last7') {
    const { start } = this.getDateRange(period);
    const sessions = await FocusSession.find({ 
      user: userId, 
      status: FOCUS_SESSION_STATUS.COMPLETED,
      type: { $nin: [FOCUS_SESSION_TYPE.SHORT_BREAK, FOCUS_SESSION_TYPE.LONG_BREAK] },
      goalId: { $ne: null },
      startTime: { $gte: start }
    });

    if (sessions.length === 0) {
      return {
        labels: ['No Active Goals'],
        datasets: [{ data: [100], backgroundColor: ['#3E3E3E'], borderColor: '#0E0E0E', borderWidth: 3 }]
      };
    }

    const goalDurations = {};
    sessions.forEach(s => {
      const gid = s.goalId.toString();
      goalDurations[gid] = (goalDurations[gid] || 0) + (s.duration || 0);
    });

    const goalIds = Object.keys(goalDurations);
    const goals = await Goal.find({ _id: { $in: goalIds } });
    const goalTitleMap = {};
    goals.forEach(g => { goalTitleMap[g._id.toString()] = g.title; });

    const labels = [];
    const data = [];
    
    const sortedGoals = Object.entries(goalDurations).sort((a, b) => b[1] - a[1]).slice(0, 5);
    
    sortedGoals.forEach(([gid, sec]) => {
      labels.push(goalTitleMap[gid] || 'Unknown Goal');
      data.push(parseFloat((sec / 3600).toFixed(2))); 
    });

    const colors = ['#A855F7', '#FACC15', '#22C55E', '#38BDF8', '#6B7280'];

    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor: colors.slice(0, labels.length),
          borderColor: '#0E0E0E',
          borderWidth: 3
        }
      ]
    };
  }
}
