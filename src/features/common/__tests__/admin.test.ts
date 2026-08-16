import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Context } from "grammy";
import type { ChatMember } from "grammy/types";
import { parseEventId, isAdmin, requireAdmin, requireCreatorOrAdmin } from "../admin";
import { getEvent } from "../../events/queries";
import { STRINGS } from "../strings";
import type { Env } from "../types";

vi.mock("../../events/queries", () => ({
  getDB: vi.fn(() => ({})),
  getEvent: vi.fn(),
}));

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
