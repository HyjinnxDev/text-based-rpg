import { createStorageFromEnv } from "@tbrpg/storage";

let storage: ReturnType<typeof createStorageFromEnv> | null = null;

export function getStorage() {
  if (!storage) storage = createStorageFromEnv();
  return storage;
}
