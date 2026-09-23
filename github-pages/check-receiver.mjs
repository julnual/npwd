import { SCRIPT_URL, SITE_ORIGIN } from "./config.mjs";
import { randomUUID } from "node:crypto";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function retry(check, message, attempts = 4) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      if (await check()) return;
      lastError = new Error(message);
    } catch (error) {
      lastError = error;
    }
    if (attempt < attempts) await wait(attempt * 5000);
  }
  throw new Error(`${message} ${lastError?.message || ""}`.trim());
}

await retry(async () => {
  const healthUrl = new URL(SCRIPT_URL);
  healthUrl.searchParams.set("nonce", randomUUID());
  const response = await fetch(healthUrl, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) return false;
  const health = await response.json();
  return health.ok && health.version === 2 && health.ready;
}, "Cannot reach the ready Apps Script v2 deployment.");
// Read-only challenge check: never append a test guest to the real Sheet.
const url = new URL(SCRIPT_URL);
url.search = new URLSearchParams({ mode: "challenge", origin: SITE_ORIGIN, channel: randomUUID(), requestId: randomUUID() });
await retry(async () => {
  const challenge = await fetch(url, { signal: AbortSignal.timeout(30000) });
  const html = await challenge.text();
  return challenge.ok && html.includes("ploy-nan-wedding");
}, "The public challenge bridge did not load.", 3);
console.log("Apps Script v2 is configured and the read-only challenge loads. No guest data was written.");
