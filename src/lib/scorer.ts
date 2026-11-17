import type { RequirementMatch } from "@/types/match";
import type { StructuredJob } from "@/types/job";
import type { StructuredResume } from "@/types/resume";

export interface ScoreBreakdown {
  mustHaveScore: number;
  niceToHaveScore: number;
  experienceScore: number;
  overall: number;
}

function scoreItems(items: RequirementMatch[]): number {
  if (items.length === 0) return 100;
  const points = items.reduce((sum, m) => {
    switch (m.status) {
      case "met": return sum + 1;
      case "partial": return sum + 0.5;
      case "missing": return sum;
      default: return sum;
    }
  }, 0);
  return Math.round((points / items.length) * 100);
}

const SENIORITY_LEVELS = ["junior", "mid", "senior", "staff", "lead", "principal"] as const;

function computeExperienceFit(jobLevel: typeof SENIORITY_LEVELS[number], resume: StructuredResume): number {
  const totalYears = resume.experience.reduce((sum, exp) => {
    const match = exp.duration.match(/(\d+)/);
    return sum + (match ? parseInt(match[1]) : 2);
  }, 0);

  let candidateLevel: number;
  if (totalYears <= 2) candidateLevel = 0;
  else if (totalYears <= 5) candidateLevel = 1;
  else if (totalYears <= 8) candidateLevel = 2;
  else if (totalYears <= 12) candidateLevel = 3;
  else if (totalYears <= 16) candidateLevel = 4;
  else candidateLevel = 5;

  const jobLevelIndex = SENIORITY_LEVELS.indexOf(jobLevel);
  const diff = Math.abs(candidateLevel - jobLevelIndex);
  if (diff === 0) return 100;
  if (diff === 1) return 75;
  if (diff === 2) return 50;
  return 25;
}

export function computeScore(matches: RequirementMatch[], job: StructuredJob, resume: StructuredResume): ScoreBreakdown {
  const mustHaves = matches.filter(m => m.priority === "must-have");
  const niceToHaves = matches.filter(m => m.priority === "nice-to-have");
  const mustHaveScore = scoreItems(mustHaves);
  const niceToHaveScore = scoreItems(niceToHaves);
  const experienceScore = computeExperienceFit(job.seniorityLevel, resume);
  const overall = Math.round(mustHaveScore * 0.70 + niceToHaveScore * 0.20 + experienceScore * 0.10);
  return { mustHaveScore, niceToHaveScore, experienceScore, overall };
}
