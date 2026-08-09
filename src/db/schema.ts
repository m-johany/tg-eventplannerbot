import { sqliteTable, integer, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const events = sqliteTable("events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  chatId: integer("chat_id").notNull(),
  messageId: integer("message_id"),
  title: text("title").notNull(),
  description: text("description"),
  eventDate: text("event_date"),
  location: text("location"),
  attendeeLimit: integer("attendee_limit"),
  creatorId: integer("creator_id").notNull(),
  status: text("status").notNull().default("active"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export const attendees = sqliteTable("attendees", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  eventId: integer("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  status: text("status").notNull().default("going"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
}, (table) => ({
  uniqueEventUser: uniqueIndex("unique_event_user").on(table.eventId, table.userId),
}));
