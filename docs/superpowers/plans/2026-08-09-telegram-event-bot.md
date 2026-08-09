# Telegram Event Planner Bot — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite Telegram event bot from scratch on Cloudflare Workers with grammy, D1, and Drizzle ORM.

**Architecture:** Cloudflare Workers webhook entry → grammy bot instance → feature handlers → service layer → Drizzle queries → D1 (SQLite). Feature-based structure under `src/features/events/`.

**Tech Stack:** TypeScript (strict), grammy, Drizzle ORM, D1, Luxon, Wrangler, Vitest

## Global Constraints

- Runtime: Cloudflare Workers — no filesystem, 30s timeout, webhook mode only
- DB: D1 (SQLite dialect) — no Postgres features
- Language: TypeScript strict mode, English only
- No i18n framework — all strings in `src/features/common/strings.ts`
- Old code deleted except `.md` files and `.git`
- Telegram token via `wrangler secret put BOT_TOKEN`
- Cloudflare account: `76ee4fa5b2d22bb9997cb168498fa5e8`

---

### Task 1: Project Scaffold & Cleanup

**Files:**
- Delete: `src/bot.ts`, `src/core.ts`, `src/db.ts`, `src/models.ts`, `src/usecases.ts`, `src/stuff/*`, `index.ts`, `scripts/deploy.sh`, `package.json`, `yarn.lock`, `tsconfig.json`, `.eslintrc.json`, `.eslintignore`, `.env_example`
- Create: `wrangler.toml`, `package.json`, `tsconfig.json`, `.gitignore`, `src/index.ts`, `src/bot.ts`, `src/db/schema.ts`, `src/features/common/strings.ts`, `src/features/common/helpers.ts`, `src/features/common/types.ts`, `src/features/events/handlers.ts`, `src/features/events/service.ts`, `src/features/events/queries.ts`, `src/features/events/wizard.ts`

**Interfaces:**
- Produces: Project skeleton with all directories and empty files, `wrangler.toml` with D1 binding placeholder, `package.json` with all deps, `tsconfig.json` for Workers

- [ ] **Step 1: Delete old source files**

Delete all old source files but keep `.md` files, `.git`, `.gitignore`, and `.specstory/`.
```bash
# Files to delete:
src/bot.ts, src/core.ts, src/db.ts, src/models.ts, src/usecases.ts
src/stuff/db-helper.ts, src/stuff/environment-variables.ts, src/stuff/i18n.ts, src/stuff/pretty.ts, src/stuff/start-express.ts
index.ts, scripts/deploy.sh, package.json, yarn.lock, tsconfig.json
.eslintrc.json, .eslintignore, .env_example
```

- [ ] **Step 2: Create package.json**

```json
{
  "name": "telegram-event-bot",
  "version": "0.1.0",
  "description": "Telegram Event Planner Bot on Cloudflare Workers",
  "private": true,
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "wrangler d1 execute eventplanner-db --file=./src/db/migrations/migration.sql",
    "db:migrate:local": "wrangler d1 execute eventplanner-db --local --file=./src/db/migrations/migration.sql",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "grammy": "^1.34.0",
    "luxon": "^3.5.0"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20250808.0",
    "@types/luxon": "^3.4.2",
    "drizzle-kit": "^0.28.0",
    "drizzle-orm": "^0.36.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0",
    "wrangler": "^3.90.0"
  }
}
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "types": ["@cloudflare/workers-types"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 4: Create wrangler.toml**

```toml
name = "telegram-event-bot"
main = "src/index.ts"
compatibility_date = "2025-08-09"

[[d1_databases]]
binding = "DB"
database_name = "eventplanner-db"
database_id = "PLACEHOLDER"

[observability]
enabled = true
```

- [ ] **Step 5: Create .gitignore**

```
node_modules/
dist/
.wrangler/
.env
.env.production
*.db
*.db-journal
```

- [ ] **Step 6: Create directory structure and empty source files**

```
src/
  index.ts          — empty (Cloudflare Worker fetch handler)
  bot.ts            — empty (grammy instance)
  db/
    schema.ts       — empty (Drizzle table definitions)
    migrations/     — empty dir
  features/
    common/
      strings.ts    — empty (English UI strings)
      helpers.ts    — empty (shared utilities)
      types.ts      — empty (shared types)
    events/
      handlers.ts   — empty (bot command/callback handlers)
      service.ts    — empty (business logic)
      queries.ts    — empty (DB read/write)
      wizard.ts     — empty (conversation wizard)
```

- [ ] **Step 7: Install dependencies**

```bash
npm install
```

- [ ] **Step 8: Verify scaffold**

```bash
npx tsc --noEmit  # Should pass (empty files)
```

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: scaffold project with wrangler, grammy, drizzle, vitest"
```

---

### Task 2: D1 Schema & Migrations

**Files:**
- Create: `src/db/schema.ts`
- Create: `src/db/migrations/0000_initial.sql` (generated by drizzle-kit)
- Create: `drizzle.config.ts`

**Interfaces:**
- Consumes: Project scaffold from Task 1
- Produces: Drizzle schema with `events` and `attendees` tables, typed exports

- [ ] **Step 1: Write drizzle.config.ts**

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "sqlite",
  driver: "d1-http",
  dbCredentials: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
    databaseId: process.env.CLOUDFLARE_DATABASE_ID!,
    token: process.env.CLOUDFLARE_API_TOKEN!,
  },
});
```

- [ ] **Step 2: Write src/db/schema.ts**

```typescript
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
```

- [ ] **Step 3: Write initial SQL migration**

```sql
-- src/db/migrations/0000_initial.sql
CREATE TABLE events (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id       INTEGER NOT NULL,
  message_id    INTEGER,
  title         TEXT NOT NULL,
  description   TEXT,
  event_date    TEXT,
  location      TEXT,
  attendee_limit INTEGER,
  creator_id    INTEGER NOT NULL,
  status        TEXT NOT NULL DEFAULT 'active',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE attendees (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id  INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id   INTEGER NOT NULL,
  name      TEXT NOT NULL,
  status    TEXT NOT NULL DEFAULT 'going',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX unique_event_user ON attendees(event_id, user_id);
```

- [ ] **Step 4: Commit**

```bash
git add src/db/schema.ts src/db/migrations/0000_initial.sql drizzle.config.ts
git commit -m "feat: add D1 schema and initial migration"
```

---

### Task 3: Bot Core — grammy Instance & Webhook Entry

**Files:**
- Modify: `src/index.ts`
- Modify: `src/bot.ts`
- Create: `src/features/common/types.ts`
- Create: `src/features/common/strings.ts`

**Interfaces:**
- Consumes: Schema from Task 2 (types only — no DB logic yet)
- Produces:
  - `src/index.ts`: exports `fetch` handler with webhook callback
  - `src/bot.ts`: exports configured `Bot` instance and `webhookCallback`
  - `src/features/common/types.ts`: `Env` interface with `DB: D1Database`, `BOT_TOKEN: string`
  - `src/features/common/strings.ts`: `STRINGS` object with all English UI text

- [ ] **Step 1: Write src/features/common/types.ts**

```typescript
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
```

- [ ] **Step 2: Write src/features/common/strings.ts**

```typescript
export const STRINGS = {
  // Commands
  help: `🎉 *Event Planner Bot*\n\nCommands:\n/event _text_ — create event instantly\n/event new — step-by-step wizard\n/event edit _id_ — edit event\n/event cancel _id_ — delete event\n/events — list upcoming events\n/help — this message`,

  // Event card
  eventCard: (title: string, details: string, attendees: string) =>
    `*${title}*\n${details}\n\n${attendees}`,
  rsvpYes: "✅ I'm going",
  rsvpNo: "❌ I'm out",
  editEvent: "✏️ Edit",
  deleteEvent: "🗑️ Delete",

  // Wizard
  wizardTitle: "Enter event name:",
  wizardDate: "Enter date and time (e.g. 2026-08-12 19:00):",
  wizardLocation: "Enter location (or /skip):",
  wizardConfirm: (title: string, date: string | null, location: string | null) =>
    `Create event?\n\n*${title}*\n${date ? `📅 ${date}\n` : ""}${location ? `📍 ${location}` : ""}`,
  wizardCancelled: "Event creation cancelled.",

  // Quick create
  eventCreated: "✅ Event created!",
  eventCancelled: "🗑️ Event cancelled.",
  eventUpdated: "✏️ Event updated.",

  // RSVP
  rsvpAdded: (name: string) => `${name} is going!`,
  rsvpRemoved: (name: string) => `${name} is no longer going.`,

  // List
  noEvents: "No upcoming events.",
  eventListHeader: "*Upcoming Events:*\n\n",
  eventListItem: (n: number, title: string, date: string | null, count: number) =>
    `${n}. ${title}${date ? ` — ${date}` : ""} (${count} going)\n`,

  // Errors
  eventNotFound: "Event not found.",
  notCreator: "Only the event creator can do that.",
  invalidDate: "Invalid date format. Try: YYYY-MM-DD HH:MM",
  somethingWentWrong: "Something went wrong. Please try again.",
} as const;
```

- [ ] **Step 3: Write src/bot.ts**

```typescript
import { Bot, webhookCallback } from "grammy";
import type { Env } from "./features/common/types";

export function createBot(token: string): Bot {
  const bot = new Bot(token);

  // Global error handler
  bot.catch((err) => {
    console.error("Bot error:", err.message);
  });

  // Register commands here as features are built

  return bot;
}

export function createWebhookCallback(bot: Bot) {
  return webhookCallback(bot, "cloudflare");
}
```

- [ ] **Step 4: Write src/index.ts**

```typescript
import { createBot, createWebhookCallback } from "./bot";
import type { Env } from "./features/common/types";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const bot = createBot(env.BOT_TOKEN);
    const handleUpdate = createWebhookCallback(bot);

    try {
      const url = new URL(request.url);
      if (url.pathname === "/webhook") {
        return await handleUpdate(request);
      }
      return new Response("OK", { status: 200 });
    } catch (error) {
      console.error("Worker error:", error);
      return new Response("Error", { status: 500 });
    }
  },
};
```

- [ ] **Step 5: Verify typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add src/index.ts src/bot.ts src/features/common/types.ts src/features/common/strings.ts
git commit -m "feat: add bot core — grammy instance, webhook entry, strings, types"
```

---

### Task 4: Event Feature — Queries & Service

**Files:**
- Modify: `src/features/events/queries.ts`
- Modify: `src/features/events/service.ts`
- Create: `src/features/common/helpers.ts`

**Interfaces:**
- Consumes: Schema from Task 2, types from Task 3
- Produces:
  - `queries.ts`: `createEvent()`, `getEvent()`, `getEventsByChat()`, `updateEvent()`, `cancelEvent()`, `addAttendee()`, `removeAttendee()`, `getAttendees()`
  - `service.ts`: `createQuickEvent()`, `getEventCard()`, `toggleRsvp()`, `formatEventList()`
  - `helpers.ts`: `formatDate()`, `escapeMarkdown()`

- [ ] **Step 1: Write src/features/common/helpers.ts**

```typescript
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
  // Accept: "YYYY-MM-DD HH:MM", "YYYY-MM-DD", "tomorrow 7pm", etc.
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
```

- [ ] **Step 2: Write src/features/events/queries.ts**

```typescript
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
```

- [ ] **Step 3: Write src/features/events/service.ts**

```typescript
import type { EventRow, AttendeeRow } from "../common/types";
import { STRINGS } from "../common/strings";
import { formatDate, escapeMarkdown } from "../common/helpers";
import * as queries from "./queries";
import { drizzle } from "drizzle-orm/d1";

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
```

- [ ] **Step 4: Verify typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/features/events/queries.ts src/features/events/service.ts src/features/common/helpers.ts
git commit -m "feat: add event queries and service layer"
```

---

### Task 5: Event Feature — Handlers & Commands

**Files:**
- Modify: `src/features/events/handlers.ts`
- Modify: `src/bot.ts`

**Interfaces:**
- Consumes: Service from Task 4, types from Task 3
- Produces:
  - `handlers.ts`: `registerEventHandlers(bot)` — registers `/event`, `/events`, and callback handlers
  - Updated `bot.ts` that calls `registerEventHandlers`

- [ ] **Step 1: Write src/features/events/handlers.ts**

```typescript
import { Bot, InlineKeyboard, Context } from "grammy";
import * as service from "./service";
import * as queries from "./queries";
import { STRINGS } from "../common/strings";
import { escapeMarkdown } from "../common/helpers";
import type { Env } from "../common/types";

export function registerEventHandlers(bot: Bot, env: Env): void {
  // /event <text> — quick create
  bot.command("event", async (ctx: Context) => {
    const text = ctx.match?.toString().trim();
    if (!text || text === "new" || text === "edit" || text === "cancel") {
      // These subcommands are handled separately or not yet implemented
      if (text === "new") {
        return ctx.reply("Wizard coming soon. Use /event Your Event Title for quick create.", { parse_mode: "HTML" });
      }
      return ctx.reply(STRINGS.help, { parse_mode: "HTML" });
    }

    const msg = ctx.message;
    if (!msg || !msg.from) return;

    try {
      // Delete command message
      await ctx.deleteMessage().catch(() => {});

      const { event, cardText } = await service.createQuickEvent(env, {
        chatId: msg.chat.id,
        title: text,
        creatorId: msg.from.id,
        creatorName: [msg.from.first_name, msg.from.last_name].filter(Boolean).join(" ") || "Unknown",
      });

      const keyboard = new InlineKeyboard()
        .text(STRINGS.rsvpYes, `rsvp:${event.id}`)
        .row()
        .text(STRINGS.editEvent, `edit:${event.id}`)
        .text(STRINGS.deleteEvent, `delete:${event.id}`);

      const sent = await ctx.reply(cardText, {
        parse_mode: "HTML",
        reply_markup: keyboard,
      });

      // Store message_id for future updates
      await queries.updateEvent(queries.getDB(env), event.id, {
        messageId: sent.message_id,
      });
    } catch (error) {
      console.error("Event creation error:", error);
      await ctx.reply(STRINGS.somethingWentWrong, { parse_mode: "HTML" });
    }
  });

  // /events — list upcoming
  bot.command("events", async (ctx: Context) => {
    const msg = ctx.message;
    if (!msg) return;

    try {
      const db = queries.getDB(env);
      const eventList = await queries.getEventsByChat(db, msg.chat.id);
      const counts = new Map<number, number>();
      for (const e of eventList) {
        counts.set(e.id, await queries.getAttendeeCount(db, e.id));
      }
      const text = service.formatEventList(eventList, counts);
      await ctx.reply(text, { parse_mode: "HTML" });
    } catch (error) {
      console.error("Event list error:", error);
      await ctx.reply(STRINGS.somethingWentWrong, { parse_mode: "HTML" });
    }
  });

  // RSVP callback
  bot.callbackQuery(/^rsvp:(\d+)$/, async (ctx: Context) => {
    const match = /^rsvp:(\d+)$/.exec(ctx.callbackQuery?.data ?? "");
    if (!match) return;
    const eventId = parseInt(match[1]!);
    const user = ctx.callbackQuery?.from;
    if (!user) return;

    try {
      const db = queries.getDB(env);
      const event = await queries.getEvent(db, eventId);
      if (!event) {
        return ctx.answerCallbackQuery(STRINGS.eventNotFound);
      }

      const existingAttendees = await queries.getAttendees(db, eventId);
      const existing = existingAttendees.find((a) => a.userId === user.id);
      const userName = [user.first_name, user.last_name].filter(Boolean).join(" ") || "Unknown";

      if (existing) {
        await queries.removeAttendee(db, eventId, user.id);
        await ctx.answerCallbackQuery(STRINGS.rsvpRemoved(userName));
      } else {
        await queries.addAttendee(db, {
          eventId,
          userId: user.id,
          name: userName,
        });
        await ctx.answerCallbackQuery(STRINGS.rsvpAdded(userName));
      }

      // Update the event card
      const updatedAttendees = await queries.getAttendees(db, eventId);
      const cardText = service.buildEventCard(event, updatedAttendees);
      const keyboard = new InlineKeyboard()
        .text(STRINGS.rsvpYes, `rsvp:${event.id}`)
        .row()
        .text(STRINGS.editEvent, `edit:${event.id}`)
        .text(STRINGS.deleteEvent, `delete:${event.id}`);

      if (event.messageId) {
        await ctx.api.editMessageText(event.chatId, event.messageId, cardText, {
          parse_mode: "HTML",
          reply_markup: keyboard,
        }).catch(() => {});
      }
    } catch (error) {
      console.error("RSVP error:", error);
      await ctx.answerCallbackQuery(STRINGS.somethingWentWrong);
    }
  });

  // Delete callback
  bot.callbackQuery(/^delete:(\d+)$/, async (ctx: Context) => {
    const match = /^delete:(\d+)$/.exec(ctx.callbackQuery?.data ?? "");
    if (!match) return;
    const eventId = parseInt(match[1]!);
    const user = ctx.callbackQuery?.from;
    if (!user) return;

    try {
      const db = queries.getDB(env);
      const event = await queries.getEvent(db, eventId);
      if (!event) {
        return ctx.answerCallbackQuery(STRINGS.eventNotFound);
      }
      if (event.creatorId !== user.id) {
        return ctx.answerCallbackQuery(STRINGS.notCreator);
      }

      await queries.cancelEvent(db, eventId);

      // Update card to show cancelled
      if (event.messageId) {
        await ctx.api.editMessageText(
          event.chatId,
          event.messageId,
          `~~${event.title}~~\n_${STRINGS.eventCancelled}_`,
          { parse_mode: "HTML" }
        ).catch(() => {});
      }

      await ctx.answerCallbackQuery(STRINGS.eventCancelled);
    } catch (error) {
      console.error("Delete error:", error);
      await ctx.answerCallbackQuery(STRINGS.somethingWentWrong);
    }
  });

  // Edit callback (placeholder — full wizard in post-MVP)
  bot.callbackQuery(/^edit:(\d+)$/, async (ctx: Context) => {
    await ctx.answerCallbackQuery("Edit feature coming soon!");
  });

  // /help
  bot.command("help", async (ctx: Context) => {
    await ctx.reply(STRINGS.help, { parse_mode: "HTML" });
  });
}
```

- [ ] **Step 2: Update src/bot.ts to wire handlers**

```typescript
import { Bot, webhookCallback } from "grammy";
import type { Env } from "./features/common/types";
import { registerEventHandlers } from "./features/events/handlers";

export function createBot(env: Env): Bot {
  const bot = new Bot(env.BOT_TOKEN);

  // Global error handler
  bot.catch((err) => {
    console.error("Bot error:", err.message);
  });

  // Register feature handlers
  registerEventHandlers(bot, env);

  return bot;
}

export function createWebhookCallback(bot: Bot) {
  return webhookCallback(bot, "cloudflare");
}
```

- [ ] **Step 3: Update src/index.ts for new bot signature**

```typescript
import { createBot, createWebhookCallback } from "./bot";
import type { Env } from "./features/common/types";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const bot = createBot(env);
    const handleUpdate = createWebhookCallback(bot);

    try {
      const url = new URL(request.url);
      if (url.pathname === "/webhook") {
        return await handleUpdate(request);
      }
      return new Response("OK", { status: 200 });
    } catch (error) {
      console.error("Worker error:", error);
      return new Response("Error", { status: 500 });
    }
  },
};
```

- [ ] **Step 4: Verify typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/features/events/handlers.ts src/bot.ts src/index.ts
git commit -m "feat: add event handlers — quick create, RSVP, delete, list"
```

---

### Task 6: Tests & Final Wiring

**Files:**
- Create: `src/features/events/__tests__/service.test.ts`
- Create: `src/features/common/__tests__/helpers.test.ts`
- Create: `vitest.config.ts`

**Interfaces:**
- Consumes: All prior tasks
- Produces: Passing test suite for core logic

- [ ] **Step 1: Write vitest.config.ts**

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
  },
});
```

- [ ] **Step 2: Write src/features/common/__tests__/helpers.test.ts**

```typescript
import { describe, it, expect } from "vitest";
import { formatDate, escapeMarkdown, parseDateInput } from "../helpers";

describe("formatDate", () => {
  it("returns empty string for null", () => {
    expect(formatDate(null)).toBe("");
  });

  it("formats ISO date string", () => {
    const result = formatDate("2026-08-12T19:00:00.000Z");
    expect(result).toContain("Aug 12");
  });
});

describe("escapeMarkdown", () => {
  it("escapes asterisks", () => {
    expect(escapeMarkdown("hello *world*")).toBe("hello \\*world\\*");
  });

  it("escapes underscores", () => {
    expect(escapeMarkdown("hello_world")).toBe("hello\\_world");
  });
});

describe("parseDateInput", () => {
  it("parses YYYY-MM-DD HH:MM", () => {
    const result = parseDateInput("2026-08-12 19:00");
    expect(result).not.toBeNull();
    expect(result!.year).toBe(2026);
    expect(result!.month).toBe(8);
    expect(result!.day).toBe(12);
  });

  it("returns null for invalid input", () => {
    expect(parseDateInput("not a date")).toBeNull();
  });
});
```

- [ ] **Step 3: Write src/features/events/__tests__/service.test.ts**

```typescript
import { describe, it, expect } from "vitest";
import { buildEventCard, formatEventList } from "../service";
import type { EventRow, AttendeeRow } from "../../common/types";

function makeEvent(overrides: Partial<EventRow> = {}): EventRow {
  return {
    id: 1,
    chatId: 123,
    messageId: null,
    title: "Test Event",
    description: null,
    eventDate: "2026-08-12T19:00:00.000Z",
    location: "Berlin",
    attendeeLimit: null,
    creatorId: 456,
    status: "active",
    createdAt: "2026-08-09T00:00:00.000Z",
    updatedAt: "2026-08-09T00:00:00.000Z",
    ...overrides,
  };
}

function makeAttendee(overrides: Partial<AttendeeRow> = {}): AttendeeRow {
  return {
    id: 1,
    eventId: 1,
    userId: 789,
    name: "Alice",
    status: "going",
    createdAt: "2026-08-09T00:00:00.000Z",
    ...overrides,
  };
}

describe("buildEventCard", () => {
  it("renders event title", () => {
    const card = buildEventCard(makeEvent(), []);
    expect(card).toContain("Test Event");
  });

  it("shows 0 going with no attendees", () => {
    const card = buildEventCard(makeEvent(), []);
    expect(card).toContain("0 going");
    expect(card).toContain("No one yet");
  });

  it("shows attendee names", () => {
    const card = buildEventCard(makeEvent(), [
      makeAttendee({ name: "Alice" }),
      makeAttendee({ id: 2, name: "Bob", userId: 999 }),
    ]);
    expect(card).toContain("2 going");
    expect(card).toContain("Alice");
    expect(card).toContain("Bob");
  });

  it("shows attendee limit", () => {
    const card = buildEventCard(makeEvent({ attendeeLimit: 10 }), [
      makeAttendee(),
    ]);
    expect(card).toContain("1/10");
  });
});

describe("formatEventList", () => {
  it("returns no events message for empty list", () => {
    const result = formatEventList([], new Map());
    expect(result).toContain("No upcoming events");
  });

  it("formats event list with counts", () => {
    const events = [makeEvent({ id: 1 }), makeEvent({ id: 2, title: "Second" })];
    const counts = new Map([[1, 3], [2, 0]]);
    const result = formatEventList(events, counts);
    expect(result).toContain("Test Event");
    expect(result).toContain("Second");
    expect(result).toContain("(3 going)");
    expect(result).toContain("(0 going)");
  });
});
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run
```
Expected: All tests pass.

- [ ] **Step 5: Run full typecheck**

```bash
npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts src/features/common/__tests__/ src/features/events/__tests__/
git commit -m "test: add unit tests for helpers and event service"
```

---

### Task 7: D1 Database Creation & Deployment Prep

**Files:**
- Modify: `wrangler.toml` (fill database_id)

**Steps:**

- [ ] **Step 1: Create D1 database via Wrangler**

```bash
npx wrangler d1 create eventplanner-db
```
Capture the returned `database_id` and update `wrangler.toml`.

- [ ] **Step 2: Update wrangler.toml with real database_id**

Replace `PLACEHOLDER` with actual id from Step 1.

- [ ] **Step 3: Run migration on remote DB**

```bash
npx wrangler d1 execute eventplanner-db --file=./src/db/migrations/0000_initial.sql
```

- [ ] **Step 4: Set bot token secret**

```bash
npx wrangler secret put BOT_TOKEN
```

- [ ] **Step 5: Deploy**

```bash
npx wrangler deploy
```

- [ ] **Step 6: Set webhook**

After deploy, note the worker URL and set webhook:
```
curl https://api.telegram.org/bot<TOKEN>/setWebhook?url=<WORKER_URL>/webhook
```

- [ ] **Step 7: Commit**

```bash
git add wrangler.toml
git commit -m "chore: configure D1 database and deployment"
```
