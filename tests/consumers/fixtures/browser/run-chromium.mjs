// Serves the Vite build and reads the result the page computed in Chromium.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { preview } from 'vite';

const server = await preview({
  root: path.dirname(fileURLToPath(import.meta.url)),
  preview: { port: 0, strictPort: false },
});
const url = server.resolvedUrls.local[0];

const browser = await chromium.launch();
const page = await browser.newPage();
const consoleErrors = [];
page.on('pageerror', (error) => consoleErrors.push(String(error)));
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});

await page.goto(url, { waitUntil: 'networkidle' });
const outcome = await page.evaluate(() => globalThis.__corjResult);
await browser.close();
await server.close();

const result =
  outcome === undefined
    ? {
        ok: false,
        results: [
          { name: 'page executed', ok: false, error: 'the module never ran' },
        ],
      }
    : outcome;
if (consoleErrors.length) {
  result.ok = false;
  result.results.push({
    name: 'no page errors',
    ok: false,
    error: consoleErrors.join(' | '),
  });
}
console.log(JSON.stringify(result));
process.exitCode = result.ok ? 0 : 1;
