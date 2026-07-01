import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import type { AiProvider, AiProviderName, AiTextRequest, AiTextResponse } from "./types";
import { AiProviderError } from "./types";

const DEFAULT_MODELS: Record<AiProviderName, string> = {
  mock: "mock",
  openai: "gpt-4o-mini",
  anthropic: "claude-haiku-4-20250514",
  google: "gemini-2.0-flash",
};

export function createLiveProvider(
  name: Exclude<AiProviderName, "mock">,
  apiKey: string,
  model = DEFAULT_MODELS[name],
): AiProvider {
  return {
    name,
    async generateText<T>(request: AiTextRequest): Promise<AiTextResponse<T>> {
      try {
        let modelInstance;
        switch (name) {
          case "openai":
            modelInstance = createOpenAI({ apiKey })(model);
            break;
          case "anthropic":
            modelInstance = createAnthropic({ apiKey })(model);
            break;
          case "google":
            modelInstance = createGoogleGenerativeAI({ apiKey })(model);
            break;
        }

        const system = request.messages.find((m) => m.role === "system")?.content;
        const nonSystem = request.messages.filter((m) => m.role !== "system");

        const result = await generateText({
          model: modelInstance!,
          system,
          messages: nonSystem.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
          temperature: request.temperature ?? 0.7,
        });

        let structured: T | undefined;
        if (request.structuredSchema) {
          const match = result.text.match(/\{[\s\S]*\}/);
          if (!match) {
            throw new AiProviderError("No JSON in response", name, true);
          }
          structured = request.structuredSchema.parse(JSON.parse(match[0])) as T;
        }

        return {
          text: result.text,
          structured,
          provider: name,
          model,
          usage: {
            inputTokens: result.usage?.inputTokens,
            outputTokens: result.usage?.outputTokens,
          },
        };
      } catch (error) {
        if (error instanceof AiProviderError) throw error;
        const message = error instanceof Error ? error.message : "AI error";
        throw new AiProviderError(message, name, true);
      }
    },
  };
}
