import test from "node:test";
import assert from "node:assert/strict";
import { statSync } from "node:fs";
// @ts-ignore Native Node test runner resolves source extensions.
import { weddingPhotos, nextPhotoIndex } from "../lib/wedding-gallery.ts";

test("all six gallery images have unique assets and accessible descriptions", () => {
  assert.equal(weddingPhotos.length, 6);
  assert.equal(new Set(weddingPhotos.map(photo => photo.src)).size, 6);
  for (const photo of weddingPhotos) {
    assert.ok(photo.alt.includes("พลอย") || photo.alt.includes("แนน"));
    assert.ok(photo.width > 0 && photo.height > photo.width);
    assert.ok(statSync(new URL(`../public${photo.src}`, import.meta.url)).size > 1000);
  }
});
test("next and previous wrap at the ends of the album", () => {
  assert.equal(nextPhotoIndex(0, -1), 5);
  assert.equal(nextPhotoIndex(5, 1), 0);
  assert.equal(nextPhotoIndex(2, 1), 3);
  assert.equal(nextPhotoIndex(2, -1), 1);
});
