import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("../../app/page.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
const wishes = readFileSync(new URL("../../app/wedding-wishes-carousel.tsx", import.meta.url), "utf8");

test("ceremony labels and machine-readable times agree with the revised schedule", () => {
  for (const [time, iso, title] of [
    ["09.09", "09:09", "พิธีแห่ขันหมาก"],
    ["10.10", "10:10", "พิธีรดน้ำสังข์"],
    ["12.00", "12:00", "ร่วมรับประทานอาหาร (โต๊ะจีน)"],
  ]) {
    assert(page.includes(`time: "${time}", dateTime: "2026-11-22T${iso}:00+07:00", title: "${title}"`));
  }
  assert(!page.includes('time: "08.09"'));
  assert(!page.includes('time: "09.29"'));
});

test("anonymous wishes carousel sits between gallery and forms with swipe and five-second autoplay", () => {
  assert.match(page, /<WeddingGallery\s*\/>\s*<WeddingWishesCarousel feedUrl=\{weddingWishesFeedUrl\}\s*\/>\s*<WeddingForms\s*\/>/);
  assert(page.includes("https://script.google.com/macros/s/AKfycbxCh7an4LDvCNTwOCIksHOwKmBzkZh3_syNw59WgA4p2C_Bzt5Spo59GbxUHMr6mHG2/exec?mode=wishes"));
  assert(wishes.includes("AUTOPLAY_MS = 5000"));
  assert(wishes.includes("MAX_WISH_CHARACTERS = 300"));
  assert(wishes.includes('.slice(0, MAX_WISH_CHARACTERS).join("").trimEnd()}...`'));
  assert(wishes.includes("useEmblaCarousel"));
  assert(wishes.includes('id="wish-wall"'));
  assert(wishes.includes("PLOY &amp; NAN"));
  assert(!wishes.includes("sender"));
  assert(wishes.includes("feedUrl ? [] : PREVIEW_WISHES"));
  assert.match(css, /\.wish-card\s*\{/);
  assert(!wishes.includes("wish-progress"));
  assert(!wishes.includes("Pause"));
  assert.match(css, /\.wish-carousel-viewport\s*\{[^}]*padding-block:/);
});

test("dress code uses the five requested swatches without visible color names", () => {
  const swatches = [...page.matchAll(/className="swatch swatch-([\w-]+)" role="img" aria-label="สีรหัส (#[A-F0-9]+)"/g)]
    .map(([, className, code]) => ({ className, code }));
  assert.deepEqual(swatches, [
    { className: "olive", code: "#858A74" },
    { className: "sage", code: "#A6AD8E" },
    { className: "blush-light", code: "#F1E7E6" },
    { className: "blush", code: "#E1C3C1" },
    { className: "rose", code: "#CFA29F" },
  ]);
  assert(!page.includes("dress-palette-name"));
  assert(!page.includes("<small>"));
  assert(page.includes("ด้วยชุดโทนสีตามพาเลต ในแบบที่เป็นคุณ"));
  for (const { className, code } of swatches) {
    assert(css.includes(`.swatch-${className} { background: ${code.toLowerCase()}; }`));
  }
});

test("save-the-date keeps three lines with larger responsive type and English date unbroken", () => {
  assert.match(page, /Save the date<\/p>\s*<time dateTime="2026-11-22">\s*<span className="invitation-date-english">22 NOVEMBER 2026<\/span>\s*<span className="invitation-date-thai">วันอาทิตย์ที่ 22 พฤศจิกายน 2569<\/span>/);
  assert.match(css, /\.invitation-date \.section-eyebrow \{[^}]*font-size: clamp\(1rem, 3\.5vw, 1\.2rem\)/);
  assert.match(css, /\.invitation-date-english \{[^}]*font-size: clamp\(1\.4rem, 6vw, 2\.25rem\)[^}]*white-space: nowrap/);
  assert.match(css, /\.invitation-date-thai \{[^}]*font-size: clamp\(1rem, 3\.8vw, 1\.125rem\)[^}]*font-weight: 400/);
});
