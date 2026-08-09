import type { EventRow, AttendeeRow } from "../common/types";
import { STRINGS } from "../common/strings";
import { formatDate, escapeMarkdown } from "../common/helpers";
import * as queries from "./queries";

export async function createQuickEvent(
  env: { DB: D1Database },
  data: { chatId: number; title: string; creatorId: number; creatorName: string }
): Promise<{ event: EventRow; cardText: string }> {
  const db = queries.getDB(env);
  const event = await queries.createEvent(db, {
    chatId: data.chatId,
    title: data.title,
    creatorId: data.creatorId,
  });
  const cardText = buildEventCard(event, []);
  return { event, cardText };
}

export function buildEventCard(event: EventRow, attendeeList: AttendeeRow[]): string {
  const going = attendeeList.filter((a) => a.status === "going");
  const details = [
    event.eventDate ? `📅 ${formatDate(event.eventDate)}` : null,
    event.location ? `📍 ${escapeMarkdown(event.location)}` : null,
    event.attendeeLimit
      ? `👥 ${going.length}/${event.attendeeLimit}`
      : `👥 ${going.length} going`,
  ]
    .filter(Boolean)
    .join("\n");

  const attendeeNames = going.length
    ? `\n_Going:_ ${going.map((a) => escapeMarkdown(a.name)).join(", ")}`
    : "\n_No one yet_";

  return `*${escapeMarkdown(event.title)}*\n${details}${attendeeNames}`;
}

export function formatEventList(events: EventRow[], counts: Map<number, number>): string {
  if (!events.length) return STRINGS.noEvents;

  return (
    STRINGS.eventListHeader +
    events
      .map((e, i) =>
        STRINGS.eventListItem(
          i + 1,
          escapeMarkdown(e.title),
          e.eventDate ? formatDate(e.eventDate) : null,
          counts.get(e.id) ?? 0
        )
      )
      .join("")
  );
}
