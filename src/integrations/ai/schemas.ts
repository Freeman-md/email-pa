import { z } from "zod"

export const relevanceSchema = z.object({
    isRelevant: z.boolean(),
    confidence: z.enum(["high", "medium", "low"]),
    evidence: z.array(z.string()).max(3)
})

export const statusSchema = z.object({
  status: z.enum([
    "rejection",
    "interview_invitation",
    "assessment",
    "generic_update",
  ]),
  confidence: z.enum(["high", "medium", "low"]),
  evidence: z.array(z.string()).max(3),
});