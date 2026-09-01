"use client";
import { useRef, useState, type FormEvent } from "react";
import { Heart, Mail, Check, LoaderCircle, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

function ResponseForm({ type }: { type: "rsvp" | "wish" }) {
  const [attendance, setAttendance] = useState("yes");
  const [state, setState] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const pending = useRef<{ signature: string; id: string } | null>(null);
  const busy = useRef(false);
  const isRsvp = type === "rsvp";
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const fields = new FormData(event.currentTarget);
    const data = { type, name: String(fields.get("name") || "").trim(),
      ...(isRsvp ? { attendance, guestCount: attendance === "no" ? 0 : Number(fields.get("guestCount")), note: String(fields.get("note") || "").trim() }
        : { message: String(fields.get("message") || "").trim() }) };
    if (!data.name || (!isRsvp && !("message" in data && data.message))) {
      setState("error"); setMessage("กรุณากรอกชื่อและข้อความให้ครบ โดยไม่เว้นว่างค่ะ"); return;
    }
    const signature = JSON.stringify(data);
    if (pending.current?.signature !== signature) pending.current = { signature, id: crypto.randomUUID() };
    busy.current = true; setState("sending"); setMessage("");
    try {
      const response = await fetch("/api/wedding", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, requestId: pending.current.id }), signal: AbortSignal.timeout(30000),
      });
      const result = await response.json();
      if (!response.ok || result.ok !== true || result.requestId !== pending.current.id) {
        throw new Error(result.code === "NOT_CONFIGURED" ? "ยังเชื่อมต่อ Google Sheets ไม่ครบ กรุณาลองอีกครั้งหลังตั้งค่าคีย์เรียบร้อยค่ะ" : "ยังยืนยันการบันทึกไม่ได้ กรุณาลองส่งอีกครั้ง ข้อมูลที่กรอกยังอยู่ค่ะ");
      }
      setState("success");
      if (!isRsvp) window.dispatchEvent(new Event("ploy-nan:wish-saved"));
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error && error.name === "Error" ? error.message : "การเชื่อมต่อขัดข้อง กรุณาลองส่งอีกครั้ง ข้อมูลที่กรอกยังอยู่ค่ะ");
    } finally { busy.current = false; }
  }
  if (state === "success") return <div className="form-thanks" role="status">
    <Check size={30} strokeWidth={1.3} aria-hidden="true" /><p>Thank you, with love.</p>
    <span>{isRsvp ? "บันทึกคำตอบของคุณแล้ว ขอบคุณที่แจ้งให้เราทราบค่ะ" : "บันทึกคำอวยพรของคุณแล้ว ขอบคุณที่ร่วมเติมความสุขให้วันของเราค่ะ"}</span>
  </div>;
  return <form className="wedding-form" onSubmit={submit} aria-busy={state === "sending"}>
    <fieldset disabled={state === "sending"}>
      <div className="form-field">
        <label htmlFor={`${type}-name`}>ชื่อ–นามสกุล / ชื่อที่ให้เราจำได้ <span aria-hidden="true">*</span></label>
        <Input id={`${type}-name`} name="name" autoComplete="name" required maxLength={100} placeholder="ชื่อของคุณ" className="wedding-input" />
      </div>
      {isRsvp ? <>
        <div className="form-field">
          <span id="attendance-label" className="form-label">คุณจะมาร่วมฉลองกับเราไหม?</span>
          <RadioGroup aria-labelledby="attendance-label" value={attendance} onValueChange={setAttendance} className="attendance-options">
            <label className="attendance-option" htmlFor="attend-yes"><RadioGroupItem value="yes" id="attend-yes" />ยินดีเข้าร่วม</label>
            <label className="attendance-option" htmlFor="attend-no"><RadioGroupItem value="no" id="attend-no" />ไม่สะดวกเข้าร่วม</label>
          </RadioGroup>
        </div>
        {attendance === "yes" && <div className="form-field">
          <label htmlFor="guest-count">จำนวนผู้ร่วมงาน (รวมตัวคุณ) <span aria-hidden="true">*</span></label>
          <Input id="guest-count" name="guestCount" type="number" inputMode="numeric" required min={1} max={20} step={1} defaultValue={1} className="wedding-input guest-count" />
        </div>}
        <div className="form-field">
          <label htmlFor="rsvp-note">หมายเหตุ <span className="optional">(ไม่บังคับ)</span></label>
          <Textarea id="rsvp-note" name="note" maxLength={500} rows={3} className="wedding-input" placeholder="เรื่องที่อยากแจ้งให้เราทราบ" />
        </div>
      </> : <div className="form-field">
        <label htmlFor="wish-message">คำอวยพรถึงพลอยและแนน <span aria-hidden="true">*</span></label>
        <Textarea id="wish-message" name="message" required maxLength={2000} rows={6} className="wedding-input" placeholder="ฝากความรักและคำอวยพรเล็ก ๆ ไว้ให้เรา…" />
      </div>}
      <p className="form-privacy">{isRsvp ? "ข้อมูลใช้สำหรับจัดเตรียมงานแต่ง และไม่แสดงรายชื่อบนเว็บไซต์" : "คำอวยพรอาจแสดงบนเว็บไซต์โดยไม่เปิดเผยชื่อหรือข้อมูลของผู้ส่ง"}</p>
      <Button type="submit" size="lg" className="wedding-submit" disabled={state === "sending"}>
        {state === "sending" ? <><LoaderCircle className="sending-icon" size={18} aria-hidden="true" />กำลังบันทึก…</> : <>{isRsvp ? "ยืนยันการตอบรับ" : "ส่งคำอวยพร"}<ArrowUpRight size={18} aria-hidden="true" /></>}
      </Button>
    </fieldset>
    <p className="form-feedback" role="status" aria-live="polite">{message}</p>
    <noscript>กรุณาเปิด JavaScript เพื่อส่งแบบฟอร์ม</noscript>
  </form>;
}
export default function WeddingForms() {
  return <>
    <section className="response-section rsvp-section" id="rsvp" aria-labelledby="rsvp-title">
      <div className="response-inner"><header className="response-heading">
        <Mail className="response-icon" size={35} strokeWidth={1.1} aria-hidden="true" />
        <p className="section-eyebrow">We saved you a place</p><h2 id="rsvp-title">Kindly <em>RSVP.</em></h2>
        <p className="response-description">ทุกการมาร่วมงานมีความหมายกับเรา<br />แจ้งการตอบรับ เพื่อให้เราได้เตรียมต้อนรับคุณ</p>
        <p className="response-script">A day made sweeter with you.</p>
      </header><ResponseForm type="rsvp" /></div>
    </section>
    <section className="response-section wishes-section" id="wishes" aria-labelledby="wishes-title">
      <div className="response-inner"><header className="response-heading">
        <Heart className="response-icon" size={35} strokeWidth={1.1} aria-hidden="true" />
        <p className="section-eyebrow">Leave a message</p><h2 id="wishes-title">For the <em>Couple</em></h2>
        <p className="response-description">ฝากคำอวยพรถึงบ่าวสาว<br />ให้ถ้อยคำของคุณเป็นอีกหนึ่งความทรงจำของเรา</p>
        <p className="response-script">Your words, forever in our hearts.</p>
      </header><ResponseForm type="wish" /></div>
    </section>
  </>;
}
