const fs = require('fs');
const path = require('path');


// Set up global environment for tests (No JSDOM, just pure Node)
global.window = global;

// Initialize namespace
global.window.SF_DISCOVERY = {};

// We will read the scripts directly and evaluate them in the current context
// so that `window.SF_DISCOVERY.*` assignments stick globally.
const srcJsPath = path.resolve(__dirname, '../../src/js');

function loadScript(relativePath) {
  const code = fs.readFileSync(path.join(srcJsPath, relativePath), 'utf8');
  // Evaluate in the current Jest sandbox context so that 'window' resolves to 'global.window'
  eval(code);
}

beforeEach(() => {
  // Clear any potential mock counters
  jest.clearAllMocks();
  
  // Re-initialize the namespace to prevent state bleed
  global.window.SF_DISCOVERY = {};
  
  // Load scripts required for discovery testing
  loadScript('discovery/searchEngine.js');
  loadScript('discovery/filterEngine.js');
  loadScript('discovery/sortEngine.js');
  loadScript('discovery/comparators.js');
  loadScript('discovery/discoveryPipeline.js');
});
