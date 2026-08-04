async function makeRequest(method, path, body = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(`http://127.0.0.1:5000${path}`, options);
  const data = await res.json();
  return { status: res.status, data };
}

(async () => {
  try {
    const userId = '6a713d74ae37665fd1bdcad8';
    const res1 = await makeRequest('POST', '/api/v1/goals', { title: "E2E Validation Goal", userId, targetDate: new Date(Date.now() + 86400000).toISOString() });
    const goalId = res1.data.data._id;
    console.log("Goal created:", goalId);
    
    const res2 = await makeRequest('GET', '/api/v1/goals?userId=' + userId);
    const goal = res2.data.data.find(g => g._id === goalId);
    console.log("Goal DTO blocks present:", !!goal.lifecycle, !!goal.deadlineInfo, !!goal.goalHealth, !!goal.progressSummary);
    
    const res3 = await makeRequest('POST', `/api/v1/goals/${goalId}/milestones`, { userId, title: 'Milestone 1', targetDate: new Date(Date.now() + 86400000).toISOString() });
    const milestoneId = res3.data.data._id;
    console.log("Milestone added:", milestoneId);
    
    const res4 = await makeRequest('PUT', `/api/v1/goals/${goalId}/milestones/${milestoneId}`, { userId, isCompleted: true });
    console.log("Milestone completed. Progress:", res4.data.data.progressSummary.completionPercentage);
    
    const res5 = await makeRequest('PUT', `/api/v1/goals/${goalId}`, { userId, status: 'COMPLETED' });
    console.log("Goal completed. Lifecycle status:", res5.data.data.lifecycle.status);
    
    console.log("E2E API validation successful");
  } catch (err) {
    console.error("Error:", err);
  }
})();
