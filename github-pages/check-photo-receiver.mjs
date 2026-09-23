import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PHOTO_SCRIPT_URL, SITE_ORIGIN } from "./share/config.mjs";

assert(!PHOTO_SCRIPT_URL.includes("REPLACE_WITH_"), "Add the new dedicated photo Apps Script /exec URL before publishing.");
const healthUrl = new URL(PHOTO_SCRIPT_URL);
healthUrl.searchParams.set("mode", "health-v2");
healthUrl.searchParams.set("nonce", randomUUID());

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchReadyHealth() {
  let lastHealth;
  let lastError;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(healthUrl, { signal: AbortSignal.timeout(30000) });
      assert(response.ok, `HTTP ${response.status}`);
      lastHealth = await response.json();
      if (lastHealth.ok && lastHealth.version === 2 && lastHealth.build === "media-v2"
        && lastHealth.photoReady === true && lastHealth.mediaReady === true) return lastHealth;
      lastError = new Error(`Health: ${JSON.stringify(lastHealth)}`);
    } catch (error) {
      lastError = error;
    }
    if (attempt < 4) await wait(attempt * 5000);
  }
  throw new Error(`Dedicated media Apps Script is not ready after retries. ${lastError?.message || "Unknown error"}`);
}

await fetchReadyHealth();

const url = new URL(PHOTO_SCRIPT_URL);
url.search = new URLSearchParams({
  mode: "challenge",
  origin: SITE_ORIGIN,
  channel: randomUUID(),
  requestId: randomUUID(),
});
let challengeReady = false;
for (let attempt = 1; attempt <= 3 && !challengeReady; attempt += 1) {
  try {
    const challenge = await fetch(url, { signal: AbortSignal.timeout(30000) });
    const html = await challenge.text();
    challengeReady = challenge.ok && html.includes("ploy-nan-photo");
  } catch (_) {
    challengeReady = false;
  }
  if (!challengeReady && attempt < 3) await wait(attempt * 5000);
}
assert(challengeReady, "The dedicated photo challenge bridge did not load after retries.");
console.log("Dedicated media Apps Script is configured and ready. No file was uploaded.");
