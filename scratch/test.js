const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page1 = await browser.newPage();
  
  await page1.goto('http://localhost:5173', { waitUntil: 'networkidle0', timeout: 30000 });
  
  await page1.screenshot({ path: 'homepage.png' });
  
  console.log('Homepage saved.');
  await browser.close();
})();
