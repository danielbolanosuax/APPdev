import { z } from "zod";
import { SuggestResponse } from "../types.js";

export const SuggestSchema = z.object({
  persona: z.literal("chef-cercano"),
  recipes: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        reason: z.string(),
        ingredients_needed: z.array(z.string()),
        substitutions: z.array(z.string()),
        steps: z.array(z.string()).min(1),
        time_minutes: z.number().int().positive(),
        servings: z.number().int().positive(),
        warnings: z.array(z.string()),
        tips: z.array(z.string()),
      }),
    )
    .min(1),
});

export function validateSuggest(payload: SuggestResponse): SuggestResponse {
  return SuggestSchema.parse(payload);
}
