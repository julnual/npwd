import { submitMedia } from "./upload.mjs";

const MAX_PHOTOS = 5;
const MAX_SOURCE_BYTES = 25 * 1024 * 1024;
const MAX_VIDEO_BYTES = 25 * 1024 * 1024;
const MAX_VIDEO_SECONDS = 30;
const MAX_EDGE = 1600;
const TARGET_BYTES = 1.6 * 1024 * 1024;
const VIDEO_MIME_TYPES = new Set(["video/mp4", "video/quicktime", "video/webm"]);
const IS_SAFE_PREVIEW = window.location.hostname === "ploy-nan-in-full-bloom.p-julnual.chatgpt.site";

const form = document.querySelector("#photo-form");
const input = document.querySelector("#photo-input");
const dropZone = document.querySelector("#drop-zone");
const previewGrid = document.querySelector("#preview-grid");
const summary = document.querySelector("#selection-summary");
const count = document.querySelector("#selection-count");
const chooseAgain = document.querySelector("#choose-again");
const submitButton = document.querySelector("#submit-button");
const errorBox = document.querySelector("#file-error");
const progressPanel = document.querySelector("#progress-panel");
const progressLabel = document.querySelector("#progress-label");
const progressValue = document.querySelector("#progress-value");
const progressBar = document.querySelector("#progress-bar");
const progressTrack = progressPanel.querySelector("[role=progressbar]");
const successPanel = document.querySelector("#success-panel");
const successCopy = document.querySelector("#success-copy");
const sendMore = document.querySelector("#send-more");
const previewNotice = document.querySelector("#preview-notice");

let selected = [];
let busy = false;

if (IS_SAFE_PREVIEW) previewNotice.hidden = false;

input.addEventListener("change", () => { void setFiles([...input.files]); });
chooseAgain.addEventListener("click", () => input.click());
sendMore.addEventListener("click", resetForm);

for (const eventName of ["dragenter", "dragover"]) {
  dropZone.addEventListener(eventName, event => {
    event.preventDefault();
    if (!busy) dropZone.classList.add("is-dragging");
  });
}
for (const eventName of ["dragleave", "drop"]) {
  dropZone.addEventListener(eventName, event => {
    event.preventDefault();
    dropZone.classList.remove("is-dragging");
  });
}
dropZone.addEventListener("drop", event => {
  if (!busy) void setFiles([...event.dataTransfer.files]);
});

previewGrid.addEventListener("click", event => {
  const button = event.target.closest("[data-remove]");
  if (!button || busy) return;
  const index = Number(button.dataset.remove);
  URL.revokeObjectURL(selected[index].previewUrl);
  selected.splice(index, 1);
  renderSelection();
});

form.addEventListener("submit", async event => {
  event.preventDefault();
  if (!selected.length || busy) return;
  busy = true;
  setError("");
  setControlsDisabled(true);
  progressPanel.hidden = false;
  const batchId = crypto.randomUUID();
  let completed = 0;

  try {
    for (let index = 0; index < selected.length; index += 1) {
      const item = selected[index];
      const position = index + 1;
      const mediaName = item.kind === "video" ? "วิดีโอ" : "รูป";
      updateProgress(Math.round((index / selected.length) * 92), `กำลังเตรียม${mediaName}ที่ ${position} จาก ${selected.length}…`);
      if (!item.prepared) item.prepared = item.kind === "video" ? await prepareVideo(item) : await preparePhoto(item.file);
      if (!item.requestId) item.requestId = crypto.randomUUID();

      updateProgress(Math.round(((index + 0.18) / selected.length) * 92), `กำลังเชื่อมต่อเพื่อส่ง${mediaName}ที่ ${position} จาก ${selected.length}…`);
      const payload = {
        type: item.kind,
        requestId: item.requestId,
        batchId,
        originalName: item.file.name || (item.kind === "video" ? `video-${position}.mp4` : `photo-${position}.jpg`),
        mimeType: item.prepared.mimeType,
        byteSize: item.prepared.byteSize,
        width: item.prepared.width,
        height: item.prepared.height,
        durationSeconds: item.prepared.durationSeconds || 0,
        dataBase64: item.prepared.base64,
      };
      const send = IS_SAFE_PREVIEW ? simulatePreviewUpload : submitMedia;
      await send(payload, phase => {
        const fraction = phase === "uploading" ? 0.75 : 0.3;
        updateProgress(Math.round(((index + fraction) / selected.length) * 92), `กำลังส่ง${mediaName}ที่ ${position} จาก ${selected.length}…`);
      });
      completed += 1;
      updateProgress(Math.round((completed / selected.length) * 92), `ส่งแล้ว ${completed} จาก ${selected.length} ไฟล์`);
    }

    const sentLabel = selected[0]?.kind === "video" ? "วิดีโอ" : "รูป";
    updateProgress(100, `ส่ง${sentLabel}สำเร็จ`);
    successCopy.textContent = `ขอบคุณที่ร่วมแบ่งปันความทรงจำดี ๆ ให้เรา ได้รับแล้ว ${completed} ${sentLabel}`;
    await new Promise(resolve => setTimeout(resolve, 350));
    form.hidden = true;
    successPanel.hidden = false;
    successPanel.focus();
    clearSelected();
  } catch (error) {
    // Keep request IDs and prepared data so a retry is idempotent after an uncertain timeout.
    setError(completed
      ? `ส่งสำเร็จแล้ว ${completed} ไฟล์ แต่ไฟล์ที่เหลือยังไม่สำเร็จ: ${error.message}`
      : error.message);
    updateProgress(Math.round((completed / selected.length) * 92), "การส่งหยุดชั่วคราว");
  } finally {
    busy = false;
    setControlsDisabled(false);
  }
});

async function simulatePreviewUpload(payload, onPhase) {
  // The private preview demonstrates the complete interaction without sending
  // media bytes to Apps Script, Google Drive, Google Sheets, or any other server.
  void payload;
  onPhase("connecting");
  await new Promise(resolve => setTimeout(resolve, 350));
  onPhase("uploading");
  await new Promise(resolve => setTimeout(resolve, 650));
  return { ok: true, preview: true };
}

async function setFiles(files) {
  setError("");
  const supported = files.filter(file => mediaKind(file));
  if (supported.length !== files.length) {
    clearSelected();
    renderSelection();
    setError("รองรับเฉพาะไฟล์รูปภาพ หรือวิดีโอ MP4, MOV และ WEBM ค่ะ");
    input.value = "";
    return;
  }
  const videos = supported.filter(file => mediaKind(file) === "video");
  const images = supported.filter(file => mediaKind(file) === "photo");
  if (videos.length) {
    if (videos.length !== 1 || images.length) {
      clearSelected();
      renderSelection();
      setError("กรุณาเลือกวิดีโอครั้งละ 1 ไฟล์ โดยไม่เลือกรวมกับรูปค่ะ");
      input.value = "";
      return;
    }
    const file = videos[0];
    if (file.size > MAX_VIDEO_BYTES) {
      clearSelected();
      renderSelection();
      setError("วิดีโอต้องมีขนาดไม่เกิน 25 MB ค่ะ");
      input.value = "";
      return;
    }
    clearSelected();
    const previewUrl = URL.createObjectURL(file);
    try {
      const metadata = await readVideoMetadata(previewUrl);
      if (metadata.durationSeconds > MAX_VIDEO_SECONDS + 0.05) {
        URL.revokeObjectURL(previewUrl);
        setError("วิดีโอต้องมีความยาวไม่เกิน 30 วินาทีค่ะ");
        input.value = "";
        renderSelection();
        return;
      }
      selected = [{ file, kind: "video", previewUrl, ...metadata }];
    } catch {
      URL.revokeObjectURL(previewUrl);
      setError("ไม่สามารถอ่านวิดีโอนี้ได้ กรุณาเลือกไฟล์ MP4, MOV หรือ WEBM ใหม่ค่ะ");
    }
    input.value = "";
    renderSelection();
    return;
  }
  if (images.some(file => file.size > MAX_SOURCE_BYTES)) {
    setError("รูปแต่ละไฟล์ต้องมีขนาดไม่เกิน 25 MB ค่ะ");
    input.value = "";
    return;
  }
  if (images.length > MAX_PHOTOS) setError("เลือกได้สูงสุด 5 รูปต่อครั้ง ระบบเลือก 5 รูปแรกให้แล้วค่ะ");
  clearSelected();
  selected = images.slice(0, MAX_PHOTOS).map(file => ({ file, kind: "photo", previewUrl: URL.createObjectURL(file) }));
  input.value = "";
  renderSelection();
}

function renderSelection() {
  previewGrid.replaceChildren(...selected.map((item, index) => {
    const card = document.createElement("div");
    card.className = "preview-item";
    const media = document.createElement(item.kind === "video" ? "video" : "img");
    media.src = item.previewUrl;
    if (item.kind === "video") {
      media.controls = true;
      media.playsInline = true;
      media.preload = "metadata";
      media.setAttribute("aria-label", "วิดีโอที่เลือก");
    } else {
      media.alt = `รูปที่เลือก ${index + 1}`;
    }
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "remove-photo";
    remove.dataset.remove = String(index);
    remove.setAttribute("aria-label", `ลบ${item.kind === "video" ? "วิดีโอ" : "รูป"}ที่ ${index + 1}`);
    remove.textContent = "×";
    card.append(media, remove);
    return card;
  }));
  previewGrid.classList.toggle("has-video", selected[0]?.kind === "video");
  summary.hidden = selected.length === 0;
  count.textContent = selected[0]?.kind === "video"
    ? `เลือกวิดีโอแล้ว 1 ไฟล์ · ${formatBytes(selected[0].file.size)} · ${formatDuration(selected[0].durationSeconds)}`
    : `เลือกแล้ว ${selected.length}/${MAX_PHOTOS} รูป`;
  submitButton.disabled = selected.length === 0 || busy;
}

function mediaKind(file) {
  if (file.type.startsWith("image/")) return "photo";
  const mimeType = normalizedVideoMime(file);
  return VIDEO_MIME_TYPES.has(mimeType) ? "video" : "";
}

function normalizedVideoMime(file) {
  if (VIDEO_MIME_TYPES.has(file.type)) return file.type;
  const extension = (file.name.split(".").pop() || "").toLowerCase();
  return { mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm" }[extension] || "";
}

function readVideoMetadata(url) {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const durationSeconds = Number(video.duration);
      const width = Number(video.videoWidth);
      const height = Number(video.videoHeight);
      if (!Number.isFinite(durationSeconds) || durationSeconds <= 0 || !width || !height) reject(new Error("Invalid video metadata"));
      else resolve({ durationSeconds, width, height });
      video.removeAttribute("src");
      video.load();
    };
    video.onerror = () => reject(new Error("Video metadata failed"));
    video.src = url;
  });
}

function prepareVideo(item) {
  return blobToBase64(item.file).then(base64 => ({
    mimeType: normalizedVideoMime(item.file),
    byteSize: item.file.size,
    width: item.width,
    height: item.height,
    durationSeconds: Math.round(item.durationSeconds * 10) / 10,
    base64,
  }));
}

function formatBytes(bytes) {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`;
}

function formatDuration(seconds) {
  return `${Math.ceil(seconds)} วินาที`;
}

async function preparePhoto(file) {
  const image = await loadImage(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: false });
  context.fillStyle = "#fffdf9";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  image.close?.();

  let quality = 0.84;
  let blob = await canvasBlob(canvas, quality);
  while (blob.size > TARGET_BYTES && quality > 0.56) {
    quality -= 0.08;
    blob = await canvasBlob(canvas, quality);
  }
  return {
    mimeType: "image/jpeg",
    byteSize: blob.size,
    width,
    height,
    base64: await blobToBase64(blob),
  };
}

async function loadImage(file) {
  if ("createImageBitmap" in window) {
    try { return await createImageBitmap(file, { imageOrientation: "from-image" }); } catch { /* Safari fallback below. */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function canvasBlob(canvas, quality) {
  return new Promise((resolve, reject) => canvas.toBlob(
    blob => blob ? resolve(blob) : reject(new Error("ไม่สามารถบีบอัดรูปนี้ได้ กรุณาเลือกไฟล์ JPG หรือ PNG ค่ะ")),
    "image/jpeg",
    quality,
  ));
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = () => reject(new Error("อ่านไฟล์รูปไม่สำเร็จ กรุณาเลือกใหม่ค่ะ"));
    reader.readAsDataURL(blob);
  });
}

function updateProgress(value, label) {
  const safe = Math.max(0, Math.min(100, value));
  progressLabel.textContent = label;
  progressValue.textContent = `${safe}%`;
  progressBar.style.width = `${safe}%`;
  progressTrack.setAttribute("aria-valuenow", String(safe));
}

function setControlsDisabled(disabled) {
  input.disabled = disabled;
  chooseAgain.disabled = disabled;
  submitButton.disabled = disabled || selected.length === 0;
  previewGrid.querySelectorAll("button").forEach(button => { button.disabled = disabled; });
}

function setError(message) {
  errorBox.textContent = message;
  errorBox.hidden = !message;
}

function clearSelected() {
  selected.forEach(item => URL.revokeObjectURL(item.previewUrl));
  selected = [];
  previewGrid.replaceChildren();
}

function resetForm() {
  clearSelected();
  form.reset();
  form.hidden = false;
  successPanel.hidden = true;
  progressPanel.hidden = true;
  updateProgress(0, "กำลังเตรียมไฟล์…");
  setError("");
  renderSelection();
  document.querySelector("#page-title").scrollIntoView({ behavior: "smooth", block: "start" });
}

renderSelection();
