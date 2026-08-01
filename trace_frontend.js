const fs = require('fs');

const content = fs.readFileSync('frontend/dashboard.html', 'utf8');
const searchString = "if (!subCopy.completed && subCopy.lifecycle && subCopy.deadlineInfo) {";
const replacement = `console.log("Dashboard checking subtask:", subCopy.title, "completed:", subCopy.completed, "deadline:", subCopy.deadline, "lifecycle:", subCopy.lifecycle, "deadlineInfo:", subCopy.deadlineInfo);
            if (!subCopy.completed && subCopy.lifecycle && subCopy.deadlineInfo) {`;

if (content.includes(searchString)) {
  fs.writeFileSync('frontend/dashboard.html', content.replace(searchString, replacement));
  console.log('Injected logging into dashboard.html');
} else {
  console.log('Could not find search string in dashboard.html');
}
