import { createAiImageRouterFromEnv, createAiRouterFromEnv } from "@tbrpg/ai";

let router: ReturnType<typeof createAiRouterFromEnv> | null = null;
let imageRouter: ReturnType<typeof createAiImageRouterFromEnv> | null = null;

export function getAiRouter() {
  if (!router) router = createAiRouterFromEnv();
  return router;
}

export function getAiImageRouter() {
  if (!imageRouter) imageRouter = createAiImageRouterFromEnv();
  return imageRouter;
}
