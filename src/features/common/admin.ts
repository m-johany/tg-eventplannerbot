import type { Context, MiddlewareFn } from "grammy";
import type { ChatMember } from "grammy/types";
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

export function requireAdmin(): MiddlewareFn<Context> {
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

export function requireCreatorOrAdmin(env: Env): MiddlewareFn<Context> {
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
