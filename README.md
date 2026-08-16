# Telegram Event Bot

Create events in Telegram groups. People RSVP with one tap — no chat spam, just a clean event card with a live attendee list.

Built on Cloudflare Workers + D1. English only.

## Features

- `/event <text>` — instant event creation from a description (group admins only)
- Inline event card with live RSVP button, attendee count, and attendee list
- RSVP toggle — click to join, click again to opt out (server-guarded, no duplicates)
- Delete events via the card's Delete button (event creator or group admin)
- `/events` — list upcoming events in the chat
- `/help` — command overview

Planned: step-by-step wizard (`/event new`), event editing (title, date/time, location, attendee limit), reminders, polls, recurring events. See `PRD.md`.

## Commands

| Command | Behavior |
|---|---|
| `/event <text>` | Create event instantly (group admins only) |
| `/event new` | Step-by-step wizard (coming soon) |
| `/event edit <id>` | Edit an event (coming soon) |
| `/event cancel <id>` | Delete event, notify attendees (coming soon) |
| `/events` | List upcoming events |
| `/help` | Show available commands |

## Permissions

- **Creating** events: Telegram group admins only.
- **Deleting / editing** events: event creator or group admin.
- **RSVP and listing**: everyone.
- Private chats: event creation is disabled ("Events work in group chats only.").

## How to add the bot to your group

1. Open the Telegram group where you want events.
2. Add the bot to the group and promote it to admin.
3. Give it the "Delete Messages" right — the bot deletes the `/event` command message and replaces it with the event card. Nothing else is deleted.

## Local development

### Prerequisites

- Node.js 18+
- A Cloudflare account
- A Telegram bot token from [BotFather](https://core.telegram.org/bots#how-do-i-create-a-bot)

### Setup

1. Clone the repository.
2. `npm install`
3. Create a D1 database:
   ```bash
   npx wrangler d1 create eventplanner-db
   ```
   Copy the returned `database_id` into `wrangler.toml`.
4. Apply migrations locally:
   ```bash
   npm run db:migrate:local
   ```
5. Set your bot token locally:
   ```bash
   npx wrangler secret put BOT_TOKEN
   ```
6. Run the dev server:
   ```bash
   npm run dev
   ```

The bot uses webhooks (Workers cannot poll). For local development with a real Telegram bot, point the webhook at a tunnel (e.g. Cloudflare Tunnel) and set it via:

```
curl https://api.telegram.org/bot<TOKEN>/setWebhook?url=<WORKER_URL>/webhook
```

## Deploying

1. Apply migrations to the remote D1 database:
   ```bash
   npm run db:migrate
   ```
2. Deploy:
   ```bash
   npm run deploy
   ```
3. Set the webhook on first deploy:
   ```
   curl https://api.telegram.org/bot<TOKEN>/setWebhook?url=<WORKER_URL>/webhook
   ```

## Development

- `npm test` — run unit tests (Vitest)
- `npm run typecheck` — TypeScript strict check
- `npm run db:generate` — regenerate Drizzle migrations

### Project structure

```
src/
  features/
    events/
      handlers.ts     → bot command/callback handlers
      service.ts      → business logic
      queries.ts      → DB read/write
      wizard.ts       → conversation wizard (planned)
    common/
      strings.ts      → all English UI text
      helpers.ts      → shared utilities
      admin.ts        → admin-check middlewares
      types.ts        → shared TypeScript types
  db/
    schema.ts         → Drizzle table definitions
    migrations/       → generated SQL migrations
  bot.ts              → grammy instance, route setup
  index.ts            → Cloudflare Worker entry (fetch handler)
```

## Tech Stack

| Layer | Choice |
|---|---|
| Runtime | Cloudflare Workers |
| Database | D1 (SQLite) |
| ORM | Drizzle ORM |
| Bot library | grammy (webhook mode) |
| Date handling | Luxon |
| Language | TypeScript (strict) |
| Testing | Vitest |

## Contributing

Pull requests welcome. Check `AGENTS.md` for project context, conventions, and current state.
