// Count to the beginning of the confirmed wedding date, not a ceremony time.
export const WEDDING_DAY_START = Date.parse("2026-11-22T00:00:00+07:00");
export const WEDDING_DAY_END = Date.parse("2026-11-23T00:00:00+07:00");

export function getWeddingCountdown(now: number) {
  if (!Number.isFinite(now)) throw new RangeError("A valid timestamp is required");
  const secondsLeft = Math.max(0, Math.ceil((WEDDING_DAY_START - now) / 1000));
  const phase = now < WEDDING_DAY_START ? "upcoming" : now < WEDDING_DAY_END ? "today" : "celebrated";
  return {
    phase,
    days: Math.floor(secondsLeft / 86400),
    hours: Math.floor((secondsLeft % 86400) / 3600),
    minutes: Math.floor((secondsLeft % 3600) / 60),
    seconds: secondsLeft % 60,
  } as const;
}
