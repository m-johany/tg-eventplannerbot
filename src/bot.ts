import { Bot } from "grammy";
import type { Env } from "./features/common/types";
import { registerEventHandlers } from "./features/events/handlers";

export function createBot(env: Env): Bot {
  const bot = new Bot(env.BOT_TOKEN);

  bot.catch((err) => {
    console.error("Bot error:", err.message);
  });

  registerEventHandlers(bot, env);

  return bot;
}
