// utils/time.ts
export function toHMS(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return [h, m, s].map((n) => n.toString().padStart(2, "0")).join(":");
}

export function fromHMS(hms: string) {
  const [h, m, s] = hms.split(":").map(Number);
  return h * 3600 + m * 60 + s;
}
