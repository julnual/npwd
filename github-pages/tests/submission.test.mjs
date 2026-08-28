import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { isGoogleScriptOrigin, submitToAppsScript } from "../submission.mjs";

test("only HTTPS Google Apps Script message origins accepted", () => {
  for (const origin of ["https://script.google.com", "https://script.googleusercontent.com", "https://abc-123-script.googleusercontent.com"]) assert(isGoogleScriptOrigin(origin));
  for (const origin of ["null", "http://script.google.com", "https://script.google.com.evil.com", "https://googleusercontent.com", "https://evil.googleusercontent.com", "https://script.google.com:444", "https://script.google.com/path"]) assert(!isGoogleScriptOrigin(origin));
});

function dom() {
  const listeners = new Set(); const nodes = []; const sent = [];
  const window = { location: { origin: "https://julnual.github.io" },
    addEventListener: (_type, fn) => listeners.add(fn), removeEventListener: (_type, fn) => listeners.delete(fn) };
  const document = { body: { appendChild: node => nodes.push(node) }, createElement: tag => ({ tag, children: [],
    appendChild(node) { this.children.push(node); }, setAttribute() {},
    remove() { const index = nodes.indexOf(this); if (index >= 0) nodes.splice(index, 1); },
    submit() { sent.push(Object.fromEntries(this.children.map(n => [n.name, n.value]))); } }) };
  globalThis.window = window; globalThis.document = document;
  return { nodes, sent, listeners, window, message(data, origin = "https://abc-script.googleusercontent.com") { for (const fn of listeners) fn({ data, origin }); } };
}

test("bridge waits for matching acknowledgement, ignores forged/unrelated events, cleans up", async () => {
  const d = dom(); const requestId = randomUUID();
  const pending = submitToAppsScript("/api/wedding", { body: JSON.stringify({ requestId, name: "Guest", type: "wish", message: "Love" }) });
  let settled = false; pending.then(() => { settled = true; });
  const frame = d.nodes[0]; const channel = new URL(frame.src).searchParams.get("channel");
  const envelope = { kind: "ploy-nan-wedding", version: 2, channel, requestId, phase: "challenge", result: { ok: true, token: "test-token" } };
  d.message(envelope, "https://evil.example"); d.message({ ...envelope, channel: randomUUID() });
  assert.equal(d.sent.length, 0);
  d.message(envelope); d.message(envelope);
  assert.equal(d.sent.length, 1); assert.equal(d.sent[0].token, "test-token");
  assert(!frame.src.includes("Guest")); assert(!frame.src.includes("Love"));
  await Promise.resolve(); assert.equal(settled, false);
  d.message({ ...envelope, phase: "result", result: { ok: true, requestId: randomUUID() } });
  await Promise.resolve(); assert.equal(settled, false);
  d.message({ ...envelope, phase: "result", result: { ok: true, requestId } });
  assert.equal((await (await pending).json()).requestId, requestId);
  assert.equal(d.nodes.length, 0); assert.equal(d.listeners.size, 0);
});

test("server failures resolve as failed HTTP status and abort removes iframe/listeners", async () => {
  for (const abort of [false, true]) {
    const d = dom(); const requestId = randomUUID(); const controller = new AbortController();
    const p = submitToAppsScript("/api/wedding", { body: JSON.stringify({ requestId }), signal: controller.signal });
    if (abort) { controller.abort(); await assert.rejects(p, { name: "AbortError" }); }
    else {
      const channel = new URL(d.nodes[0].src).searchParams.get("channel");
      d.message({ kind: "ploy-nan-wedding", version: 2, channel, requestId, phase: "challenge", result: { ok: false, code: "NOT_CONFIGURED" } });
      assert.equal((await p).ok, false);
    }
    assert.equal(d.nodes.length, 0); assert.equal(d.listeners.size, 0);
  }
});
