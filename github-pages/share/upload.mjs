import { PHOTO_SCRIPT_URL, SITE_ORIGIN } from "./config.mjs";

function isGoogleScriptOrigin(origin) {
  try {
    const url = new URL(origin);
    return url.origin === origin && url.protocol === "https:" && !url.port &&
      (url.hostname === "script.google.com" || url.hostname === "script.googleusercontent.com" ||
       /^[a-z0-9-]+-script\.googleusercontent\.com$/.test(url.hostname));
  } catch { return false; }
}

export function submitMedia(payload, onPhase = () => {}) {
  return new Promise((resolve, reject) => {
    if (window.location.origin !== SITE_ORIGIN) {
      reject(new Error("โหมด Preview ใช้ตรวจหน้าจอและการเลือกไฟล์ได้ การส่งจริงจะเปิดใช้งานบน julnual.github.io ค่ะ"));
      return;
    }
    if (!payload || !/^[a-f0-9-]{36}$/i.test(payload.requestId || "")) {
      reject(new Error("ข้อมูลไฟล์ไม่ถูกต้อง กรุณาเลือกใหม่อีกครั้งค่ะ"));
      return;
    }

    const channel = crypto.randomUUID();
    const frame = document.createElement("iframe");
    frame.name = `wedding-photo-${channel}`;
    frame.title = "ช่องทางส่งรูปและวิดีโอ";
    frame.hidden = true;
    frame.setAttribute("aria-hidden", "true");
    frame.tabIndex = -1;
    let phase = "challenge";
    let finished = false;
    let form;
    const timer = setTimeout(() => finish(new Error("ยังยืนยันการบันทึกรูปไม่ได้ กรุณาลองส่งอีกครั้งโดยไม่ต้องเลือกภาพใหม่ค่ะ")), 180000);

    function cleanup() {
      clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      form?.remove();
      frame.remove();
    }
    function finish(error, result) {
      if (finished) return;
      finished = true;
      cleanup();
      if (error) reject(error);
      else if (result?.ok) resolve(result);
      else reject(new Error(errorMessage(result?.code)));
    }
    function onMessage(event) {
      const message = event.data;
      if (!isGoogleScriptOrigin(event.origin) || !message || message.kind !== "ploy-nan-photo" ||
          message.version !== 1 || message.channel !== channel || message.requestId !== payload.requestId ||
          message.phase !== phase || !message.result || typeof message.result.ok !== "boolean") return;

      if (!message.result.ok) { finish(null, message.result); return; }
      if (phase === "result") {
        if (message.result.requestId === payload.requestId) finish(null, message.result);
        return;
      }
      if (typeof message.result.token !== "string" || message.result.token.length > 200) return;

      phase = "result";
      onPhase("uploading");
      try {
        form = document.createElement("form");
        form.method = "POST";
        form.action = PHOTO_SCRIPT_URL;
        form.target = frame.name;
        form.hidden = true;
        const fields = {
          payload: JSON.stringify(payload),
          origin: SITE_ORIGIN,
          channel,
          requestId: payload.requestId,
          token: message.result.token,
          website: "",
        };
        for (const [name, value] of Object.entries(fields)) {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = name;
          input.value = value;
          form.appendChild(input);
        }
        document.body.appendChild(form);
        form.submit();
        form.remove();
      } catch {
        finish(new Error("ส่งไฟล์ไม่สำเร็จ กรุณาลองอีกครั้งค่ะ"));
      }
    }

    window.addEventListener("message", onMessage);
    const challenge = new URL(PHOTO_SCRIPT_URL);
    challenge.search = new URLSearchParams({
      mode: "challenge",
      origin: SITE_ORIGIN,
      channel,
      requestId: payload.requestId,
    }).toString();
    onPhase("connecting");
    frame.src = challenge.href;
    document.body.appendChild(frame);
  });
}

function errorMessage(code) {
  const messages = {
    PHOTO_NOT_CONFIGURED: "ระบบรับรูปยังตั้งค่าไม่ครบ กรุณาแจ้ง PLOY & NAN ค่ะ",
    INVALID_FIELDS: "ไฟล์ไม่ผ่านการตรวจสอบ กรุณาเลือกใหม่ค่ะ",
    TOKEN_EXPIRED: "ใช้เวลาส่งนานเกินไป กรุณาลองอีกครั้งค่ะ",
    RATE_LIMITED: "มีผู้ส่งรูปพร้อมกันจำนวนมาก กรุณารอสักครู่แล้วลองใหม่ค่ะ",
    BUSY_RETRY: "ระบบกำลังบันทึกรูปอื่นอยู่ กรุณาลองอีกครั้งค่ะ",
    SAVE_FAILED: "บันทึกไฟล์ไม่สำเร็จ กรุณาลองอีกครั้งค่ะ",
  };
  return messages[code] || "ส่งไฟล์ไม่สำเร็จ กรุณาลองอีกครั้งค่ะ";
}
