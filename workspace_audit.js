const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  const errors = [];
  
  page.on('pageerror', err => errors.push(`Page Error: ${err.message}`));
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(`Console Error: ${msg.text()}`);
    }
  });

  try {
    // Navigate to Login and authenticate
    await page.goto('http://localhost:3000/login.html');
    await page.type('#email', 'test@test.com');
    await page.type('#password', 'password');
    await page.click('button[type="submit"]');
    await page.waitForNavigation();

    // Navigate to Workspace
    await page.goto('http://localhost:3000/workspace.html');
    
    // Check elements
    await page.waitForSelector('.filter-chip', { timeout: 5000 });
    
    // Test Filtering
    const filters = await page.$$('.filter-chip');
    console.log(`Found ${filters.length} filters`);
    for (const filter of filters) {
      await filter.click();
      await page.waitForTimeout(500); // allow render
    }
    
    // Test Sorting
    await page.click('#sortDropdownButton');
    await page.waitForTimeout(500);
    const sortOptions = await page.$$('.sort-option');
    console.log(`Found ${sortOptions.length} sort options`);
    for (const opt of sortOptions) {
      await page.click('#sortDropdownButton'); // Open again
      await page.waitForTimeout(200);
      await opt.click();
      await page.waitForTimeout(500); // allow render
    }
    
    console.log("Workspace Audit Complete");
    console.log("Errors found: ", errors);
    
    // Check Dashboard
    await page.goto('http://localhost:3000/dashboard.html');
    await page.waitForTimeout(1000);
    console.log("Dashboard loaded");
    
    // Check Planner
    await page.goto('http://localhost:3000/planner.html');
    await page.waitForTimeout(1000);
    console.log("Planner loaded");
    
  } catch (err) {
    console.error("Test failed: ", err);
  } finally {
    console.log("Total errors during session: ", errors);
    await browser.close();
  }
})();
