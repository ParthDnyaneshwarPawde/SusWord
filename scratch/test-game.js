const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page1 = await browser.newPage();
    const page2 = await browser.newPage();
    
    console.log('[TEST] Navigating to homepage...');
    await page1.goto('http://localhost:5173');
    await page2.goto('http://localhost:5173');
    
    console.log('[TEST] Creating room...');
    await page1.waitForSelector('#player-name-input');
    await page1.type('#player-name-input', 'HostUser');
    await page1.click('#create-room-btn');
    await page1.waitForSelector('#confirm-create-btn');
    await page1.click('#confirm-create-btn');
    
    await page1.waitForFunction(() => document.body.innerText.includes('Room Code:'), {timeout: 5000});
    const p1Text = await page1.evaluate(() => document.body.innerText);
    const roomCodeMatch = p1Text.match(/Room Code:\s*([A-Z0-9]+)/i);
    const roomCode = roomCodeMatch ? roomCodeMatch[1] : null;
    
    if (!roomCode) throw new Error("Could not find room code on Host page.");
    console.log('[PASS] Create room. Room Code: ' + roomCode);
    
    console.log('[TEST] Joining room...');
    await page2.waitForSelector('#player-name-input');
    await page2.type('#player-name-input', 'GuestUser');
    await page2.click('#join-room-btn');
    await page2.waitForSelector('#room-code-input');
    await page2.type('#room-code-input', roomCode);
    await page2.click('#confirm-join-btn');
    
    await page2.waitForFunction(() => document.body.innerText.includes('HostUser'), {timeout: 5000});
    console.log('[PASS] Join room and Lobby sync.');
    
    console.log('[TEST] Starting game...');
    // The host clicks the start game button. We need to find it on page1.
    // In Lobby.jsx, it's likely a button that says 'Start Game' or similar.
    await page1.evaluate(() => {
       const btns = Array.from(document.querySelectorAll('button'));
       const start = btns.find(b => b.innerText.toLowerCase().includes('start'));
       if(start) start.click();
    });
    
    await page1.waitForFunction(() => document.body.innerText.includes('Secret Word') || document.body.innerText.includes('Imposter'), {timeout: 5000});
    await page2.waitForFunction(() => document.body.innerText.includes('Secret Word') || document.body.innerText.includes('Imposter'), {timeout: 5000});
    console.log('[PASS] Game start & Role assignment.');
    
    console.log('[TEST] ALL TESTS PASSED!');
  } catch (err) {
    console.error('[FAIL]', err);
  } finally {
    await browser.close();
  }
})();
