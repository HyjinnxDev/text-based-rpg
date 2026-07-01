/** Google Gemini / Generative AI API key from common env names. */
export function resolveGoogleApiKey(): string | undefined {
  return (
    process.env.GEMINI_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.gemini_key ||
    undefined
  );
}
