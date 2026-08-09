# Agent Context: Telegram Event Planner Bot

Session date: 2026-08-09

---

## State: Design Complete, Ready to Scaffold

All architectural decisions made. PRD written. Implementation starts now.

---

## Decisions Log (from grilling session)

| # | Decision | Choice | Rationale |
|---|---|---|---|
| Q1 | Core scope | B + C: date/time events + full management | Polls, recurring, limits, waitlists |
| Q2 | Codebase strategy | Rewrite from scratch | Old code: no tests, German hardcoded, no migrations, `any` types. Fresh foundation needed |
| Q3 | Language/runtime | TypeScript + Node (Cloudflare Workers) | Same ecosystem, grammy is TS-first |
| Q4 | Database | D1 (SQLite) + Drizzle ORM | Managed, Worker-native, Drizzle gives migrations + typed queries |
| Q5 | Bot library | grammy | TS-first, middleware pattern, conversation plugin, active community |
| Q6 | Command interface | Hybrid (C): quick + wizard | `/event Pizza` = instant, `/event new` = wizard, edit-after-create |
| Q7 | Subcommands | Overloaded `/event` | Single namespace, discoverable via `/event [tab]` |
| Q8 | MVP scope | Quick event, wizard, date/time, edit/cancel, calendar list, English | Post-MVP → GitHub issues |
| Q9 | i18n | English only, no framework | Keep it simple |
| Q10 | Testing | Unit tests for core logic (Vitest) | Mock Telegram, skip integration tests for now |
| Q11 | Date library | Luxon | First-class timezone support, critical for event planning |
| Q12 | Project structure | Feature-based | `features/events/`, `features/common/`, `db/` — scales to polls/reminders later |
| Q13 | Deployment | Cloudflare Workers + Wrangler | No server, D1 native, Queues for reminders, webhook mode |

---

## Stack Summary

```
Cloudflare Workers → grammy (webhook) → Drizzle → D1 (SQLite)
                                ↓
                            Luxon (dates)
                                ↓
                            Wrangler (CLI)
```

---

## Key Differences from Old Bot

| Aspect | Old Bot | New Bot |
|---|---|---|
| Runtime | VPS + polling | Workers + webhooks |
| DB | Raw sqlite3, manual SQL | D1 + Drizzle ORM + migrations |
| Bot lib | node-telegram-bot-api | grammy |
| Language | TypeScript, lax | TypeScript, strict |
| Tests | None | Vitest unit tests |
| Commands | `/event` only | `/event`, `/event new`, `/event edit`, `/event cancel`, `/events` |
| Date | None | Luxon + timezone-aware |
| i18n | Hardcoded German | English strings file |
| Features | RSVP only | RSVP + date + edit + delete + calendar + polls (post-MVP) + recurring (post-MVP) |

---

## Next Steps (for next session)

1. Delete old source files (keep `.git`)
2. `npm init` / `wrangler init` to scaffold project
3. Install deps: `grammy`, `drizzle-orm`, `drizzle-kit`, `luxon`, `vitest`
4. Set up `wrangler.toml` with D1 binding
5. Create D1 database: `wrangler d1 create eventplanner-db`
6. Write Drizzle schema from PRD
7. Run first migration
8. Build `src/bot.ts` — grammy instance, webhook callback, route registration
9. Build `src/features/events/` — handlers, service, queries
10. Implement quick `/event` → RSVP card (core loop first)
11. Implement wizard `/event new`
12. Implement edit/delete
13. Implement `/events` list
14. Unit tests for core logic
15. Deploy: `wrangler deploy` + set webhook

---

## Files to Reference

- `PRD.md` — full requirements, DB schema, command spec
- Old bot source in git history: `src/bot.ts`, `src/usecases.ts`, `src/core.ts`, `src/db.ts` — reference for Telegram integration patterns
