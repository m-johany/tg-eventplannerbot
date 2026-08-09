import { eq, and, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { events, attendees } from "../../db/schema";
import type { EventRow, AttendeeRow, EventStatus } from "../common/types";

export function getDB(env: { DB: D1Database }) {
  return drizzle(env.DB);
}

export async function createEvent(
  db: ReturnType<typeof drizzle>,
  data: {
    chatId: number;
    title: string;
    description?: string;
    eventDate?: string;
    location?: string;
    attendeeLimit?: number;
    creatorId: number;
  }
): Promise<EventRow> {
  const result = await db.insert(events).values({
    chatId: data.chatId,
    title: data.title,
    description: data.description ?? null,
    eventDate: data.eventDate ?? null,
    location: data.location ?? null,
    attendeeLimit: data.attendeeLimit ?? null,
    creatorId: data.creatorId,
  }).returning();
  return result[0]! as EventRow;
}

export async function getEvent(
  db: ReturnType<typeof drizzle>,
  eventId: number
): Promise<EventRow | undefined> {
  const result = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  return result[0] as EventRow | undefined;
}

export async function getEventsByChat(
  db: ReturnType<typeof drizzle>,
  chatId: number,
  status: EventStatus = "active",
  limit = 20,
  offset = 0
): Promise<EventRow[]> {
  return (await db
    .select()
    .from(events)
    .where(and(eq(events.chatId, chatId), eq(events.status, status)))
    .orderBy(desc(events.eventDate), desc(events.createdAt))
    .limit(limit)
    .offset(offset)) as EventRow[];
}

export async function updateEvent(
  db: ReturnType<typeof drizzle>,
  eventId: number,
  data: {
    title?: string;
    description?: string;
    eventDate?: string;
    location?: string;
    attendeeLimit?: number;
    messageId?: number;
  }
): Promise<EventRow | undefined> {
  const result = await db
    .update(events)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(eq(events.id, eventId))
    .returning();
  return result[0] as EventRow | undefined;
}

export async function cancelEvent(
  db: ReturnType<typeof drizzle>,
  eventId: number
): Promise<EventRow | undefined> {
  const result = await db
    .update(events)
    .set({ status: "cancelled", updatedAt: new Date().toISOString() })
    .where(eq(events.id, eventId))
    .returning();
  return result[0] as EventRow | undefined;
}

export async function addAttendee(
  db: ReturnType<typeof drizzle>,
  data: { eventId: number; userId: number; name: string; status?: string }
): Promise<AttendeeRow> {
  const result = await db
    .insert(attendees)
    .values({
      eventId: data.eventId,
      userId: data.userId,
      name: data.name,
      status: data.status ?? "going",
    })
    .onConflictDoUpdate({
      target: [attendees.eventId, attendees.userId],
      set: { status: data.status ?? "going" },
    })
    .returning();
  return result[0]! as AttendeeRow;
}

export async function removeAttendee(
  db: ReturnType<typeof drizzle>,
  eventId: number,
  userId: number
): Promise<void> {
  await db
    .delete(attendees)
    .where(and(eq(attendees.eventId, eventId), eq(attendees.userId, userId)));
}

export async function getAttendees(
  db: ReturnType<typeof drizzle>,
  eventId: number
): Promise<AttendeeRow[]> {
  return (await db
    .select()
    .from(attendees)
    .where(eq(attendees.eventId, eventId))
    .orderBy(desc(attendees.createdAt))) as AttendeeRow[];
}

export async function getAttendeeCount(
  db: ReturnType<typeof drizzle>,
  eventId: number
): Promise<number> {
  const result = await getAttendees(db, eventId);
  return result.filter((a) => a.status === "going").length;
}
