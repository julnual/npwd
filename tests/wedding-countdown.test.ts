import assert from "node:assert/strict";
import { test } from "node:test";
import { getWeddingCountdown, WEDDING_DAY_START, WEDDING_DAY_END } from "../lib/wedding-countdown.ts";

test("uses the start of 22 November in Thailand, not a ceremony time", () => {
  assert.equal(WEDDING_DAY_START, Date.parse("2026-11-21T17:00:00Z"));
  assert.equal(WEDDING_DAY_END - WEDDING_DAY_START, 86400000);
});

test("splits days, hours, minutes and seconds accurately", () => {
  assert.deepEqual(getWeddingCountdown(WEDDING_DAY_START - (2 * 86400 + 3 * 3600 + 4 * 60 + 5) * 1000), {
    phase: "upcoming", days: 2, hours: 3, minutes: 4, seconds: 5,
  });
});

test("never shows all-zero upcoming digits before midnight", () => {
  assert.equal(getWeddingCountdown(WEDDING_DAY_START - 1).seconds, 1);
  assert.equal(getWeddingCountdown(WEDDING_DAY_START - 1).phase, "upcoming");
});

test("switches message at Thai midnight and remains today for the full day", () => {
  for (const now of [WEDDING_DAY_START, WEDDING_DAY_END - 1]) {
    assert.deepEqual(getWeddingCountdown(now), { phase: "today", days: 0, hours: 0, minutes: 0, seconds: 0 });
  }
});

test("after the day, stays at zero and shows the thank-you state", () => {
  for (const now of [WEDDING_DAY_END, WEDDING_DAY_END + 86400000 * 400]) {
    assert.deepEqual(getWeddingCountdown(now), { phase: "celebrated", days: 0, hours: 0, minutes: 0, seconds: 0 });
  }
});

test("rejects an invalid clock value", () => {
  assert.throws(() => getWeddingCountdown(NaN), RangeError);
});
