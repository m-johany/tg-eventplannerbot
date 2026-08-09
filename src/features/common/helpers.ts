import { DateTime } from "luxon";

export function formatDate(isoString: string | null): string {
  if (!isoString) return "";
  const dt = DateTime.fromISO(isoString);
  if (!dt.isValid) return isoString;
  return dt.toFormat("EEE, MMM d · h:mm a");
}

export function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&");
}

export function parseDateInput(input: string): DateTime | null {
  const trimmed = input.trim();

  // ISO-like: 2026-08-12 19:00 or 2026-08-12
  const isoMatch = /^(\d{4}-\d{2}-\d{2})(?:\s+(\d{1,2}:\d{2}))?$/.exec(trimmed);
  if (isoMatch) {
    const date = isoMatch[1]!;
    const time = isoMatch[2] ?? "00:00";
    const dt = DateTime.fromISO(`${date}T${time}:00`);
    if (dt.isValid) return dt;
  }

  return null;
}
