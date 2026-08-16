# Admin-Gated Event Actions — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gate event create/delete/edit behind Telegram group admin status (creator OR admin for delete/edit), deny private chats.

**Architecture:** Two grammy middlewares in `src/features/common/admin.ts` — `requireAdmin` for `/event`, `requireCreatorOrAdmin` for `delete:`/`edit:` callbacks. Pure helpers (`parseEventId`, `isAdmin`) extracted for unit testing. Fail closed on admin-fetch errors.

**Tech Stack:** TypeScript (strict), grammy 1.x, Drizzle ORM, D1, Vitest

## Global Constraints

- Runtime: Cloudflare Workers — webhook mode only, stateless
- DB: D1 via `queries.getDB(env)` / `queries.getEvent(db, id)`
- All user-facing strings in `src/features/common/strings.ts`
- Parse mode HTML for all `ctx.reply` / `ctx.answerCallbackQuery` text
- Tests: Vitest, `globals: true` (config exists), run via `npm test`
- Typecheck: `npx tsc --noEmit` must pass with zero errors
- Deny semantics: middleware that does not call `next()` stops the grammy chain
- Fail closed: admin fetch error → deny with `STRINGS.somethingWentWrong`

---

### Task 1: Strings + Pure Admin Helpers

**Files:**
- Modify: `src/features/common/strings.ts`
- Create: `src/features/common/admin.ts`
- Test: `src/features/common/__tests__/admin.test.ts`

**Interfaces:**
- Consumes: nothing new
- Produces:
  - `STRINGS.adminOnly: string`, `STRINGS.groupOnly: string`
  - `parseEventId(data: string | undefined): number | null` — `"delete:42"` / `"edit:42"` → `42`; anything else → `null`
  - `isAdmin(admins: ChatMember[], userId: number): boolean` — true if any admin's `user.id` matches

- [ ] **Step 1: Write the failing tests**

Create `src/features/common/__tests__/admin.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import type { ChatMember } from "grammy";
import { parseEventId, isAdmin } from "../admin";

function makeMember(userId: number, status: ChatMember["status"] = "administrator"): ChatMember {
  return { status, user: { id: userId, is_bot: false, first_name: "Test" } } as ChatMember;
}

describe("parseEventId", () => {
  it("parses delete:42", () => {
    expect(parseEventId("delete:42")).toBe(42);
  });

  it("parses edit:7", () => {
    expect(parseEventId("edit:7")).toBe(7);
  });

  it("returns null for undefined", () => {
    expect(parseEventId(undefined)).toBeNull();
  });

  it("returns null for unrelated data", () => {
    expect(parseEventId("rsvp:42")).toBeNull();
    expect(parseEventId("garbage")).toBeNull();
  });
});

describe("isAdmin", () => {
  it("true for group administrator", () => {
    expect(isAdmin([makeMember(1), makeMember(10)], 10)).toBe(true);
  });

  it("true for chat creator", () => {
    expect(isAdmin([makeMember(10, "creator")], 10)).toBe(true);
  });

  it("false for non-admin", () => {
    expect(isAdmin([makeMember(1), makeMember(2)], 10)).toBe(false);
  });

  it("false for empty list", () => {
    expect(isAdmin([], 10)).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/common/__tests__/admin.test.ts`
Expected: FAIL — cannot resolve `../admin` module.

- [ ] **Step 3: Add strings**

In `src/features/common/strings.ts`, inside the `STRINGS` object after `notCreator`:

```typescript
  adminOnly: "Only admins can create events.",
  groupOnly: "Events work in group chats only.",
```

- [ ] **Step 4: Write minimal implementation**

Create `src/features/common/admin.ts`:

```typescript
import type { ChatMember } from "grammy";

export function parseEventId(data: string | undefined): number | null {
  if (!data) return null;
  const match = /^(?:delete|edit):(\d+)$/.exec(data);
  if (!match) return null;
  const id = parseInt(match[1]!, 10);
  return Number.isFinite(id) ? id : null;
}

export function isAdmin(admins: ChatMember[], userId: number): boolean {
  return admins.some((a) => a.user.id === userId);
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/features/common/__tests__/admin.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 7: Commit**

```bash
git add src/features/common/strings.ts src/features/common/admin.ts src/features/common/__tests__/admin.test.ts
git commit -m "feat: add admin helpers parseEventId and isAdmin"
```

---

### Task 2: Admin Middlewares

**Files:**
- Modify: `src/features/common/admin.ts`
- Modify: `src/features/common/__tests__/admin.test.ts`

**Interfaces:**
- Consumes: `parseEventId`, `isAdmin` from Task 1; `getDB`, `getEvent` from `src/features/events/queries.ts` (existing: `getEvent(db, eventId): Promise<EventRow | undefined>`); `Env` from `src/features/common/types.ts`; `STRINGS` from `./strings`
- Produces:
  - `requireAdmin(): Middleware<Context>` — private chat → `groupOnly` + stop; non-admin → `adminOnly` + stop; admin fetch throws → `somethingWentWrong` + stop; admin → `next()`
  - `requireCreatorOrAdmin(env: Env): Middleware<Context>` — private chat → `groupOnly` + stop; bad callback data → stop silently; event missing → `eventNotFound` + stop; creator → `next()` (no admin fetch); else admin check → `next()` or `notCreator` + stop; admin fetch throws → `somethingWentWrong` + stop

- [ ] **Step 1: Write the failing tests**

Append to `src/features/common/__tests__/admin.test.ts` (replace the import block at the top with the one shown — it adds `vi`, `beforeEach`, `Context`, `requireAdmin`, `requireCreatorOrAdmin`):

Top-of-file imports become:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Context, ChatMember } from "grammy";
import { parseEventId, isAdmin, requireAdmin, requireCreatorOrAdmin } from "../admin";
import { getEvent } from "../../events/queries";
import { STRINGS } from "../strings";
import type { Env } from "../types";

vi.mock("../../events/queries", () => ({
  getDB: vi.fn(() => ({})),
  getEvent: vi.fn(),
}));
```

Append these blocks:

```typescript
function makeCtx(overrides: Record<string, unknown> = {}) {
  return {
    chat: { id: 1, type: "supergroup" },
    from: { id: 10 },
    message: undefined,
    callbackQuery: undefined,
    getChatAdministrators: vi.fn(),
    reply: vi.fn(),
    ...overrides,
  } as unknown as Context;
}

const env = {} as Env;
const next = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
});

describe("requireAdmin", () => {
  it("denies non-admins with adminOnly and does not call next", async () => {
    const ctx = makeCtx({
      getChatAdministrators: vi.fn().mockResolvedValue([makeMember(1)]),
    });

    await requireAdmin()(ctx, next);

    expect(ctx.reply).toHaveBeenCalledWith(STRINGS.adminOnly, { parse_mode: "HTML" });
    expect(next).not.toHaveBeenCalled();
  });

  it("passes admins through to next", async () => {
    const ctx = makeCtx({
      getChatAdministrators: vi.fn().mockResolvedValue([makeMember(10)]),
    });

    await requireAdmin()(ctx, next);

    expect(next).toHaveBeenCalled();
  });

  it("denies private chats with groupOnly", async () => {
    const ctx = makeCtx({
      chat: { id: 1, type: "private" },
    });

    await requireAdmin()(ctx, next);

    expect(ctx.reply).toHaveBeenCalledWith(STRINGS.groupOnly, { parse_mode: "HTML" });
    expect(next).not.toHaveBeenCalled();
    expect(ctx.getChatAdministrators).not.toHaveBeenCalled();
  });

  it("fails closed when admin fetch throws", async () => {
    const ctx = makeCtx({
      getChatAdministrators: vi.fn().mockRejectedValue(new Error("bad request")),
    });

    await requireAdmin()(ctx, next);

    expect(ctx.reply).toHaveBeenCalledWith(STRINGS.somethingWentWrong, { parse_mode: "HTML" });
    expect(next).not.toHaveBeenCalled();
  });
});

describe("requireCreatorOrAdmin", () => {
  it("passes event creator without fetching admins", async () => {
    vi.mocked(getEvent).mockResolvedValue({
      id: 42, chatId: 1, messageId: null, title: "T", description: null,
      eventDate: null, location: null, attendeeLimit: null,
      creatorId: 10, status: "active", createdAt: "x", updatedAt: "x",
    });
    const ctx = makeCtx({ callbackQuery: { data: "delete:42" } });

    await requireCreatorOrAdmin(env)(ctx, next);

    expect(next).toHaveBeenCalled();
    expect(ctx.getChatAdministrators).not.toHaveBeenCalled();
  });

  it("passes group admin who is not the creator", async () => {
    vi.mocked(getEvent).mockResolvedValue({
      id: 42, chatId: 1, messageId: null, title: "T", description: null,
      eventDate: null, location: null, attendeeLimit: null,
      creatorId: 999, status: "active", createdAt: "x", updatedAt: "x",
    });
    const ctx = makeCtx({
      callbackQuery: { data: "delete:42" },
      getChatAdministrators: vi.fn().mockResolvedValue([makeMember(10)]),
    });

    await requireCreatorOrAdmin(env)(ctx, next);

    expect(next).toHaveBeenCalled();
  });

  it("denies non-creator non-admin with notCreator", async () => {
    vi.mocked(getEvent).mockResolvedValue({
      id: 42, chatId: 1, messageId: null, title: "T", description: null,
      eventDate: null, location: null, attendeeLimit: null,
      creatorId: 999, status: "active", createdAt: "x", updatedAt: "x",
    });
    const ctx = makeCtx({
      callbackQuery: { data: "delete:42" },
      getChatAdministrators: vi.fn().mockResolvedValue([makeMember(1)]),
    });

    await requireCreatorOrAdmin(env)(ctx, next);

    expect(ctx.reply).toHaveBeenCalledWith(STRINGS.notCreator, { parse_mode: "HTML" });
    expect(next).not.toHaveBeenCalled();
  });

  it("replies eventNotFound for missing event", async () => {
    vi.mocked(getEvent).mockResolvedValue(undefined);
    const ctx = makeCtx({ callbackQuery: { data: "delete:42" } });

    await requireCreatorOrAdmin(env)(ctx, next);

    expect(ctx.reply).toHaveBeenCalledWith(STRINGS.eventNotFound, { parse_mode: "HTML" });
    expect(next).not.toHaveBeenCalled();
  });

  it("fails closed when admin fetch throws", async () => {
    vi.mocked(getEvent).mockResolvedValue({
      id: 42, chatId: 1, messageId: null, title: "T", description: null,
      eventDate: null, location: null, attendeeLimit: null,
      creatorId: 999, status: "active", createdAt: "x", updatedAt: "x",
    });
    const ctx = makeCtx({
      callbackQuery: { data: "edit:42" },
      getChatAdministrators: vi.fn().mockRejectedValue(new Error("bad request")),
    });

    await requireCreatorOrAdmin(env)(ctx, next);

    expect(ctx.reply).toHaveBeenCalledWith(STRINGS.somethingWentWrong, { parse_mode: "HTML" });
    expect(next).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/common/__tests__/admin.test.ts`
Expected: FAIL — `requireAdmin` and `requireCreatorOrAdmin` not exported.

- [ ] **Step 3: Implement the middlewares**

Replace the contents of `src/features/common/admin.ts`:

```typescript
import type { ChatMember, Context, Middleware } from "grammy";
import { STRINGS } from "./strings";
import { getDB, getEvent } from "../events/queries";
import type { Env } from "./types";

export function parseEventId(data: string | undefined): number | null {
  if (!data) return null;
  const match = /^(?:delete|edit):(\d+)$/.exec(data);
  if (!match) return null;
  const id = parseInt(match[1]!, 10);
  return Number.isFinite(id) ? id : null;
}

export function isAdmin(admins: ChatMember[], userId: number): boolean {
  return admins.some((a) => a.user.id === userId);
}

async function fetchAdmins(ctx: Context): Promise<ChatMember[] | null> {
  try {
    return await ctx.getChatAdministrators();
  } catch {
    return null; // fail closed
  }
}

export function requireAdmin(): Middleware<Context> {
  return async (ctx, next) => {
    const chat = ctx.chat ?? ctx.message?.chat;
    const userId = ctx.from?.id;
    if (!chat || userId === undefined) return;
    if (chat.type === "private") {
      await ctx.reply(STRINGS.groupOnly, { parse_mode: "HTML" });
      return;
    }
    const admins = await fetchAdmins(ctx);
    if (!admins) {
      await ctx.reply(STRINGS.somethingWentWrong, { parse_mode: "HTML" });
      return;
    }
    if (!isAdmin(admins, userId)) {
      await ctx.reply(STRINGS.adminOnly, { parse_mode: "HTML" });
      return;
    }
    await next();
  };
}

export function requireCreatorOrAdmin(env: Env): Middleware<Context> {
  return async (ctx, next) => {
    const chat = ctx.chat ?? ctx.message?.chat;
    const userId = ctx.from?.id;
    const eventId = parseEventId(ctx.callbackQuery?.data);
    if (!chat || userId === undefined || eventId === null) return;
    if (chat.type === "private") {
      await ctx.reply(STRINGS.groupOnly, { parse_mode: "HTML" });
      return;
    }
    const event = await getEvent(getDB(env), eventId);
    if (!event) {
      await ctx.reply(STRINGS.eventNotFound, { parse_mode: "HTML" });
      return;
    }
    if (event.creatorId === userId) return next();
    const admins = await fetchAdmins(ctx);
    if (!admins) {
      await ctx.reply(STRINGS.somethingWentWrong, { parse_mode: "HTML" });
      return;
    }
    if (!isAdmin(admins, userId)) {
      await ctx.reply(STRINGS.notCreator, { parse_mode: "HTML" });
      return;
    }
    await next();
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/common/__tests__/admin.test.ts`
Expected: PASS, all tests (8 from Task 1 + 9 new).

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 6: Commit**

```bash
git add src/features/common/admin.ts src/features/common/__tests__/admin.test.ts
git commit -m "feat: add requireAdmin and requireCreatorOrAdmin middlewares"
```

---

### Task 3: Wire Middlewares into Handlers

**Files:**
- Modify: `src/features/events/handlers.ts`

**Interfaces:**
- Consumes: `requireAdmin`, `requireCreatorOrAdmin` from `src/features/common/admin.ts`
- Produces: gated registrations — `/event` admin-only; `delete:` and `edit:` creator-or-admin; `/events`, `/help`, `rsvp:` unchanged

- [ ] **Step 1: Wire the middlewares**

In `src/features/events/handlers.ts`, add import after the existing imports:

```typescript
import { requireAdmin, requireCreatorOrAdmin } from "../common/admin";
```

Change the `/event` registration from:

```typescript
  bot.command("event", async (ctx: Context) => {
```

to:

```typescript
  bot.command("event", requireAdmin(), async (ctx: Context) => {
```

Change the delete registration from:

```typescript
  bot.callbackQuery(/^delete:(\d+)$/, async (ctx: Context) => {
```

to:

```typescript
  bot.callbackQuery(/^delete:(\d+)$/, requireCreatorOrAdmin(env), async (ctx: Context) => {
```

Change the edit registration from:

```typescript
  bot.callbackQuery(/^edit:(\d+)$/, async (ctx: Context) => {
```

to:

```typescript
  bot.callbackQuery(/^edit:(\d+)$/, requireCreatorOrAdmin(env), async (ctx: Context) => {
```

- [ ] **Step 2: Remove the redundant creator check in the delete handler**

The middleware now guarantees creator-or-admin. Delete these lines from the delete callback handler:

```typescript
      if (event.creatorId !== user.id) {
        return ctx.answerCallbackQuery(STRINGS.notCreator);
      }
```

- [ ] **Step 3: Run full test suite**

Run: `npm test`
Expected: all tests pass (12 existing + 17 admin tests = 29).

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
git add src/features/events/handlers.ts
git commit -m "feat: gate event create/delete/edit behind admin check"
```

---

## Post-Implementation Verification (manual)

After deploy (`npm run deploy`):

1. Group chat: non-admin sends `/event Test` → sees "Only admins can create events."
2. Group chat: admin sends `/event Test` → card appears.
3. Non-admin non-creator taps 🗑️ Delete → sees "Only the event creator can do that."
4. Admin (non-creator) taps 🗑️ Delete → event cancelled.
5. Creator taps 🗑️ Delete → event cancelled (no admin fetch needed).
6. Private chat: `/event Test` → "Events work in group chats only."
