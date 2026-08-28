"use client";

import { useEffect, useState } from "react";
import { getWeddingCountdown, WEDDING_DAY_END } from "../lib/wedding-countdown";

const units = [
  { key: "days", english: "Days", thai: "วัน" },
  { key: "hours", english: "Hours", thai: "ชั่วโมง" },
  { key: "minutes", english: "Minutes", thai: "นาที" },
  { key: "seconds", english: "Seconds", thai: "วินาที" },
] as const;

export default function WeddingCountdown() {
  // Match server markup on first render; the visitor's clock starts after mount.
  const [countdown, setCountdown] = useState<ReturnType<typeof getWeddingCountdown> | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const update = () => {
      clearTimeout(timer);
      const now = Date.now();
      const next = getWeddingCountdown(now);
      setCountdown(next);
      if (next.phase === "upcoming") timer = setTimeout(update, 1000);
      else if (next.phase === "today") timer = setTimeout(update, Math.max(1, WEDDING_DAY_END - now));
    };
    const resume = () => { if (!document.hidden) update(); };
    update();
    document.addEventListener("visibilitychange", resume);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", resume);
    };
  }, []);

  const message = countdown?.phase === "today"
    ? "ถึงวันสำคัญของเราแล้ว — 22 พฤศจิกายน 2569"
    : countdown?.phase === "celebrated"
      ? "ขอบคุณที่ร่วมเป็นส่วนหนึ่งในวันสำคัญของเรา"
      : "อีกไม่นาน เราจะได้ฉลองไปด้วยกัน";

  return (
    <div className="wedding-countdown">
      <div className="countdown-digits" role="timer" aria-live="off" aria-label="เวลาที่เหลือถึงวันแต่งงาน">
        {units.map(({ key, english, thai }) => (
          <div className="countdown-unit" key={key}>
            <span className="countdown-number">{countdown ? String(countdown[key]).padStart(2, "0") : "—"}</span>
            <span className="countdown-label" aria-hidden="true">{english}</span>
            <span className="countdown-thai">{thai}</span>
          </div>
        ))}
      </div>
      <p className="countdown-message" role="status" aria-live="polite">{message}</p>
      <noscript><p className="countdown-message">วันแต่งงาน: 22 พฤศจิกายน 2569 · เปิด JavaScript เพื่อแสดงเวลานับถอยหลัง</p></noscript>
    </div>
  );
}
