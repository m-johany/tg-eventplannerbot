import { Bot, InlineKeyboard, Context } from "grammy";
import * as service from "./service";
import * as queries from "./queries";
import { STRINGS } from "../common/strings";
import type { Env } from "../common/types";

export function registerEventHandlers(bot: Bot, env: Env): void {
  // /event <text> — quick create
  bot.command("event", async (ctx: Context) => {
    const text = ctx.match?.toString().trim();
    if (!text || text === "new" || text === "edit" || text === "cancel") {
      if (text === "new") {
        return ctx.reply(
          "Wizard coming soon. Use /event Your Event Title for quick create.",
          { parse_mode: "HTML" }
        );
      }
      return ctx.reply(STRINGS.help, { parse_mode: "HTML" });
    }

    const msg = ctx.message;
    if (!msg || !msg.from) return;

    try {
      const userName =
        [msg.from.first_name, msg.from.last_name].filter(Boolean).join(" ") || "Unknown";

      const { event, cardText } = await service.createQuickEvent(env, {
        chatId: msg.chat.id,
        title: text,
        creatorId: msg.from.id,
        creatorName: userName,
      });

      const keyboard = new InlineKeyboard()
        .text(STRINGS.rsvpYes, `rsvp:${event.id}`)
        .row()
        .text(STRINGS.editEvent, `edit:${event.id}`)
        .text(STRINGS.deleteEvent, `delete:${event.id}`);

      const sent = await ctx.reply(cardText, {
        parse_mode: "HTML",
        reply_markup: keyboard,
      });

      await queries.updateEvent(queries.getDB(env), event.id, {
        messageId: sent.message_id,
      });

      // Try to delete the command message
      await ctx.deleteMessage().catch(() => {});
    } catch (error) {
      console.error("Event creation error:", error);
      await ctx.reply(STRINGS.somethingWentWrong, { parse_mode: "HTML" });
    }
  });

  // /events — list upcoming
  bot.command("events", async (ctx: Context) => {
    const msg = ctx.message;
    if (!msg) return;

    try {
      const db = queries.getDB(env);
      const eventList = await queries.getEventsByChat(db, msg.chat.id);
      const counts = new Map<number, number>();
      for (const e of eventList) {
        counts.set(e.id, await queries.getAttendeeCount(db, e.id));
      }
      const text = service.formatEventList(eventList, counts);
      await ctx.reply(text, { parse_mode: "HTML" });
    } catch (error) {
      console.error("Event list error:", error);
      await ctx.reply(STRINGS.somethingWentWrong, { parse_mode: "HTML" });
    }
  });

  // RSVP callback
  bot.callbackQuery(/^rsvp:(\d+)$/, async (ctx: Context) => {
    const match = /^rsvp:(\d+)$/.exec(ctx.callbackQuery?.data ?? "");
    if (!match) return;
    const eventId = parseInt(match[1]!);
    const user = ctx.callbackQuery?.from;
    if (!user) return;

    try {
      const db = queries.getDB(env);
      const event = await queries.getEvent(db, eventId);
      if (!event) {
        return ctx.answerCallbackQuery(STRINGS.eventNotFound);
      }

      const existingAttendees = await queries.getAttendees(db, eventId);
      const existing = existingAttendees.find((a) => a.userId === user.id);
      const userName =
        [user.first_name, user.last_name].filter(Boolean).join(" ") || "Unknown";

      if (existing) {
        await queries.removeAttendee(db, eventId, user.id);
        await ctx.answerCallbackQuery(STRINGS.rsvpRemoved(userName));
      } else {
        await queries.addAttendee(db, {
          eventId,
          userId: user.id,
          name: userName,
        });
        await ctx.answerCallbackQuery(STRINGS.rsvpAdded(userName));
      }

      // Update the event card
      const updatedAttendees = await queries.getAttendees(db, eventId);
      const cardText = service.buildEventCard(event, updatedAttendees);
      const keyboard = new InlineKeyboard()
        .text(STRINGS.rsvpYes, `rsvp:${event.id}`)
        .row()
        .text(STRINGS.editEvent, `edit:${event.id}`)
        .text(STRINGS.deleteEvent, `delete:${event.id}`);

      if (event.messageId) {
        await ctx.api
          .editMessageText(event.chatId, event.messageId, cardText, {
            parse_mode: "HTML",
            reply_markup: keyboard,
          })
          .catch(() => {});
      }
    } catch (error) {
      console.error("RSVP error:", error);
      await ctx.answerCallbackQuery(STRINGS.somethingWentWrong);
    }
  });

  // Delete callback
  bot.callbackQuery(/^delete:(\d+)$/, async (ctx: Context) => {
    const match = /^delete:(\d+)$/.exec(ctx.callbackQuery?.data ?? "");
    if (!match) return;
    const eventId = parseInt(match[1]!);
    const user = ctx.callbackQuery?.from;
    if (!user) return;

    try {
      const db = queries.getDB(env);
      const event = await queries.getEvent(db, eventId);
      if (!event) {
        return ctx.answerCallbackQuery(STRINGS.eventNotFound);
      }
      if (event.creatorId !== user.id) {
        return ctx.answerCallbackQuery(STRINGS.notCreator);
      }

      await queries.cancelEvent(db, eventId);

      if (event.messageId) {
        await ctx.api
          .editMessageText(
            event.chatId,
            event.messageId,
            `~~${event.title}~~\n_${STRINGS.eventCancelled}_`,
            { parse_mode: "HTML" }
          )
          .catch(() => {});
      }

      await ctx.answerCallbackQuery(STRINGS.eventCancelled);
    } catch (error) {
      console.error("Delete error:", error);
      await ctx.answerCallbackQuery(STRINGS.somethingWentWrong);
    }
  });

  // Edit callback (placeholder)
  bot.callbackQuery(/^edit:(\d+)$/, async (ctx: Context) => {
    await ctx.answerCallbackQuery("Edit feature coming soon!");
  });

  // /help
  bot.command("help", async (ctx: Context) => {
    await ctx.reply(STRINGS.help, { parse_mode: "HTML" });
  });
}
