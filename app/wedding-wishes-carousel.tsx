"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { MoveHorizontal } from "lucide-react";

type WishesPayload = { ok?: boolean; wishes?: unknown };
type WishesResult = { ok: boolean; wishes: string[] };

const AUTOPLAY_MS = 5000;
const MAX_WISH_CHARACTERS = 300;
const PREVIEW_WISHES = [
  "ขอให้ทั้งคู่มีความสุขมาก ๆ ในทุกวัน จับมือและเติบโตไปด้วยกันตลอดไปนะ",
  "ขอให้บ้านหลังใหม่เต็มไปด้วยเสียงหัวเราะ ความเข้าใจ และความรักในทุก ๆ วัน",
  "ยินดีกับพลอยและแนน ขอให้เป็นคู่ชีวิตและเพื่อนที่ดีที่สุดของกันและกันเสมอ",
  "ขอให้ความรักของทั้งคู่เบ่งบาน งดงาม และอบอุ่นเหมือนวันแรกตลอดไป",
  "ขอให้ทุกการเดินทางต่อจากนี้มีรอยยิ้ม ความสบายใจ และมีกันอยู่ข้าง ๆ เสมอ",
];

function BotanicalLine({ className }: { className: string }) {
  return <svg className={className} viewBox="0 0 120 120" fill="none" aria-hidden="true">
    <path d="M13 108C35 76 49 51 84 17M35 75C25 63 21 52 24 41M46 62C60 59 70 52 77 41M61 44C52 32 52 22 57 12M72 30C86 31 98 26 106 16" />
    <path d="M22 43C12 39 8 30 12 21C22 22 29 30 24 41ZM76 42C79 29 88 22 99 24C98 35 90 42 76 42ZM57 13C65 6 75 7 81 14C75 22 65 22 57 13ZM105 17C104 8 111 3 118 4C120 12 114 17 105 17Z" />
    <circle cx="37" cy="73" r="3" /><circle cx="43" cy="66" r="2" /><circle cx="50" cy="59" r="2.5" />
  </svg>;
}

function truncateWish(wish: string) {
  const characters = Array.from(wish);
  if (characters.length <= MAX_WISH_CHARACTERS) return wish;
  return `${characters.slice(0, MAX_WISH_CHARACTERS).join("").trimEnd()}...`;
}

function sanitizeWishes(payload: WishesPayload) {
  if (payload.ok !== true || !Array.isArray(payload.wishes)) return [];
  return payload.wishes
    .filter((wish): wish is string => typeof wish === "string")
    .map(wish => wish.trim())
    .filter(Boolean)
    .map(truncateWish)
    .slice(0, 50);
}

function loadJsonp(feedUrl: string, onDone: (result: WishesResult) => void) {
  const callback = `__ployNanWishes_${crypto.randomUUID().replaceAll("-", "")}`;
  const scope = window as unknown as Record<string, unknown>;
  const script = document.createElement("script");
  const separator = feedUrl.includes("?") ? "&" : "?";
  let finished = false;
  const cleanup = () => { delete scope[callback]; script.remove(); };
  const finish = (result: WishesResult) => {
    if (finished) return;
    finished = true;
    window.clearTimeout(timeout);
    cleanup();
    onDone(result);
  };
  scope[callback] = (payload: WishesPayload) => finish({ ok: payload.ok === true, wishes: sanitizeWishes(payload) });
  script.src = `${feedUrl}${separator}callback=${encodeURIComponent(callback)}&t=${Date.now()}`;
  script.async = true;
  script.onerror = () => finish({ ok: false, wishes: [] });
  const timeout = window.setTimeout(() => finish({ ok: false, wishes: [] }), 30000);
  document.head.appendChild(script);
  return () => { window.clearTimeout(timeout); cleanup(); };
}

export default function WeddingWishesCarousel({ feedUrl = "" }: { feedUrl?: string }) {
  const [wishes, setWishes] = useState(() => feedUrl ? [] : PREVIEW_WISHES);
  const [feedState, setFeedState] = useState<"preview" | "loading" | "ready" | "empty" | "error">(feedUrl ? "loading" : "preview");
  const [selected, setSelected] = useState(0);
  const [viewportRef, embla] = useEmblaCarousel({ loop: true, align: "center", skipSnaps: false });
  const cleanupRef = useRef<(() => void) | null>(null);

  const refresh = useCallback(() => {
    if (!feedUrl) return;
    cleanupRef.current?.();
    cleanupRef.current = loadJsonp(feedUrl, result => {
      if (!result.ok) {
        setFeedState(current => current === "ready" ? current : "error");
        return;
      }
      setWishes(result.wishes);
      setFeedState(result.wishes.length ? "ready" : "empty");
    });
  }, [feedUrl]);

  useEffect(() => {
    refresh();
    const refreshTimer = feedUrl ? window.setInterval(refresh, 60000) : 0;
    const afterSave = () => window.setTimeout(refresh, 1200);
    window.addEventListener("ploy-nan:wish-saved", afterSave);
    return () => {
      if (refreshTimer) window.clearInterval(refreshTimer);
      window.removeEventListener("ploy-nan:wish-saved", afterSave);
      cleanupRef.current?.();
    };
  }, [feedUrl, refresh]);

  useEffect(() => {
    if (!embla) return;
    const update = () => {
      setSelected(embla.selectedScrollSnap());
    };
    update();
    embla.on("select", update);
    embla.on("reInit", update);
    return () => { embla.off("select", update); embla.off("reInit", update); };
  }, [embla]);

  useEffect(() => {
    if (!embla || wishes.length < 2) return;
    const timer = window.setTimeout(() => embla.scrollNext(), AUTOPLAY_MS);
    return () => window.clearTimeout(timer);
  }, [embla, selected, wishes.length]);

  useEffect(() => { embla?.reInit(); }, [embla, wishes]);

  return <section className="wish-wall" id="wish-wall" aria-labelledby="wish-wall-title">
    <BotanicalLine className="wish-wall-floral wish-wall-floral-top" />
    <div className="wish-wall-inner">
      <header className="wish-wall-heading">
        <p className="section-eyebrow">Words from the heart</p>
        <h2 id="wish-wall-title">Wishes for<br /><em>PLOY &amp; NAN</em></h2>
        <div className="wish-wall-divider" aria-hidden="true"><span /><i>♥</i><span /></div>
        <p>ข้อความดี ๆ จากคนที่เรารัก</p>
      </header>

      <div className="wish-carousel" aria-roledescription="carousel" aria-label="การ์ดคำอวยพรแบบเลื่อนได้">
        <div className="wish-carousel-viewport" ref={viewportRef}>
          <div className="wish-carousel-track">
            {wishes.map((wish, index) => <article
              className="wish-card" key={`${index}-${wish.slice(0, 24)}`}
              aria-label={`คำอวยพร ${index + 1} จาก ${wishes.length}`}
              aria-hidden={index !== selected}
            >
              <BotanicalLine className="wish-card-floral wish-card-floral-left" />
              <BotanicalLine className="wish-card-floral wish-card-floral-right" />
              <span className="wish-quote wish-quote-open" aria-hidden="true">“</span>
              <p>{wish}</p>
              <span className="wish-quote wish-quote-close" aria-hidden="true">”</span>
            </article>)}
            {!wishes.length && <article className="wish-card wish-card-status" aria-live="polite">
              <p>{feedState === "error" ? "ยังไม่สามารถโหลดคำอวยพรได้ กรุณาลองใหม่อีกครั้ง" : feedState === "empty" ? "รอรับคำอวยพรแรกจากคนที่เรารัก" : "กำลังโหลดคำอวยพร…"}</p>
            </article>}
          </div>
        </div>

        {wishes.length > 0 && <div className="wish-carousel-controls">
          <div className="wish-dots" aria-label="เลือกคำอวยพร">
            {wishes.map((_, index) => <button
              type="button" key={index} className={index === selected ? "is-active" : ""}
              aria-label={`ดูคำอวยพรที่ ${index + 1}`} aria-current={index === selected ? "true" : undefined}
              onClick={() => embla?.scrollTo(index)}
            />)}
          </div>
          {wishes.length > 1 && <p className="wish-swipe-hint"><MoveHorizontal size={19} aria-hidden="true" /> ปัดเพื่อดูคำอวยพร</p>}
        </div>}
      </div>
      {!feedUrl && <p className="wish-preview-note">Preview · ขณะนี้แสดงข้อความตัวอย่างแทนข้อมูลจาก Google Sheet</p>}
    </div>
    <BotanicalLine className="wish-wall-floral wish-wall-floral-bottom" />
  </section>;
}
