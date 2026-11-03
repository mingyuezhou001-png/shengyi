import { authRouter } from "./auth-router";
import { createRouter, publicQuery } from "./middleware";
import { translateRouter } from "./translate-router";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  translate: translateRouter,
});

export type AppRouter = typeof appRouter;
