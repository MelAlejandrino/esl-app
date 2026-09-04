import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...c: ClassValue[]) => twMerge(clsx(c));

/** Today's date as `YYYY-MM-DD` in the teacher's own timezone, not UTC. */
export function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/**
 * Two shapes reach us: `2026-09-01` (a class date, already local) and
 * `2026-09-01 06:03:30` (SQLite `datetime('now')`, always UTC).
 */
const parse = (iso: string) => {
  const s = iso.trim();
  if (s.length <= 10) return new Date(`${s}T12:00:00`);
  return new Date(s.endsWith("Z") ? s : `${s.replace(" ", "T")}Z`);
};

/** Local midnight, so comparisons are by calendar day and not by hours elapsed. */
const dayStart = (d: Date) => {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
};

const long = new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric" });
const longYear = new Intl.DateTimeFormat(undefined, {
  month: "long",
  day: "numeric",
  year: "numeric",
});

/** `September 1` — with the year only when it isn't the current one. */
export function formatDate(iso?: string | null): string {
  if (!iso) return "";
  const d = parse(iso);
  if (Number.isNaN(+d)) return iso;
  return d.getFullYear() === new Date().getFullYear() ? long.format(d) : longYear.format(d);
}

/** `Today`, `Yesterday`, `3 days ago`, then falls back to the date. */
export function relativeDate(iso?: string | null): string {
  if (!iso) return "";
  const d = parse(iso);
  if (Number.isNaN(+d)) return iso;
  const days = Math.round((+dayStart(new Date()) - +dayStart(d)) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days === -1) return "Tomorrow";
  if (days > 1 && days < 7) return `${days} days ago`;
  if (days < -1 && days > -7) return `in ${-days} days`;
  return formatDate(iso);
}

/** Was this within the last day? Drives the "recently viewed" dot. */
export function isRecent(iso?: string | null, hours = 24): boolean {
  if (!iso) return false;
  const d = parse(iso);
  return !Number.isNaN(+d) && Date.now() - +d < hours * 3_600_000;
}

export function formatBytes(n?: number | null): string {
  if (n == null) return "";
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB"];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v < 10 ? v.toFixed(1) : Math.round(v)} ${units[i]}`;
}

/** One or two letters for an avatar, from a real name. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const first = [...parts[0]][0] ?? "";
  const last = parts.length > 1 ? ([...parts[parts.length - 1]][0] ?? "") : "";
  return (first + last).toUpperCase();
}

/** Deterministic accent per student, so avatars stay stable across sessions. */
export function avatarTone(seed: string): string {
  const tones = [
    "bg-[#e7efe9] text-[#2c5c47]",
    "bg-[#f2ebe1] text-[#6b5230]",
    "bg-[#e8ecf3] text-[#3a4a68]",
    "bg-[#f3e9ea] text-[#6d3a40]",
    "bg-[#eceaf3] text-[#4a4068]",
  ];
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.codePointAt(0)!) >>> 0;
  return tones[h % tones.length];
}

export const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

/** Coarse category for icon + colour, derived from the stored extension. */
export type MaterialCategory =
  | "doc"
  | "slides"
  | "sheet"
  | "image"
  | "audio"
  | "video"
  | "link";

export function categoryOf(kind: string): MaterialCategory {
  switch (kind.toUpperCase()) {
    case "PPT":
    case "PPTX":
      return "slides";
    case "XLS":
    case "XLSX":
      return "sheet";
    case "PNG":
    case "JPG":
    case "JPEG":
    case "WEBP":
      return "image";
    case "MP3":
    case "WAV":
    case "M4A":
      return "audio";
    case "MP4":
      return "video";
    case "LINK":
      return "link";
    default:
      return "doc";
  }
}

export function truncateMiddle(s: string, max = 64): string {
  if (s.length <= max) return s;
  const half = Math.floor((max - 1) / 2);
  return `${s.slice(0, half)}…${s.slice(-half)}`;
}
