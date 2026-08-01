const http = require('http');

http.get('http://localhost:5000/api/v1/goals', (resp) => {
  let data = '';
  resp.on('data', chunk => data += chunk);
  resp.on('end', () => {
     let parsed;
     try {
       parsed = JSON.parse(data);
     } catch (e) {
       console.log("Could not parse JSON:", e.message);
       return;
     }
     if (!parsed.data) {
       console.log("API Error:", parsed);
       return;
     }
     
     const goals = parsed.data;
     let milestones = [];
     goals.forEach(goal => {
        if (goal.archived || goal.deleted || goal.status === 'archived' || goal.status === 'deleted') return;
        if (!goal.subtasks) return;
        goal.subtasks.forEach((sub, originalIndex) => {
            if (sub.completed || !sub.title || sub.title.trim() === '') return;

            let dueObj = null;
            if (sub.deadline) {
              const parts = sub.deadline.split('-');
              if (parts.length === 3) {
                const y = parseInt(parts[0], 10);
                const m = parseInt(parts[1], 10) - 1;
                const d = parseInt(parts[2], 10);
                dueObj = new Date(y, m, d);
              }
            }
            if (!dueObj || isNaN(dueObj.getTime())) {
               console.log("Failed to parse deadline:", sub.deadline, "for", sub.title);
               return;
            }

            milestones.push({
              ...sub,
              goalId: goal.id,
              goalTitle: goal.title,
              dueObj: dueObj
            });
        });
     });
     
     const todayMidnight = new Date();
     todayMidnight.setHours(0, 0, 0, 0);
     const visible = milestones.filter(m => m.dueObj.getTime() >= todayMidnight.getTime());
     
     console.log("Total milestones parsed:", milestones.length);
     console.log("Visible upcoming milestones:", visible.length);
     visible.forEach(m => console.log(m.title, m.dueObj));
  });
});
