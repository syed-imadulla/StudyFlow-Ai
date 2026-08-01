const fs = require('fs');
const content = fs.readFileSync('frontend/dashboard.html', 'utf8');

// Use regex or simple logic to see if it's well-formed
// Wait, I can just use a simple regex to check for the logic.
const matches = content.match(/if \(\!subCopy\.completed(.*?)\{([\s\S]*?)allSubtasks\.push\(subCopy\);/m);
if (matches) {
  console.log("Match found:");
  console.log(matches[0]);
} else {
  console.log("No match found!");
}
