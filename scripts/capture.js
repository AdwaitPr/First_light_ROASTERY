const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('/tmp/node_modules/playwright-core');

const PORT = 8088;
const ROOT = path.join(__dirname, '..');

// Simple static HTTP server
function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let filePath = path.join(ROOT, req.url === '/' ? 'index.html' : req.url);
      filePath = filePath.split('?')[0];
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }
        let contentType = 'text/html';
        if (filePath.endsWith('.css')) contentType = 'text/css';
        if (filePath.endsWith('.js')) contentType = 'application/javascript';
        if (filePath.endsWith('.png')) contentType = 'image/png';
        if (filePath.endsWith('.webp')) contentType = 'image/webp';
        if (filePath.endsWith('.svg')) contentType = 'image/svg+xml';
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
      });
    });
    server.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
      resolve(server);
    });
  });
}

async function capture() {
  const server = await startServer();
  const browser = await chromium.launch({
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=egl']
  });

  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1
  });

  // Ensure output dirs
  fs.mkdirSync(path.join(ROOT, 'screenshots'), { recursive: true });
  fs.mkdirSync(path.join(ROOT, 'snapshots'), { recursive: true });

  console.log('1. Capturing Preloader State...');
  // Intercept/pause to capture preloader before completion
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'commit' });
  await page.waitForTimeout(300); // short wait to render preloader
  await page.screenshot({ path: path.join(ROOT, 'screenshots/01-preloader.png') });
  let preloaderDom = await page.content();
  fs.writeFileSync(path.join(ROOT, 'snapshots/01-preloader.html'), preloaderDom);

  console.log('2. Waiting for Preloader to finish and Hero to reveal...');
  await page.waitForFunction(() => !document.documentElement.classList.contains('is-loading'), { timeout: 10000 });
  await page.waitForTimeout(1000); // allow hero introTL animation to settle

  console.log('   Capturing Hero State...');
  await page.screenshot({ path: path.join(ROOT, 'screenshots/02-hero.png') });
  let heroDom = await page.evaluate(() => document.querySelector('#hero').outerHTML);
  fs.writeFileSync(path.join(ROOT, 'snapshots/02-hero.html'), heroDom);

  console.log('3. Capturing Sequence Stage 1 (Raw Ingredients)...');
  await page.evaluate(() => {
    const seq = document.querySelector('#sequence');
    seq.scrollIntoView({ behavior: 'instant' });
    // Trigger progress update for Stage 0 (Card 0)
    if (window.sequenceStage) {
      // scroll slightly inside sequence trigger
      window.scrollTo(0, seq.offsetTop + 100);
    }
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(ROOT, 'screenshots/03-sequence-stage-01.png') });
  let seq1Dom = await page.evaluate(() => document.querySelector('#sequence').outerHTML);
  fs.writeFileSync(path.join(ROOT, 'snapshots/03-sequence-stage-01.html'), seq1Dom);

  console.log('4. Capturing Sequence Stage 2 (Mid-Brew)...');
  await page.evaluate(() => {
    const seq = document.querySelector('#sequence');
    const scrollHeight = document.documentElement.scrollHeight;
    // Scroll to ~40% through sequence section
    window.scrollTo(0, seq.offsetTop + (seq.offsetHeight * 1.5));
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(ROOT, 'screenshots/04-sequence-stage-02.png') });
  let seq2Dom = await page.evaluate(() => document.querySelector('#sequence').outerHTML);
  fs.writeFileSync(path.join(ROOT, 'snapshots/04-sequence-stage-02.html'), seq2Dom);

  console.log('5. Capturing Sequence Stage 3 (Finished Pour)...');
  await page.evaluate(() => {
    const seq = document.querySelector('#sequence');
    // Scroll near the end of sequence pinned distance
    window.scrollTo(0, seq.offsetTop + (seq.offsetHeight * 2.8));
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(ROOT, 'screenshots/05-sequence-stage-03.png') });
  let seq3Dom = await page.evaluate(() => document.querySelector('#sequence').outerHTML);
  fs.writeFileSync(path.join(ROOT, 'snapshots/05-sequence-stage-03.html'), seq3Dom);

  console.log('6. Capturing CTA Section...');
  await page.evaluate(() => {
    const cta = document.querySelector('#cta');
    cta.scrollIntoView({ behavior: 'instant' });
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(ROOT, 'screenshots/06-cta.png') });
  let ctaDom = await page.evaluate(() => document.querySelector('#cta').outerHTML);
  fs.writeFileSync(path.join(ROOT, 'snapshots/06-cta.html'), ctaDom);

  console.log('7. Capturing Colophon / Footer Section...');
  await page.evaluate(() => {
    const colophon = document.querySelector('#colophon');
    colophon.scrollIntoView({ behavior: 'instant' });
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(ROOT, 'screenshots/07-colophon.png') });
  let colophonDom = await page.evaluate(() => document.querySelector('#colophon').outerHTML);
  fs.writeFileSync(path.join(ROOT, 'snapshots/07-colophon.html'), colophonDom);

  console.log('Capture complete!');

  await browser.close();
  server.close();
}

capture().catch((err) => {
  console.error(err);
  process.exit(1);
});
