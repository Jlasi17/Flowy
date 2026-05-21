const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({headless: 'new'});
  const page = await browser.newPage();
  await page.goto('http://localhost:5173');
  // wait 5 seconds
  await new Promise(r => setTimeout(r, 5000));
  await page.screenshot({path: 'screenshot.png'});
  await browser.close();
})();
