import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../share/index.html", import.meta.url), "utf8");
const client = readFileSync(new URL("../share/main.js", import.meta.url), "utf8");
const shareCss = readFileSync(new URL("../share/share.css", import.meta.url), "utf8");
const mainCss = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
const transport = readFileSync(new URL("../share/upload.mjs", import.meta.url), "utf8");
const shareConfig = readFileSync(new URL("../share/config.mjs", import.meta.url), "utf8");
const backend = readFileSync(new URL("../../apps-script-photo/Code.gs", import.meta.url), "utf8");

test("media share is an isolated mobile-first page with requested controls", () => {
  assert(html.includes('name="viewport"'));
  assert(html.includes("Share Your Moments"));
  assert(html.includes('id="photo-input"'));
  assert(html.includes('<span class="step-number" aria-hidden="true">♥</span>'));
  assert(html.includes('id="preview-grid"'));
  assert(!html.includes('id="gallery-consent"'));
  assert(!html.includes("Wedding Gallery"));
  assert(html.includes('role="progressbar"'));
  assert(html.includes('href="../"'));
  assert.equal((client.match(/MAX_PHOTOS = 5/g) || []).length, 1);
  assert(client.includes("MAX_VIDEO_BYTES = 25 * 1024 * 1024"));
  assert(client.includes("MAX_VIDEO_SECONDS = 30"));
  assert(client.includes('new Set(["video/mp4", "video/quicktime", "video/webm"])'));
  assert(client.includes("readVideoMetadata"));
  assert(client.includes("prepareVideo"));
  assert(client.includes('item.kind === "video" ? "video" : "img"'));
  assert(client.includes("MAX_EDGE = 1600"));
  assert(client.includes("canvas.toBlob"));
  assert(client.includes("URL.revokeObjectURL"));
  assert(client.includes("IS_SAFE_PREVIEW"));
  assert(client.includes("simulatePreviewUpload"));
  assert(!client.includes("galleryConsent"));
  assert(!client.includes("consent."));
  assert(html.includes('accept="image/*,video/mp4,video/quicktime,video/webm"'));
  assert(html.includes("วิดีโอไม่เกิน 25 MB และ 30 วินาที"));
  assert(html.includes('id="preview-notice"'));
});

test("share page keeps an independent stylesheet while matching the main wedding theme", () => {
  assert(html.includes('href="./share.css"'));
  assert(!html.includes("globals.css"));
  for (const token of [
    "--ivory: #fbf7ee", "--paper: #fffdf8", "--blush: #dca8a1",
    "--sage: #a8b29a", "--botanical: #44543f", "--ink: #384136",
  ]) {
    assert(mainCss.includes(token));
    assert(shareCss.includes(token));
  }
  for (const font of ["Libre Caslon Display", "Parisienne", "Noto Sans Thai"]) {
    assert(shareCss.includes(font));
  }
  assert(html.includes('/images/share-cover.jpg'));
  assert(shareCss.includes('.hero-cover'));
});

test("media transport uses a dedicated acknowledged Apps Script bridge", () => {
  assert(transport.includes('import { PHOTO_SCRIPT_URL, SITE_ORIGIN } from "./config.mjs"'));
  assert(transport.includes('message.kind !== "ploy-nan-photo"'));
  assert(transport.includes("isGoogleScriptOrigin"));
  assert(transport.includes("export function submitMedia"));
  assert(!transport.includes("no-cors"));
  assert(!transport.includes("WEDDING_API_KEY"));
  assert(shareConfig.includes("AKfycbwR6jhtmjjFFReU9TX4H7xROhSnrf7vDNCNoON1WViJrld_7XLV-hsj4oqIRmi7GWWM"));
});

test("dedicated backend creates separate private Sheet and Drive media storage", () => {
  assert(backend.includes("PHOTO_SPREADSHEET_ID"));
  assert(backend.includes("PHOTO_FOLDER_ID"));
  assert(backend.includes("PHOTO_UPLOAD_SECRET"));
  assert(backend.includes("PLOY_NAN_GUEST_PHOTOS_2026"));
  assert(backend.includes("SpreadsheetApp.create(PHOTO_SPREADSHEET_NAME)"));
  assert(backend.includes("'private'"));
  assert(backend.includes("folder.setSharing(DriveApp.Access.PRIVATE"));
  assert(backend.includes("function setupPhotoSharing()"));
  assert(backend.includes("function saveMedia_(data)"));
  assert(backend.includes("function validateMedia_(data)"));
  assert(backend.includes("VIDEO_MAX_BYTES = 25 * 1024 * 1024"));
  assert(backend.includes("VIDEO_MAX_SECONDS = 30"));
  assert(backend.includes("'video/mp4', 'video/quicktime', 'video/webm'"));
  assert(backend.includes("'ประเภทสื่อ'"));
  assert(backend.includes("'ความยาววิดีโอ (วินาที)'"));
  assert(backend.includes("function ensureHeaders_(sheet)"));
  assert(!backend.includes("WEDDING_SPREADSHEET_ID"));
  assert(!backend.includes("function save_("));
});
