import { submitPhoto } from "./upload.mjs";

const MAX_FILES = 5;
const MAX_SOURCE_BYTES = 25 * 1024 * 1024;
const MAX_EDGE = 1600;
const TARGET_BYTES = 1.6 * 1024 * 1024;
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

input.addEventListener("change", () => setFiles([...input.files]));
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
  if (!busy) setFiles([...event.dataTransfer.files]);
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
      updateProgress(Math.round((index / selected.length) * 92), `กำลังเตรียมรูปที่ ${position} จาก ${selected.length}…`);
      if (!item.prepared) item.prepared = await preparePhoto(item.file);
      if (!item.requestId) item.requestId = crypto.randomUUID();

      updateProgress(Math.round(((index + 0.18) / selected.length) * 92), `กำลังเชื่อมต่อเพื่อส่งรูปที่ ${position} จาก ${selected.length}…`);
      const payload = {
        type: "photo",
        requestId: item.requestId,
        batchId,
        originalName: item.file.name || `photo-${position}.jpg`,
        mimeType: item.prepared.mimeType,
        byteSize: item.prepared.byteSize,
        width: item.prepared.width,
        height: item.prepared.height,
        dataBase64: item.prepared.base64,
      };
      const send = IS_SAFE_PREVIEW ? simulatePreviewUpload : submitPhoto;
      await send(payload, phase => {
        const fraction = phase === "uploading" ? 0.75 : 0.3;
        updateProgress(Math.round(((index + fraction) / selected.length) * 92), `กำลังส่งรูปที่ ${position} จาก ${selected.length}…`);
      });
      completed += 1;
      updateProgress(Math.round((completed / selected.length) * 92), `ส่งแล้ว ${completed} จาก ${selected.length} รูป`);
    }

    updateProgress(100, "ส่งรูปสำเร็จ");
    successCopy.textContent = `ขอบคุณที่ร่วมแบ่งปันความทรงจำดี ๆ ให้เรา ได้รับแล้ว ${completed} รูป`;
    await new Promise(resolve => setTimeout(resolve, 350));
    form.hidden = true;
    successPanel.hidden = false;
    successPanel.focus();
    clearSelected();
  } catch (error) {
    // Keep request IDs and compressed data so a retry is idempotent after an uncertain timeout.
    setError(completed
      ? `ส่งสำเร็จแล้ว ${completed} รูป แต่รูปที่เหลือยังไม่สำเร็จ: ${error.message}`
      : error.message);
    updateProgress(Math.round((completed / selected.length) * 92), "การส่งหยุดชั่วคราว");
  } finally {
    busy = false;
    setControlsDisabled(false);
  }
});

async function simulatePreviewUpload(payload, onPhase) {
  // The private preview demonstrates the complete interaction without sending
  // image bytes to Apps Script, Google Drive, Google Sheets, or any other server.
  void payload;
  onPhase("connecting");
  await new Promise(resolve => setTimeout(resolve, 350));
  onPhase("uploading");
  await new Promise(resolve => setTimeout(resolve, 650));
  return { ok: true, preview: true };
}

function setFiles(files) {
  setError("");
  const images = files.filter(file => file.type.startsWith("image/"));
  if (images.length !== files.length) setError("เลือกได้เฉพาะไฟล์รูปภาพเท่านั้นค่ะ");
  if (images.some(file => file.size > MAX_SOURCE_BYTES)) {
    setError("รูปแต่ละไฟล์ต้องมีขนาดไม่เกิน 25 MB ค่ะ");
    input.value = "";
    return;
  }
  if (images.length > MAX_FILES) setError("เลือกได้สูงสุด 5 รูปต่อครั้ง ระบบเลือก 5 รูปแรกให้แล้วค่ะ");
  clearSelected();
  selected = images.slice(0, MAX_FILES).map(file => ({ file, previewUrl: URL.createObjectURL(file) }));
  input.value = "";
  renderSelection();
}

function renderSelection() {
  previewGrid.replaceChildren(...selected.map((item, index) => {
    const card = document.createElement("div");
    card.className = "preview-item";
    const image = document.createElement("img");
    image.src = item.previewUrl;
    image.alt = `รูปที่เลือก ${index + 1}`;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "remove-photo";
    remove.dataset.remove = String(index);
    remove.setAttribute("aria-label", `ลบรูปที่ ${index + 1}`);
    remove.textContent = "×";
    card.append(image, remove);
    return card;
  }));
  summary.hidden = selected.length === 0;
  count.textContent = `เลือกแล้ว ${selected.length}/${MAX_FILES} รูป`;
  submitButton.disabled = selected.length === 0 || busy;
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
  consent.disabled = disabled;
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
  consent.checked = false;
  form.reset();
  form.hidden = false;
  successPanel.hidden = true;
  progressPanel.hidden = true;
  updateProgress(0, "กำลังเตรียมรูปภาพ…");
  setError("");
  renderSelection();
  document.querySelector("#page-title").scrollIntoView({ behavior: "smooth", block: "start" });
}

renderSelection();
