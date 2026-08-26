const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  // Listen to console logs
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  
  await page.goto('http://localhost:5500/frontend/idealab.html', { waitUntil: 'networkidle2' });
  
  // Type message
  await page.type('#stepInput', 'I want to build a Python weather app');
  
  // Click Next button
  await page.click('#nextBtn');
  
  // Wait for 15 seconds
  await new Promise(r => setTimeout(r, 15000));
  
  // Get chat feed
  const chatText = await page.evaluate(() => {
    return document.getElementById('aiChatFeed').innerText;
  });
  console.log('--- Chat Feed ---');
  console.log(chatText);
  
  const btnText = await page.evaluate(() => {
    return document.getElementById('nextBtn').innerText;
  });
  console.log('--- Button Text ---');
  console.log(btnText);
  
  await browser.close();
})();
