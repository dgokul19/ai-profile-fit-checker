import { z } from "zod";

export const SkillSchema = z.object({
  name: z.string().default(""),
  category: z.enum(["technical", "soft", "domain", "tool"]).catch("technical").default("technical"),
  yearsOfExperience: z.number().nullable().optional().default(null),
  evidenceQuote: z.string().optional().default(""),
});
export type Skill = z.infer<typeof SkillSchema>;

export const ExperienceSchema = z.object({
  title: z.string().optional().default("Role"),
  company: z.string().optional().default("Company"),
  duration: z.string().optional().default(""),
  responsibilities: z.array(z.string()).optional().nullable().default([]),
  achievements: z.array(z.string()).optional().nullable().default([]),
});
export type Experience = z.infer<typeof ExperienceSchema>;

export const EducationSchema = z.object({
  degree: z.string().optional().default(""),
  institution: z.string().optional().default(""),
  year: z.string().nullable().optional().default(null),
  field: z.string().nullable().optional().default(null),
});
export type Education = z.infer<typeof EducationSchema>;

export const StructuredResumeSchema = z.object({
  candidateName: z.string().default("Candidate"),
  summary: z.string().default(""),
  skills: z.array(SkillSchema).default([]),
  experience: z.array(ExperienceSchema).default([]),
  education: z.array(EducationSchema).default([]),
  certifications: z.array(z.string()).default([]),
  achievements: z.array(z.string()).default([]),
});
export type StructuredResume = z.infer<typeof StructuredResumeSchema>;
