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
    const card = buildEventCard(
      makeEvent({ attendeeLimit: 10 }),
      [makeAttendee()]
    );
    expect(card).toContain("1/10");
  });
});

describe("formatEventList", () => {
  it("returns no events message for empty list", () => {
    const result = formatEventList([], new Map());
    expect(result).toContain("No upcoming events");
  });

  it("formats event list with counts", () => {
    const events = [
      makeEvent({ id: 1 }),
      makeEvent({ id: 2, title: "Second" }),
    ];
    const counts = new Map([
      [1, 3],
      [2, 0],
    ]);
    const result = formatEventList(events, counts);
    expect(result).toContain("Test Event");
    expect(result).toContain("Second");
    expect(result).toContain("(3 going)");
    expect(result).toContain("(0 going)");
  });
});
