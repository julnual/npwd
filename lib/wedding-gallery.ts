export const weddingPhotos = [
  { src: "/images/gallery/walking.jpg", width: 1044, height: 1566, alt: "พลอยและแนนเดินเคียงข้างกันริมทะเลสาบ โดยมีภูเขาและแสงอาทิตย์เป็นฉากหลัง" },
  { src: "/images/gallery/laughter.jpg", width: 1044, height: 1566, alt: "พลอยและแนนยิ้มและหัวเราะด้วยกันท่ามกลางสวนสีเขียว" },
  { src: "/images/gallery/close-to-you.jpg", width: 1044, height: 1566, alt: "พลอยประคองใบหน้าแนน ทั้งคู่ยิ้มให้กันในแสงอ่อนริมทะเลสาบ" },
  { src: "/images/gallery/hand-in-hand.jpg", width: 1044, height: 1566, alt: "แนนจับมือพลอยอย่างอ่อนโยนริมทะเลสาบ" },
  { src: "/images/gallery/lakeside.jpg", width: 1044, height: 1566, alt: "พลอยและแนนนั่งเคียงข้างกันบนสนามหญ้าริมน้ำ พร้อมรอยยิ้ม" },
  { src: "/images/gallery/dancing.jpg", width: 1365, height: 2048, alt: "พลอยและแนนยกแขนเต้นรำและยิ้มให้กล้องท่ามกลางธรรมชาติ" },
] as const;

export function nextPhotoIndex(current: number, direction: number) {
  return (current + direction + weddingPhotos.length) % weddingPhotos.length;
}
