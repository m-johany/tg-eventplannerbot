export interface Env {
  DB: D1Database;
  BOT_TOKEN: string;
}

export interface EventRow {
  id: number;
  chatId: number;
  messageId: number | null;
  title: string;
  description: string | null;
  eventDate: string | null;
  location: string | null;
  attendeeLimit: number | null;
  creatorId: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttendeeRow {
  id: number;
  eventId: number;
  userId: number;
  name: string;
  status: string;
  createdAt: string;
}

export type EventStatus = "active" | "cancelled";
export type AttendeeStatus = "going" | "maybe" | "declined";
