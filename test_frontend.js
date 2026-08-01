const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'frontend/dashboard.html'), 'utf8');

const dom = new JSDOM(html, {
  url: 'http://localhost:3000/dashboard.html',
  runScripts: "dangerously",
  resources: "usable"
});

dom.window.console.log = (...args) => console.log('BROWSER LOG:', ...args);
dom.window.console.error = (...args) => console.error('BROWSER ERROR:', ...args);

dom.window.addEventListener('load', () => {
  setTimeout(() => {
    console.log("Goals in store:", dom.window.SF_STORE.getSlice('goals').items.length);
    process.exit(0);
  }, 3000);
});
