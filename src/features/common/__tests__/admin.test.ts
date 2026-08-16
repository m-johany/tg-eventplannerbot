import { describe, it, expect } from "vitest";
import type { ChatMember } from "grammy/types";
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
