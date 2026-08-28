import test from "node:test";
import assert from "node:assert/strict";
// @ts-ignore Node's native test runner resolves the source extension.
import { validateResponse, receiveResponse } from "../lib/wedding-responses.ts";
const payload = { type: "rsvp", name: "แขกทดสอบ", attendance: "yes", guestCount: 2, requestId: "aabbccdd-1122-3344-5566-77889900aabb" };
const origin = "https://ploy-nan-in-full-bloom.p-julnual.chatgpt.site";
const config = { WEDDING_SHEETS_URL: "https://script.google.com/macros/s/test/exec", WEDDING_API_KEY: "unit-test-only" };
function request(data: unknown = payload, from = origin) { return new Request(origin + "/api/wedding", { method: "POST", headers: { "Content-Type": "application/json", Origin: from }, body: JSON.stringify(data) }); }
test("accepts RSVP and wishes, strips untrusted fields", () => {
  assert.equal("apiKey" in validateResponse({ ...payload, apiKey: "attacker" }), false);
  assert.equal(validateResponse({ ...payload, type: "wish", message: "ยินดีด้วยค่ะ" }).message, "ยินดีด้วยค่ะ");
});
test("rejects whitespace, oversized text and invalid counts", () => {
  for (const invalid of [{ ...payload, name: "  " }, { ...payload, guestCount: 0 }, { ...payload, guestCount: 1.2 }, { ...payload, guestCount: 21 }, { ...payload, attendance: "no" }, { ...payload, requestId: "x" }, { ...payload, type: "wish", message: "x".repeat(2001) }]) assert.throws(() => validateResponse(invalid));
  assert.equal(validateResponse({ ...payload, attendance: "no", guestCount: 0 }).guestCount, 0);
});
test("blocks foreign origins and missing configuration without sending", async () => {
  const never = async () => { throw new Error("must not call"); };
  assert.equal((await receiveResponse(request(payload, "https://other.example"), config, never)).status, 403);
  assert.equal((await receiveResponse(request(), {}, never)).status, 503);
});
test("server injects secret; only matching confirmed success is accepted", async () => {
  const transport = async (_url: unknown, init?: RequestInit) => { const data = JSON.parse(init?.body as string); assert.equal(data.apiKey, config.WEDDING_API_KEY); return Response.json({ ok: true, requestId: payload.requestId }); };
  const response = await receiveResponse(request(), config, transport);
  assert.equal(response.status, 200); assert.equal((await response.text()).includes(config.WEDDING_API_KEY), false);
  for (const upstream of [{ok:false,code:"UNAUTHORIZED"},{ok:true,requestId:"wrong"},{ok:false}]) {
    const result = await receiveResponse(request(), config, async () => Response.json(upstream)); assert.ok(result.status >= 500);
  }
});
test("network errors and HTML login pages never produce success", async () => {
  assert.equal((await receiveResponse(request(), config, async () => { throw new Error("timeout"); })).status, 502);
  assert.equal((await receiveResponse(request(), config, async () => new Response("<html>Login</html>"))).status, 502);
});
test("limits request body before forwarding", async () => { assert.equal((await receiveResponse(request({name:"x".repeat(17000)}), config)).status, 413); });
