import { createBot } from "./bot";
import { webhookCallback } from "grammy";
import type { Env } from "./features/common/types";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const url = new URL(request.url);
      if (url.pathname === "/webhook") {
        const bot = createBot(env);
        // grammy's cloudflare-mod adapter types expect Body & { method, url, headers }
        // Request satisfies this at runtime; types differ due to grammy typedef
        const handleUpdate = webhookCallback(bot, "cloudflare-mod");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (await (handleUpdate as any)(request)) as Response;
      }
      return new Response("OK", { status: 200 });
    } catch (error) {
      console.error("Worker error:", error);
      return new Response("Error", { status: 500 });
    }
  },
};
