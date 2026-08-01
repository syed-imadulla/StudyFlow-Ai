const getRelativeDate = (display, createdAt) => {
  if (!display) return null;
  const lower = display.toLowerCase().trim();
  const refDate = createdAt ? new Date(createdAt) : new Date(); // Fallback if createdAt missing
  let diffDays = null;
  
  if (lower === 'today') diffDays = 0;
  else if (lower === 'tomorrow') diffDays = 1;
  else if (lower === 'yesterday' || lower === 'overdue') diffDays = -1;
  else if (lower.startsWith('in ') && lower.includes('day')) {
    const num = parseInt(lower.replace(/[^\d]/g, ''), 10);
    if (!isNaN(num)) diffDays = num;
  }
  
  if (diffDays !== null) {
    const target = new Date(refDate);
    target.setDate(target.getDate() + diffDays);
    return target.toISOString().split('T')[0];
  }
  return null;
};

export default {
  version: "001_migrate_deadlines",
  description: "Converts legacy deadlineDisplay strings into factual deadline dates.",

  async run(collection, DRY_RUN) {
    const goals = await collection.find({}).toArray();
    
    const report = {
      goalsProcessed: goals.length,
      goalsUpdated: 0,
      milestonesUpdated: 0,
      alreadyMigrated: 0,
      skipped: 0,
      unknownFormats: 0,
      errors: 0,
      skippedLogs: [],
      successLogs: [],
      unknownFormatLogs: [],
      beforeSample: null,
      afterSample: null
    };
    
    for (const goal of goals) {
      let modifiedGoal = false;
      
      if (goal.subtasks && goal.subtasks.length > 0) {
        for (const sub of goal.subtasks) {
          if (sub.deadline && !sub.deadlineDisplay) {
            report.alreadyMigrated++;
          } else if (!sub.deadline && sub.deadlineDisplay) {
            const newDeadline = getRelativeDate(sub.deadlineDisplay, goal.createdAt);
            
            if (newDeadline) {
              report.successLogs.push(`[SUCCESS] Goal: "${goal.title}" | Subtask: "${sub.title}" | Migrating: '${sub.deadlineDisplay}' -> '${newDeadline}' (Ref: ${goal.createdAt})`);
              
              if (!report.beforeSample) {
                 report.beforeSample = JSON.parse(JSON.stringify(sub));
              }
              
              sub.deadline = newDeadline;
              sub.deadlineTime = null;
              delete sub.deadlineDisplay;
              
              if (!report.afterSample) {
                 report.afterSample = JSON.parse(JSON.stringify(sub));
              }
              
              report.milestonesUpdated++;
              modifiedGoal = true;
            } else {
               report.unknownFormats++;
               report.skipped++;
               report.unknownFormatLogs.push(`[SKIPPED] Goal: "${goal.title}" | Subtask: "${sub.title}" | Legacy Value: '${sub.deadlineDisplay}' | Reason: Cannot safely reconstruct factual deadline.`);
            }
          }
        }
      }
      
      if (modifiedGoal) {
        if (!DRY_RUN) {
          try {
             await collection.updateOne({ _id: goal._id }, { $set: { subtasks: goal.subtasks } });
             report.goalsUpdated++;
          } catch (e) {
             report.errors++;
             console.error(`[ERROR] Failed to update goal: ${goal._id}`, e);
          }
        } else {
          report.goalsUpdated++;
        }
      }
    }
    
    return report;
  },

  async rollback(collection, DRY_RUN) {
    console.log("[INFO] Rollback not implemented for this migration.");
  }
};
