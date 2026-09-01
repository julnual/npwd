import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { createHmac, randomUUID } from "node:crypto";

const source = readFileSync(new URL("../../apps-script/Code.gs", import.meta.url), "utf8");
const origin = "https://julnual.github.io";
const key = "test-only-secret-never-a-production-key";
function fixture() {
  let now = 1790000000000;
  let locked = false;
  let available = true;
  const cache = {};
  const props = { WEDDING_API_KEY: key, WEDDING_SPREADSHEET_ID: "fake-sheet-id" };
  const tabs = {};
  const output = value => ({ value, setMimeType() { return this; }, setXFrameOptionsMode() { return this; } });
  const context = vm.createContext({
    Date: class extends Date { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] ?? null, setProperties: p => Object.assign(props, p) }) },
    LockService: { getScriptLock: () => ({ tryLock: () => { locked = available; return available; }, releaseLock: () => { locked = false; } }) },
    Utilities: { getUuid: randomUUID, formatDate: () => "2026-09-21 00:00:00",
      computeHmacSha256Signature: (message, secret) => createHmac("sha256", secret).update(message).digest(),
      base64EncodeWebSafe: bytes => Buffer.from(bytes).toString("base64url") },
    CacheService: { getScriptCache: () => ({ get: k => cache[k] ?? null, put: (k, v) => { cache[k] = v; } }) },
    ContentService: { createTextOutput: output, MimeType: { JSON: "json", JAVASCRIPT: "javascript" } },
    HtmlService: { createHtmlOutput: output, XFrameOptionsMode: { ALLOWALL: "allowall" } },
    SpreadsheetApp: { openById: id => { assert.equal(id, "fake-sheet-id"); return { getSheetByName: name => tabs[name] }; }, flush() {} },
  });
  vm.runInContext(source, context);
  for (const [name, headers] of Object.entries(context.WEDDING_HEADERS)) {
    const rows = [Array.from(headers)];
    tabs[name] = { rows, getLastRow: () => rows.length,
      getRange(row, col, count, width) {
        return {
          getValues: () => rows.slice(row - 1, row - 1 + count).map(r => r.slice(col - 1, col - 1 + width)),
          getDisplayValues: () => rows.slice(row - 1, row - 1 + count).map(r => r.slice(col - 1, col - 1 + width).map(String)),
          setValues(values) { values.forEach((r, i) => { rows[row - 1 + i] = Array.from(r, v => typeof v === "string" && /^'[=+@-]/.test(v) ? v.slice(1) : v); }); },
          createTextFinder(id) { return { matchEntireCell() { return this; }, matchCase() { return this; }, useRegularExpression() { return this; },
            findNext() { const idx = rows.findIndex((r, i) => i >= row - 1 && r[col - 1] === id); return idx < 0 ? null : { getRow: () => idx + 1 }; } }; },
        };
      },
    };
  }
  function decode(out) {
    if (!out.value.startsWith("<!doctype")) return JSON.parse(out.value);
    const call = out.value.match(/window\.top\.postMessage\((.*)\);<\/script>/)[1];
    let envelope;
    vm.runInNewContext(`window.top.postMessage(${call})`, { window: { top: { postMessage: (message, target) => { assert.equal(target, origin); envelope = message; } } } });
    return JSON.parse(JSON.stringify(envelope));
  }
  const data = overrides => ({ type: "rsvp", name: "ทดสอบ", attendance: "yes", guestCount: 2, note: "", requestId: randomUUID(), ...overrides });
  function challenge(payload, overrides = {}) {
    const p = { mode: "challenge", origin, channel: randomUUID(), requestId: payload.requestId, ...overrides };
    const out = context.doGet({ parameter: p });
    return { p, out, reply: decode(out) };
  }
  function post(payload, issued = challenge(payload), overrides = {}) {
    const p = { ...issued.p, token: issued.reply.result?.token, payload: JSON.stringify(payload), ...overrides };
    const raw = new URLSearchParams(p).toString();
    return decode(context.doPost({ parameter: p, postData: { type: "application/x-www-form-urlencoded", contents: raw } }));
  }
  const privatePost = payload => decode(context.doPost({ postData: { type: "application/json", contents: JSON.stringify({ ...payload, apiKey: key }) } }));
  return { context, props, tabs, decode, data, challenge, post, privatePost,
    advance: ms => { now += ms; }, denyLock: () => { available = false; }, locked: () => locked };
}

test("health and challenge contain no secret or Sheet ID", () => {
  const f = fixture();
  assert.equal(f.decode(f.context.doGet({})).ready, true);
  const c = f.challenge(f.data());
  assert.equal(c.reply.result.ok, true);
  assert(!c.out.value.includes(key)); assert(!c.out.value.includes("fake-sheet-id"));
});
test("RSVP, nonattendance, and wishes append to original tabs; locks release", () => {
  const f = fixture();
  for (const payload of [f.data(), f.data({ attendance: "no", guestCount: 0 }), f.data({ type: "wish", message: "ยินดีด้วยค่ะ" })]) {
    assert.equal(f.post(payload).result.requestId, payload.requestId);
  }
  assert.equal(f.tabs.RSVP.rows.length, 3); assert.equal(f.tabs.Wishes.rows.length, 2);
  assert.equal(f.tabs.RSVP.rows[2][4], 0); assert.equal(f.locked(), false);
});
test("public wishes feed returns message text only and never exposes names or metadata", () => {
  const f = fixture();
  const first = f.data({ type: "wish", name: "ผู้ส่งลับ", message: "ขอให้มีความสุขมาก ๆ" });
  const second = f.data({ type: "wish", name: "อีกคน", message: "รักกันตลอดไปนะ" });
  assert.equal(f.privatePost(first).ok, true); assert.equal(f.privatePost(second).ok, true);
  const callback = "__ployNanWishes_0123456789abcdef0123456789abcdef";
  const out = f.context.doGet({ parameter: { mode: "wishes", callback } }).value;
  assert(out.startsWith(`${callback}(`));
  assert(!out.includes("ผู้ส่งลับ")); assert(!out.includes("อีกคน"));
  assert(!out.includes(first.requestId)); assert(!out.includes("2026-09-21"));
  const payload = JSON.parse(out.slice(callback.length + 1, -2));
  assert.deepEqual(Array.from(payload.wishes), ["รักกันตลอดไปนะ", "ขอให้มีความสุขมาก ๆ"]);
});
test("idempotent retries and conflicting payloads", () => {
  const f = fixture(); const d = f.data();
  assert.equal(f.post(d).result.ok, true);
  assert.equal(f.post(d).result.duplicate, true);
  assert.equal(f.post({ ...d, guestCount: 3 }).result.code, "REQUEST_CONFLICT");
  assert.equal(f.tabs.RSVP.rows.length, 2);
});
test("formula escaping remains idempotent after Sheets strips apostrophe", () => {
  const f = fixture(); const d = f.data({ name: "=SUM(1,2)", note: "@unsafe" });
  assert.equal(f.context.validate_(d).values[0], "'=SUM(1,2)");
  assert.equal(f.post(d).result.ok, true); assert.equal(f.post(d).result.duplicate, true);
});
test("legacy private JSON receiver remains compatible and requires key", () => {
  const f = fixture(); const d = f.data();
  assert.equal(f.privatePost(d).ok, true);
  assert.equal(f.decode(f.context.doPost({ postData: { contents: JSON.stringify(d), type: "application/json" } })).code, "UNAUTHORIZED");
});
test("invalid origins, UUIDs, and unconfigured deployments reject", () => {
  const f = fixture(); const d = f.data();
  assert.equal(f.challenge(d, { origin: "https://evil.example" }).reply.code, "INVALID_REQUEST");
  assert.equal(f.challenge(d, { channel: "bad" }).reply.code, "INVALID_REQUEST");
  delete f.props.WEDDING_API_KEY;
  assert.equal(f.challenge(d).reply.result.code, "NOT_CONFIGURED");
});
test("signed token binds channel/requestId and rejects tampering, expiry and future issue", () => {
  const f = fixture(); const d = f.data(); const c = f.challenge(d);
  for (const p of [{ channel: randomUUID() }, { requestId: randomUUID() }, { token: c.reply.result.token + "x" }]) {
    assert.equal(f.post(d, c, p).result.code, "TOKEN_EXPIRED");
  }
  f.advance(-1); assert.equal(f.post(d, c).result.code, "TOKEN_EXPIRED");
  f.advance(120002); assert.equal(f.post(d, c).result.code, "TOKEN_EXPIRED");
  assert.equal(f.tabs.RSVP.rows.length, 1);
});
test("invalid fields, mismatched IDs and honeypot never write", () => {
  const f = fixture();
  for (const values of [{ name: " " }, { name: "a".repeat(101) }, { guestCount: 21 }, { guestCount: 1.5 },
    { attendance: "no", guestCount: 1 }, { note: "\u0001" }, { type: "wish", message: "a".repeat(2001) }]) {
    assert.equal(f.post(f.data(values)).result.code, "INVALID_FIELDS");
  }
  const d = f.data(); const c = f.challenge(d);
  assert.equal(f.post(d, c, { website: "spam" }).result.code, "INVALID_REQUEST");
  assert.equal(f.post({ ...d, requestId: randomUUID() }, c).result.code, "INVALID_REQUEST");
  assert.equal(f.tabs.RSVP.rows.length, 1);
});
test("rate limit persists; duplicate acknowledgements and private path still work", () => {
  const f = fixture(); f.context.WEDDING_PUBLIC_PER_MINUTE = 2;
  const d = f.data(); f.post(d); f.post(f.data());
  assert.equal(f.post(f.data()).result.code, "RATE_LIMITED");
  assert.equal(f.post(d).result.duplicate, true); assert.equal(f.privatePost(f.data()).ok, true);
  f.advance(60000); assert.equal(f.post(f.data()).result.ok, true);
  assert.equal(f.props.WEDDING_API_KEY, key);
});
test("wrong headers, missing tabs and lock contention do not overwrite data", () => {
  for (const state of ["header", "missing", "lock"]) {
    const f = fixture();
    if (state === "header") f.tabs.RSVP.rows[0][0] = "Unexpected";
    if (state === "missing") delete f.tabs.RSVP;
    if (state === "lock") f.denyLock();
    assert.equal(f.post(f.data()).result.ok, false);
    if (f.tabs.RSVP) assert.equal(f.tabs.RSVP.rows.length, 1);
    assert.equal(f.locked(), false);
  }
});
