import { SCRIPT_URL, SITE_ORIGIN } from "./config.mjs";

export function isGoogleScriptOrigin(origin) {
  try {
    const url = new URL(origin);
    return url.origin === origin && url.protocol === "https:" && !url.port &&
      (url.hostname === "script.google.com" || url.hostname === "script.googleusercontent.com" ||
       /^[a-z0-9-]+-script\.googleusercontent\.com$/.test(url.hostname));
  } catch { return false; }
}

// Native form navigation + explicit acknowledgement avoids both CORS errors
// and the false success caused by fetch(..., { mode: 'no-cors' }).
export function submitToAppsScript(_url, options) {
  return new Promise((resolve, reject) => {
    if (window.location.origin !== SITE_ORIGIN) {
      reject(new Error("กรุณาเปิดแบบฟอร์มจากเว็บไซต์ julnual.github.io ค่ะ")); return;
    }
    if (options.signal?.aborted) { reject(options.signal.reason); return; }
    let data;
    try { data = JSON.parse(options.body); } catch { reject(new Error("ข้อมูลแบบฟอร์มไม่ถูกต้อง")); return; }
    if (!data || !/^[a-f0-9-]{36}$/i.test(data.requestId || "")) {
      reject(new Error("ข้อมูลแบบฟอร์มไม่ถูกต้อง")); return;
    }
    const channel = crypto.randomUUID();
    const frame = document.createElement("iframe");
    frame.name = `wedding-${channel}`;
    frame.title = "ช่องทางส่งแบบฟอร์ม";
    frame.hidden = true;
    frame.setAttribute("aria-hidden", "true");
    frame.tabIndex = -1;
    let phase = "challenge";
    let finished = false;
    let form;
    const timer = setTimeout(() => finish(new Error("ยังยืนยันการบันทึกไม่ได้ กรุณาลองส่งอีกครั้ง ข้อมูลที่กรอกยังอยู่ค่ะ")), 60000);
    function cleanup() {
      clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      options.signal?.removeEventListener("abort", onAbort);
      form?.remove();
      frame.remove();
    }
    function finish(error, result) {
      if (finished) return;
      finished = true;
      cleanup();
      if (error) reject(error);
      else resolve(new Response(JSON.stringify(result), {
        status: result.ok === true ? 200 : 400,
        headers: { "Content-Type": "application/json" },
      }));
    }
    function onAbort() { finish(options.signal.reason || new DOMException("Aborted", "AbortError")); }
    function onMessage(event) {
      // HtmlService has a nested Google frame, so event.source is not the
      // outer iframe. Check Google's origin AND two unpredictable correlation IDs.
      const msg = event.data;
      if (!isGoogleScriptOrigin(event.origin) || !msg || msg.kind !== "ploy-nan-wedding" ||
          msg.version !== 2 || msg.channel !== channel || msg.requestId !== data.requestId ||
          msg.phase !== phase || !msg.result || typeof msg.result.ok !== "boolean") return;
      if (msg.result.ok === false) { finish(null, msg.result); return; }
      if (phase === "result") {
        if (msg.result.requestId === data.requestId) finish(null, msg.result);
        return;
      }
      if (typeof msg.result.token !== "string" || msg.result.token.length > 200) return;
      phase = "result";
      try {
        form = document.createElement("form");
        form.method = "POST";
        form.action = SCRIPT_URL;
        form.target = frame.name;
        form.hidden = true;
        const fields = { payload: options.body, origin: SITE_ORIGIN, channel,
          requestId: data.requestId, token: msg.result.token, website: "" };
        for (const [name, value] of Object.entries(fields)) {
          const input = document.createElement("input");
          input.type = "hidden"; input.name = name; input.value = value;
          form.appendChild(input);
        }
        document.body.appendChild(form);
        form.submit();
        form.remove();
      } catch { finish(new Error("ส่งข้อมูลไม่สำเร็จ กรุณาลองอีกครั้งค่ะ")); }
    }
    window.addEventListener("message", onMessage);
    options.signal?.addEventListener("abort", onAbort, { once: true });
    const challenge = new URL(SCRIPT_URL);
    challenge.search = new URLSearchParams({ mode: "challenge", origin: SITE_ORIGIN, channel, requestId: data.requestId }).toString();
    frame.src = challenge.href;
    try { document.body.appendChild(frame); } catch (error) { finish(error); }
  });
}
