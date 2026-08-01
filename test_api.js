const http = require('http');

http.get('http://localhost:5000/api/v1/goals', (resp) => {
  let data = '';
  resp.on('data', (chunk) => {
    data += chunk;
  });
  resp.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log("Goals returned from API:", parsed.data.length);
      const goal = parsed.data.find(g => g.subtasks.some(s => !s.completed));
      if (goal) {
         const subtask = goal.subtasks.find(s => !s.completed);
         console.log("Subtask:", {
           title: subtask.title,
           deadline: subtask.deadline,
           lifecycle: subtask.lifecycle,
           deadlineInfo: subtask.deadlineInfo
         });
      } else {
         console.log("No incomplete subtasks found in API response.");
      }
    } catch(e) {
      console.log("Failed to parse", e);
    }
  });
}).on("error", (err) => {
  console.log("Error: " + err.message);
});
