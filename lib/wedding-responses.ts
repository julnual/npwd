export interface WeddingConfig { WEDDING_SHEETS_URL?: string; WEDDING_API_KEY?: string }
type Payload = { type: "rsvp" | "wish"; requestId: string; name: string; attendance?: "yes" | "no"; guestCount?: number; note?: string; message?: string };
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
function clean(value: unknown, limit: number, required = true): string {
  if (value === undefined && !required) return "";
  if (typeof value !== "string") throw new Error("INVALID_FIELDS");
  const result = value.trim();
  if ((required && !result) || result.length > limit || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(result)) throw new Error("INVALID_FIELDS");
  return result;
}
export function validateResponse(value: unknown): Payload {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("INVALID_FIELDS");
  const data = value as Record<string, unknown>;
  if (typeof data.requestId !== "string" || !uuid.test(data.requestId)) throw new Error("INVALID_FIELDS");
  const base = { requestId: data.requestId, name: clean(data.name, 100) };
  if (data.type === "wish") return { ...base, type: "wish", message: clean(data.message, 2000) };
  if (data.type !== "rsvp" || (data.attendance !== "yes" && data.attendance !== "no")) throw new Error("INVALID_FIELDS");
  const count = data.guestCount;
  if (typeof count !== "number" || !Number.isInteger(count) || (data.attendance === "yes" ? count < 1 || count > 20 : count !== 0)) throw new Error("INVALID_FIELDS");
  return { ...base, type: "rsvp", attendance: data.attendance, guestCount: count, note: clean(data.note, 500, false) };
}
const reply = (data: object, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
export async function receiveResponse(request: Request, config: WeddingConfig, fetcher: typeof fetch = fetch) {
  const origin = request.headers.get("origin");
  const permitted = [new URL(request.url).origin, "https://ploy-nan-in-full-bloom.p-julnual.chatgpt.site"];
  if (!origin || !permitted.includes(origin)) return reply({ ok: false, code: "FORBIDDEN" }, 403);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return reply({ ok: false, code: "INVALID_REQUEST" }, 415);
  let payload: Payload;
  try {
    const reader = request.body?.getReader();
    if (!reader) throw new Error("INVALID_REQUEST");
    const chunks: Uint8Array[] = []; let total = 0;
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      total += value.byteLength;
      if (total > 16000) { await reader.cancel(); return reply({ ok: false }, 413); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(total); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    payload = validateResponse(JSON.parse(new TextDecoder().decode(bytes)));
  } catch { return reply({ ok: false }, 400); }
  if (!config.WEDDING_API_KEY || !config.WEDDING_SHEETS_URL || !/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(config.WEDDING_SHEETS_URL)) return reply({ ok: false, code: "NOT_CONFIGURED" }, 503);
  try {
    const response = await fetcher(config.WEDDING_SHEETS_URL, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, apiKey: config.WEDDING_API_KEY }),
      redirect: "follow", signal: AbortSignal.timeout(25000),
    });
    const result = await response.json() as { ok?: boolean; requestId?: string; code?: string };
    if (response.ok && result.ok === true && result.requestId === payload.requestId) return reply({ ok: true, requestId: payload.requestId });
    const needsSetup = ["UNAUTHORIZED", "NOT_CONFIGURED", "SHEET_NOT_READY"].includes(result.code || "");
    return reply({ ok: false, code: needsSetup ? "NOT_CONFIGURED" : "SAVE_FAILED" }, needsSetup ? 503 : 502);
  } catch { return reply({ ok: false, code: "SAVE_FAILED" }, 502); }
}
