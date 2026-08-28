import WeddingCountdown from "./wedding-countdown";
import WeddingForms from "./wedding-forms";
import WeddingGallery from "./wedding-gallery";
import { Button } from "@/components/ui/button";
import { Gift, Shell, UtensilsCrossed } from "lucide-react";

// Use the supplied venue name and province; do not guess coordinates or a place ID.
const venueMapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("โรงแรมเกียรตินคร จังหวัดนครศรีธรรมราช")}`;

const sections = [
  { id: "invitation", label: "Invitation" },
  { id: "countdown", label: "Our day" },
  { id: "timeline", label: "Timeline" },
  { id: "location", label: "Location" },
  { id: "gallery", label: "Gallery" },
  { id: "rsvp", label: "RSVP" },
];

const weddingSchedule = [
  { time: "08.09", dateTime: "2026-11-22T08:09:00+07:00", title: "พิธีแห่ขันหมาก", Icon: Gift },
  { time: "09.29", dateTime: "2026-11-22T09:29:00+07:00", title: "พิธีรดน้ำสังข์", Icon: Shell },
  { time: "12.00", dateTime: "2026-11-22T12:00:00+07:00", title: "ร่วมรับประทานอาหาร", Icon: UtensilsCrossed },
];

function Monogram() {
  return (
    <a className="monogram" href="#home" aria-label="Ploy and Nan — กลับด้านบน">
      <span>P</span><i aria-hidden="true">&amp;</i><span>N</span>
    </a>
  );
}

export default function Home() {
  return (
    <main>
      <section className="hero" id="home" aria-labelledby="hero-title">
        <header className="hero-nav">
          <Monogram />
          <nav className="desktop-nav" aria-label="เมนูหลัก">
            {sections.map((section) => (
              <a key={section.id} href={`#${section.id}`}>{section.label}</a>
            ))}
          </nav>
          <time className="date-mark" dateTime="2026-11-22">22 · 11 · 26</time>
        </header>

        <picture className="hero-photo">
          <source media="(min-width: 48rem)" srcSet="/images/prewedding-landscape.webp" width="1566" height="1044" />
          <img
            src="/images/prewedding-portrait.webp"
            alt="พลอยและแนนในภาพพรีเวดดิ้งริมทะเลสาบ ท่ามกลางต้นไม้และภูเขา"
            width="1044"
            height="1566"
            fetchPriority="high"
            loading="eager"
          />
        </picture>
        <div className="hero-shade" aria-hidden="true" />

        <div className="hero-content">
          <p className="hero-kicker">Together with our families</p>
          <h1 id="hero-title">
            <span>PLOY</span><span className="hero-ampersand">&amp;</span><span>NAN</span>
          </h1>
          <p className="hero-tagline">In Full Bloom</p>
          <div className="hero-divider" aria-hidden="true"><span /><i /><span /></div>
          <time className="hero-date" dateTime="2026-11-22">22.11.2026</time>
          <p className="hero-note">ขอเชิญร่วมเป็นส่วนหนึ่งในวันสำคัญของเรา</p>
        </div>

        <a className="scroll-cue" href="#invitation" aria-label="เลื่อนลงเพื่อดูคำเชิญ">
          <span>Discover</span>
          <svg viewBox="0 0 16 22" aria-hidden="true"><path d="M8 1v18M2 13l6 7 6-7" /></svg>
        </a>
      </section>

      <section className="invitation-section" id="invitation" aria-labelledby="invitation-title">
        <div className="invitation-inner">
          <p className="section-eyebrow">A note from us</p>
          <h2 className="invitation-title" id="invitation-title">
            With love,<br /><span>we invite you.</span>
          </h2>
          <div className="invitation-rule" aria-hidden="true" />
          <div className="invitation-copy">
            <p>พลอยและแนน พร้อมด้วยครอบครัว<br />ขอเรียนเชิญทุกท่านร่วมเป็นเกียรติ<br className="mobile-break" />ในงานมงคลสมรสของเรา</p>
            <p>มาร่วมแบ่งปันรอยยิ้ม ความอบอุ่น<br className="mobile-break" /> และช่วงเวลาที่มีความหมาย<br />ให้วันสำคัญของเราเบ่งบาน<br className="mobile-break" />ไปด้วยความทรงจำที่งดงาม</p>
          </div>
          <p className="invitation-signature" aria-label="Ploy and Nan">Ploy <span>&amp;</span> Nan</p>
          <div className="invitation-date">
            <p className="section-eyebrow">Save the date</p>
            <time dateTime="2026-11-22">
              <span className="invitation-date-english">22 NOVEMBER 2026</span>
              <span className="invitation-date-thai">วันอาทิตย์ที่ 22 พฤศจิกายน 2569</span>
            </time>
          </div>
        </div>
      </section>

      <section className="countdown-section" id="countdown" aria-labelledby="countdown-title">
        <div className="countdown-inner">
          <p className="section-eyebrow">Until we say “I do”</p>
          <h2 id="countdown-title">Every moment,<br /><em>closer to you.</em></h2>
          <WeddingCountdown />
          <p className="countdown-note">นับถึงเริ่มวันที่ 22 พฤศจิกายน 2569<br className="mobile-break" /> ตามเวลาประเทศไทย (UTC+7)</p>
          <p className="countdown-signoff">We can’t wait to celebrate with you.</p>
        </div>
      </section>

      <section className="timeline-section" id="timeline" aria-labelledby="timeline-title">
        <div className="timeline-inner">
          <p className="section-eyebrow">Timeline</p>
          <h2 id="timeline-title">Our Wedding Day</h2>
          <p className="timeline-date">วันอาทิตย์ที่ 22 พฤศจิกายน 2569</p>
          <ol className="wedding-timeline" aria-label="กำหนดการวันแต่งงาน ตามเวลาประเทศไทย">
            {weddingSchedule.map(({ time, dateTime, title, Icon }) => (
              <li className="timeline-item" key={dateTime}>
                <div className="timeline-icon" aria-hidden="true">
                  <Icon size={36} strokeWidth={1.25} />
                </div>
                <div className="timeline-event">
                  <time dateTime={dateTime}>{time}<span> น.</span></time>
                  <h3>{title}</h3>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="venue-section" id="location" aria-labelledby="venue-title">
        <div className="venue-inner">
          <p className="section-eyebrow">The wedding venue</p>
          <h2 id="venue-title">Where we<br /><em>celebrate.</em></h2>
          <div className="venue-rule" aria-hidden="true" />
          <p className="venue-caption">สถานที่จัดงาน</p>
          <h3 className="venue-name">โรงแรมเกียรตินคร</h3>
          <p className="venue-province">จังหวัดนครศรีธรรมราช</p>
          <Button asChild size="lg" className="venue-map-link">
            <a href={venueMapUrl} target="_blank" rel="noopener noreferrer" aria-label="เปิด Google Maps ค้นหาโรงแรมเกียรตินคร จังหวัดนครศรีธรรมราช ในแท็บใหม่">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
              เปิด Google Maps
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 18 18 6M6 6h12v12" />
              </svg>
            </a>
          </Button>
          <p className="venue-map-note">ค้นหาชื่อโรงแรมใน Google Maps · เปิดแท็บใหม่</p>
        </div>
      </section>
      <section className="dress-section" id="dress-code" aria-labelledby="dress-title">
        <p className="section-eyebrow">A little color, a little joy</p>
        <h2 id="dress-title">Dress Code</h2>
        <p className="dress-palette-name">Green <span>·</span> White <span>·</span> Pink</p>
        <ul className="dress-swatches" aria-label="สีชุดสำหรับร่วมงาน">
          <li><span className="swatch swatch-green" aria-hidden="true" /><span>Green<small>เขียว</small></span></li>
          <li><span className="swatch swatch-white" aria-hidden="true" /><span>White<small>ขาว</small></span></li>
          <li><span className="swatch swatch-pink" aria-hidden="true" /><span>Pink<small>ชมพู</small></span></li>
        </ul>
        <p className="dress-note">ร่วมเติมสีสันให้วันของเรา<br />ด้วยชุดโทนเขียว ขาว หรือชมพู ในแบบที่เป็นคุณ</p>
      </section>
      <WeddingGallery />
      <WeddingForms />
    </main>
  );
}
