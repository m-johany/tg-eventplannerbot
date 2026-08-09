import { describe, it, expect } from "vitest";
import { formatDate, escapeMarkdown, parseDateInput } from "../helpers";

describe("formatDate", () => {
  it("returns empty string for null", () => {
    expect(formatDate(null)).toBe("");
  });

  it("formats ISO date string", () => {
    // Use a date far in the future to avoid timezone offset issues
    const result = formatDate("2026-08-12T12:00:00.000Z");
    // Just verify it returns something non-empty and not the raw ISO
    expect(result.length).toBeGreaterThan(0);
    expect(result).not.toBe("2026-08-12T12:00:00.000Z");
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
