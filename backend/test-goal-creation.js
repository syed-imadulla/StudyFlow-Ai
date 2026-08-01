async function run() {
  const payload = {
    title: 'New AI Goal Integration Test',
    urgency: 'ACTIVE',
    description: 'Testing the new backend milestone generation',
    deadline: { mode: 'DURATION', value: 7, unit: 'days' },
    rawDump: "Milestone A\nMilestone B"
  };

  const res = await fetch('http://localhost:5001/api/goals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test-token-123' },
    body: JSON.stringify(payload)
  });

  const goal = await res.json();
  console.log("=== API RESPONSE ===");
  console.log(JSON.stringify(goal.data.subtasks, null, 2));
}

run();
