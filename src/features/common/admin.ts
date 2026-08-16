import type { ChatMember } from "grammy/types";

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
