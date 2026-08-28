import assert from "node:assert/strict";
import { SCRIPT_URL, SITE_ORIGIN } from "./config.mjs";
import { randomUUID } from "node:crypto";

const response = await fetch(SCRIPT_URL, { signal: AbortSignal.timeout(60000) });
assert(response.ok, "Cannot reach Apps Script. Check the existing deployment's access setting.");
let health;
try { health = await response.json(); } catch { throw new Error("Apps Script must allow Anyone and return the v2 health response."); }
assert(health.ok && health.version === 2 && health.ready, "Update the existing Apps Script deployment to v2 before publishing.");
// Read-only challenge check: never append a test guest to the real Sheet.
const url = new URL(SCRIPT_URL);
url.search = new URLSearchParams({ mode: "challenge", origin: SITE_ORIGIN, channel: randomUUID(), requestId: randomUUID() });
const challenge = await fetch(url, { signal: AbortSignal.timeout(60000) });
const html = await challenge.text();
assert(challenge.ok && html.includes("ploy-nan-wedding"), "The public challenge bridge did not load. Check allowed origin and deployment.");
console.log("Apps Script v2 is configured and the read-only challenge loads. No guest data was written.");
