import { z } from "zod";

export const RequirementMatchSchema = z.object({
  requirement: z.string().default(""),
  requirementSource: z.string().optional().default(""),
  status: z.enum(["met", "partial", "missing"]).catch("missing").default("missing"),
  resumeEvidence: z.string().nullable().optional().default(null),
  explanation: z.string().optional().default(""),
  priority: z.enum(["must-have", "nice-to-have"]).catch("must-have").default("must-have"),
});
export type RequirementMatch = z.infer<typeof RequirementMatchSchema>;

export const MatchResultSchema = z.object({
  jobId: z.string(),
  jobTitle: z.string(),
  overallScore: z.number().min(0).max(100),
  scoreBreakdown: z.object({
    mustHaveScore: z.number(),
    niceToHaveScore: z.number(),
    experienceScore: z.number(),
  }),
  requirementMatches: z.array(RequirementMatchSchema),
  topStrengths: z.array(z.string()),
  topGaps: z.array(z.string()),
  recommendation: z.string(),
});
export type MatchResult = z.infer<typeof MatchResultSchema>;
