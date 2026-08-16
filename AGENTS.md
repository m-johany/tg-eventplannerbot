# Agent Context: Telegram Event Planner Bot

Session date: 2026-08-17 (last updated)

---

## State: MVP Partially Built — Quick Create + RSVP + Admin Gating Done

Deployed baseline works: quick event creation, RSVP toggle, delete, `/events` list. Admin gating merged. Wizard + edit + attendee limits still missing.

---

## What's Done (as of 2026-08-17)

| Feature | State |
|---|---|
| Project scaffold (Workers + grammy + Drizzle + Vitest) | ✅ deployed |
| D1 schema (`events`, `attendees`) + migration | ✅ deployed |
| `/event <text>` quick create + event card + delete command message | ✅ |
| RSVP toggle (server-guarded unique per user) | ✅ |
| Delete event (creator-only via inline button) | ✅ |
| `/events` list sorted by date | ✅ |
| `/help` | ✅ |
| **Admin gating (2026-08-17)** | ✅ merged, **not deployed** |
| Wizard `/event new` | ❌ stub ("Wizard coming soon") |
| Edit event (title/date/location/limit) | ❌ stub ("Edit feature coming soon") |
| `/event edit <id>` / `/event cancel <id>` text commands | ❌ not registered |
| Delete → notify attendees | ❌ not implemented |
| `/events` pagination | ❌ not implemented |
| Post-MVP (polls, recurring, waitlists, reminders, ICS, inline) | ❌ untouched |

## Admin Gating (2026-08-17)

- `/event` (create): Telegram **group admins only**. Private chats denied ("Events work in group chats only.").
- `delete:` / `edit:` callbacks: event **creator OR group admin**.
- `/events`, `/help`, RSVP: open to everyone.
- Admin fetch via `getChatAdministrators()`; **fails closed** on API errors (deny, never allow).
- Cross-chat guard: event card forwarded to another group cannot be acted on there (`event.chatId !== chat.id` check).
- Code: `src/features/common/admin.ts` — `requireAdmin()`, `requireCreatorOrAdmin(env)`, pure helpers `parseEventId` / `isAdmin`. Tests: 31 passing.
- Design: `docs/superpowers/specs/2026-08-17-admin-gated-event-actions-design.md`. Plan: `docs/superpowers/plans/2026-08-17-admin-gated-event-actions.md`.
- Merged via PR #11 (squash, commit `6d6c50c`). **Not yet deployed** — `npm run deploy` pending.

## Stack Summary

```
Cloudflare Workers → grammy (webhook) → Drizzle → D1 (SQLite)
                                ↓
                            Luxon (dates)
                                ↓
                            Wrangler (CLI)
```

## Cloudflare / Deployment

- Worker: `telegram-event-bot`, account `76ee4fa5b2d22bb9997cb168498fa5e8`
- D1: `eventplanner-db` (`40cc68e8-98e7-49a1-b242-41804c07aeb0`), binding `DB`
- Bot token: `wrangler secret put BOT_TOKEN` (secret lives in Cloudflare, not repo)
- Deploy: `npm run deploy`; webhook configured at `/webhook` on first deploy
- DB migrate: `npm run db:migrate`

## Workflow Notes (important for agents)

- Feature-based structure: `src/features/events/` (handlers, service, queries, wizard), `src/features/common/` (strings, helpers, types, admin)
- All user-facing strings in `src/features/common/strings.ts`, English only
- grammy 1.45 quirks: `ChatMember` imports from `"grammy/types"` (NOT root); middleware factory return type is `MiddlewareFn<Context>` (NOT `Middleware<Context>` — union, no call signatures)
- Parse mode HTML everywhere
- Tests: `npm test` (Vitest), typecheck: `npx tsc --noEmit`. Both must stay green.
- Superpowers workflow used: spec → plan → subagent-driven execution → final review. Specs in `docs/superpowers/specs/`, plans in `docs/superpowers/plans/`.

---

## Next Steps (for next session)

1. **Deploy current state**: `npm run deploy` — admin gating is merged but not live.
2. Wizard `/event new` — `src/features/events/wizard.ts` is an empty stub; spec'd in PRD (name → date/time → location → confirm, skip/back/cancel).
3. Edit flow — per-field edit via inline buttons (title, date/time, location, attendee limit).
4. Attendee limit — column exists in schema, no UI.
5. `/event edit <id>` / `/event cancel <id>` text commands.
6. Delete → notify attendees.
7. `/events` pagination.

---

## Files to Reference

- `PRD.md` — full requirements, DB schema, command spec
- `docs/superpowers/specs/2026-08-17-admin-gated-event-actions-design.md` — admin feature design
- `docs/superpowers/plans/2026-08-17-admin-gated-event-actions.md` — admin feature implementation plan
- Old bot source in git history: `src/bot.ts`, `src/usecases.ts`, `src/core.ts`, `src/db.ts` — reference for Telegram integration patterns
