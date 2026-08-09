# PRD: Telegram Event Planner Bot

A Telegram bot for creating events with RSVPs, date/time scheduling, and attendee management. English-language, built on Cloudflare Workers.

---

## MVP Features

### Quick Event Creation
- `/event Pizza Friday` — creates event card instantly with just a description
- Deletes the command message, posts a rich event card with inline RSVP buttons
- No date/time required — works like the old CreateEventsBot

### Wizard Event Creation
- `/event new` starts a step-by-step conversation flow:
  1. Event name/title
  2. Date and time (with timezone handling)
  3. Location (optional)
  4. Confirm → publish
- Each step has inline buttons for common choices + text input
- Skip/back/cancel at each step

### Event Card (inline buttons)
- **RSVP** — "I'm going" / toggle off ("I'm out")
- **Edit** — change name, date/time, location, add attendee limit
- **Delete** — remove event entirely, notify attendees
- Live attendee count and list shown on the card

### Edit Event
- Inline button-triggered flow per field:
  - Change title
  - Change date/time
  - Change location
  - Set attendee limit
- Each change updates the event card immediately

### Calendar / List
- `/events` — lists upcoming events in the chat, sorted by date
- Shows: title, date, attendee count
- Pagination for many events

### RSVP
- Click "RSVP" → added to attendee list
- Click again → removed (toggle)
- Attendee names displayed on event card
- Same user can't RSVP twice (guarded server-side)

---

## Post-MVP (GitHub Issues)

- **Polls** — Doodle-style "which day works for everyone?" with multi-vote
- **Recurring events** — daily/weekly/monthly with RRULE-ish rules
- **Attendee limits + waitlists** — cap RSVPs, auto-waitlist overflow
- **Reminders** — scheduled DMs or group pings before event starts
- **Export** — ICS file generation / Google Calendar link
- **Inline mode** — `@botname` in any chat to create/browse events

---

## Stack

| Layer | Choice |
|---|---|
| Runtime | Cloudflare Workers |
| Database | D1 (Cloudflare-managed SQLite) |
| ORM | Drizzle ORM |
| Bot library | grammy (webhook mode) |
| Date handling | Luxon |
| CLI | Wrangler |
| Language | TypeScript (strict) |
| Testing | Vitest (unit tests for core logic) |

## Deployment

- Single `wrangler deploy` to ship
- Webhook mode (Workers can't poll)
- Set webhook via `bot.api.setWebhook(url)` on first deploy
- `wrangler secret put BOT_TOKEN` for the Telegram token
- D1 migrations via `wrangler d1 execute`

## Commands

| Command | Behavior |
|---|---|
| `/event <text>` | Quick create with description only |
| `/event new` | Step-by-step wizard |
| `/event edit <id>` | Edit an existing event |
| `/event cancel <id>` | Delete event, notify attendees |
| `/events` | List upcoming events |
| `/help` | Show available commands |

---

## Database Schema (D1)

```sql
CREATE TABLE events (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id       INTEGER NOT NULL,
  message_id    INTEGER,
  title         TEXT NOT NULL,
  description   TEXT,
  event_date    TEXT,        -- ISO 8601 datetime string
  location      TEXT,
  attendee_limit INTEGER,
  creator_id    INTEGER NOT NULL,
  status        TEXT NOT NULL DEFAULT 'active',  -- active, cancelled
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE attendees (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id  INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id   INTEGER NOT NULL,
  name      TEXT NOT NULL,
  status    TEXT NOT NULL DEFAULT 'going',  -- going, maybe, declined
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(event_id, user_id)
);
```

---

## Project Structure (feature-based)

```
src/
  features/
    events/
      handlers.ts     → bot command/callback handlers
      service.ts      → business logic
      queries.ts      → DB read/write
      wizard.ts       → conversation wizard steps
    common/
      strings.ts      → all English UI text
      helpers.ts      → shared utilities
      types.ts        → shared TypeScript types
  db/
    schema.ts         → Drizzle table definitions
    migrations/       → generated SQL migrations
  bot.ts              → grammy instance, middleware, route setup
  index.ts            → Cloudflare Worker entry (fetch handler)
```

## i18n

English only. All user-facing strings in `src/features/common/strings.ts`. No i18n framework overhead.

---

## Constraints
- No filesystem access (Workers are stateless)
- 30s execution timeout (Workers)
- Must use webhooks, not polling
- D1 is SQLite dialect — no Postgres features
