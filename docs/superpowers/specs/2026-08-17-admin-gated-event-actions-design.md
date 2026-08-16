# Admin-Gated Event Actions — Design

**Date:** 2026-08-17
**Status:** Approved

## Goal

Restrict event actions to users with admin privileges (Telegram group admins) plus the event creator where applicable:

- **Create** (`/event`): group admins only.
- **Delete** (`delete:` callback): event creator OR group admin.
- **Edit** (`edit:` callback): event creator OR group admin (edit UI itself still a future feature — gate applies when it lands).
- **List** (`/events`), **Help** (`/help`), **RSVP**: open to everyone — viewing and RSVPing are harmless.

Private chats: event creation/management blocked — "Events work in group chats only." (No group = no admin concept = no events.)

## Approach

grammy middleware (option B):

- `requireAdmin(ctx, next)` — for `/event`.
- `requireCreatorOrAdmin(ctx, next)` — for `delete:` and `edit:` callbacks.

New file `src/features/common/admin.ts`. Middlewares registered per-command in `handlers.ts`.

## Components

### `src/features/common/admin.ts`

Pure helpers (unit-testable):

```ts
parseEventId(data: string): number | null
// "delete:42" / "edit:42" -> 42, anything else -> null

isAdmin(admins: ChatMember[], userId: number): boolean
// admins.some(a => a.user.id === userId)
// Chat creator appears in the admin list with status "creator", so covered.
```

Middlewares:

- `requireAdmin(ctx, next)`
  1. Resolve chat: `ctx.chat ?? ctx.message?.chat`; userId: `ctx.from?.id`. Missing either → deny + stop.
  2. Chat type `private` → reply `STRINGS.groupOnly` + stop.
  3. `ctx.getChatAdministrators()` → catch → reply `STRINGS.somethingWentWrong` + stop (**fail closed**).
  4. `isAdmin(admins, userId)` → `next()`, else reply `STRINGS.adminOnly` + stop.
- `requireCreatorOrAdmin(ctx, next)`
  1. Same chat resolution and private-chat guard.
  2. `parseEventId(callbackData)` → null → deny + stop.
  3. Load event via `queries.getEvent(db, id)` (D1). Missing → `STRINGS.eventNotFound`.
  4. `event.creatorId === userId` → `next()`.
  5. Else admin fetch (fail closed as above) → `next()` if admin, else `STRINGS.notCreator`.

### `handlers.ts` changes

```ts
bot.command("event", requireAdmin, handler);
bot.callbackQuery(/^delete:(\d+)$/, requireCreatorOrAdmin, handler);
bot.callbackQuery(/^edit:(\d+)$/, requireCreatorOrAdmin, handler);
```

Existing `creatorId !== user.id` check inside delete handler becomes redundant — remove (middleware guarantees it). `/events`, `/help`, `rsvp:` untouched.

### `strings.ts` additions

```ts
adminOnly: "Only admins can create events.",
groupOnly: "Events work in group chats only.",
```

## Error Handling

- Admin fetch failure (basic group, bot removed, Telegram API error): **fail closed** — deny with `STRINGS.somethingWentWrong`. Never allow unknown user through on API failure.
- Basic (non-supergroup) groups: `getChatAdministrators` may fail → fail closed. Acceptable: all newly created Telegram groups are supergroups.
- Duplicate D1 read: `requireCreatorOrAdmin` reads the event, delete handler reads it again. Accepted — keeps middleware and handler independent; D1 read is cheap.

## Testing

- `admin.test.ts` — pure helpers: `parseEventId` (valid / invalid / missing), `isAdmin` (admin yes / non-admin no / chat creator yes).
- Middleware tests with mocked grammy ctx (vi.mock or hand-rolled ctx objects):
  - private chat denied
  - non-admin denied, `next` not called
  - admin passes, `next` called
  - `getChatAdministrators` throws → denied, fail closed
  - creator passes `requireCreatorOrAdmin` without admin fetch
  - non-creator non-admin denied with `notCreator`
- Existing 12 tests untouched, stay green. `tsc --noEmit` clean.

## Out of Scope

- Edit UI flow (wizard) — separate feature; gate wiring included here.
- Admin list caching — single API call per gated action, Workers stateless.
- Config-based admin list (env var) — rejected during brainstorming.
