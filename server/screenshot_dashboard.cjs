const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  // Set viewport to laptop size
  await page.setViewport({ width: 1440, height: 900 });

  // 1. Navigate to login
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });

  // 2. Click "Host Mode" if there is a tab for it, or just use the mock host credentials
  // The UI has email and password inputs
  try {
    // Fill login form
    await page.type('input[type="email"]', 'rajnishbansal0906@gmail.com');
    await page.type('input[type="password"]', 'password');
    
    // Attempt to click the submit button
    const buttons = await page.$$('button');
    for (const btn of buttons) {
       const text = await page.evaluate(el => el.textContent, btn);
       if (text && text.toLowerCase().includes('sign in')) {
          await btn.click();
          break;
       }
    }
    
    // Wait for navigation / dashboard load
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 5000 }).catch(() => {});
    
    // Wait an extra second for listings to load via fetch
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Force navigate to host dashboard if it went to home page
    if (page.url().includes('/host')) {
       console.log("Already on host dashboard");
    } else {
       await page.goto('http://localhost:5173/host', { waitUntil: 'networkidle2' });
       // Wait for API listings to render
       await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Capture screenshot
    await page.screenshot({ path: '../host_dashboard_debug.png', fullPage: true });
    console.log("Screenshot saved to root as host_dashboard_debug.png");

  } catch (err) {
    console.error("Puppeteer Script Error:", err);
  } finally {
    await browser.close();
  }
})();
