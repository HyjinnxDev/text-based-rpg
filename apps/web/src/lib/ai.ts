import { createAiRouterFromEnv } from "@tbrpg/ai";

let router: ReturnType<typeof createAiRouterFromEnv> | null = null;

export function getAiRouter() {
  if (!router) router = createAiRouterFromEnv();
  return router;
}
