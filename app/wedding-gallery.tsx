"use client";

import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Expand, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { nextPhotoIndex, weddingPhotos } from "@/lib/wedding-gallery";

export default function WeddingGallery() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const opener = useRef<HTMLAnchorElement | null>(null);
  const photo = weddingPhotos[active];
  const navigate = (direction: number) => setActive(current => nextPhotoIndex(current, direction));

  return <section className="gallery-section" id="gallery" aria-labelledby="gallery-title">
    <div className="gallery-inner">
      <header className="gallery-heading">
        <p className="section-eyebrow">Our gallery</p>
        <h2 id="gallery-title">Little moments,<br /><em>in full bloom.</em></h2>
        <p className="gallery-intro">ความรัก รอยยิ้ม และช่วงเวลาของเรา</p>
      </header>
      <div className="gallery-grid">
        {weddingPhotos.map((item, index) => <a
          key={item.src} href={item.src} className="gallery-photo"
          aria-label={`ดูภาพ ${index + 1} จาก ${weddingPhotos.length}: ${item.alt}`}
          aria-haspopup="dialog"
          onClick={event => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            event.preventDefault(); opener.current = event.currentTarget; setActive(index); setOpen(true);
          }}
        >
          <img src={item.src} width={item.width} height={item.height} alt={item.alt} loading="lazy" decoding="async" />
          <span className="gallery-photo-expand" aria-hidden="true"><Expand size={17} strokeWidth={1.5} /></span>
        </a>)}
      </div>
      <p className="gallery-signature">The beginning of our forever.</p>
    </div>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="gallery-dialog" showCloseButton={false}
        onCloseAutoFocus={event => { event.preventDefault(); opener.current?.focus(); }}
        onKeyDown={event => {
          if (event.key === "ArrowLeft") { event.preventDefault(); navigate(-1); }
          if (event.key === "ArrowRight") { event.preventDefault(); navigate(1); }
        }}>
        <div className="gallery-dialog-header">
          <DialogTitle className="gallery-dialog-title">Ploy &amp; Nan <span>— Our gallery</span></DialogTitle>
          <DialogClose asChild><Button className="gallery-control gallery-close" aria-label="ปิดภาพใหญ่"><X size={22} aria-hidden="true" /></Button></DialogClose>
        </div>
        <div className="gallery-dialog-image">
          <img key={photo.src} src={photo.src} width={photo.width} height={photo.height} alt={photo.alt} decoding="async" />
        </div>
        <div className="gallery-dialog-footer">
          <Button className="gallery-control" onClick={() => navigate(-1)} aria-label="ภาพก่อนหน้า"><ArrowLeft size={22} aria-hidden="true" /></Button>
          <div className="gallery-dialog-caption" aria-live="polite" aria-atomic="true">
            <p className="gallery-counter">{active + 1} / {weddingPhotos.length}</p>
            <DialogDescription className="sr-only">{photo.alt}</DialogDescription>
          </div>
          <Button className="gallery-control" onClick={() => navigate(1)} aria-label="ภาพถัดไป"><ArrowRight size={22} aria-hidden="true" /></Button>
        </div>
      </DialogContent>
    </Dialog>
  </section>;
}
