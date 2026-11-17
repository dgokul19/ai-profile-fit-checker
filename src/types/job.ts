import { z } from "zod";

export const RequiredSkillSchema = z.object({
  name: z.string().default(""),
  category: z.string().optional().default("technical"),
  evidenceQuote: z.string().optional().default(""),
});
export type RequiredSkill = z.infer<typeof RequiredSkillSchema>;

export const StructuredJobSchema = z.object({
  title: z.string().default("Target Role"),
  company: z.string().nullable().default(null),
  seniorityLevel: z
    .string()
    .optional()
    .nullable()
    .transform((val) => {
      const lower = (val || "mid").toLowerCase();
      if (lower.includes("lead") || lower.includes("principal") || lower.includes("staff")) return "lead";
      if (lower.includes("senior") || lower.includes("sr")) return "senior";
      if (lower.includes("junior") || lower.includes("jr") || lower.includes("entry")) return "junior";
      return "mid";
    }),
  mustHaveSkills: z.array(RequiredSkillSchema).default([]),
  niceToHaveSkills: z.array(RequiredSkillSchema).default([]),
  responsibilities: z.array(z.string()).default([]),
  qualifications: z.array(z.string()).default([]),
});
export type StructuredJob = z.infer<typeof StructuredJobSchema>;
