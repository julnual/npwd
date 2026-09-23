import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PHOTO_SCRIPT_URL, SITE_ORIGIN } from "./share/config.mjs";

assert(!PHOTO_SCRIPT_URL.includes("REPLACE_WITH_"), "Add the new dedicated photo Apps Script /exec URL before publishing.");
const healthUrl = new URL(PHOTO_SCRIPT_URL);
healthUrl.searchParams.set("health", String(Date.now()));
const response = await fetch(healthUrl, { signal: AbortSignal.timeout(60000) });
assert(response.ok, "Cannot reach the dedicated photo Apps Script deployment.");
let health;
try { health = await response.json(); } catch { throw new Error("Photo Apps Script must allow Anyone and return JSON health."); }
assert(health.ok && health.version === 2 && health.photoReady === true && health.mediaReady === true,
  `Run setupPhotoSharing and deploy the dedicated media Apps Script before publishing. Health: ${JSON.stringify(health)}`);

const url = new URL(PHOTO_SCRIPT_URL);
url.search = new URLSearchParams({
  mode: "challenge",
  origin: SITE_ORIGIN,
  channel: randomUUID(),
  requestId: randomUUID(),
});
const challenge = await fetch(url, { signal: AbortSignal.timeout(60000) });
const html = await challenge.text();
assert(challenge.ok && html.includes("ploy-nan-photo"), "The dedicated photo challenge bridge did not load.");
console.log("Dedicated media Apps Script is configured and ready. No file was uploaded.");
