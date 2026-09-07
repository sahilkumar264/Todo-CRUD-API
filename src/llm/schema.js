const { z } = require("zod");

const TriageInputSchema = z.object({
  text: z.string({ error: "text is required and must be a string" })
    .trim()
    .min(1, "text must not be empty")
    .max(2000, "text must be at most 2000 characters")
});

const TriageOutputSchema = z.object({
  category: z.enum(["billing", "bug", "feature", "other"]),
  urgency: z.enum(["low", "normal", "high"]),
  confidence: z.number().min(0).max(1),
  reason: z.string().trim().min(1).max(240)
}).strict();

module.exports = { TriageInputSchema, TriageOutputSchema };
