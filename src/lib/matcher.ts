import { getGroqClient, runWithModelFailover } from "./groq";
import type { StructuredResume } from "@/types/resume";
import type { StructuredJob } from "@/types/job";
import { RequirementMatchSchema, type RequirementMatch } from "@/types/match";
import { MATCH_REQUIREMENTS_PROMPT } from "@/prompts/match-requirements";
import { verifyEvidence } from "./evidence-verifier";
import { z } from "zod";

export async function matchRequirements(
  resume: StructuredResume,
  resumeRawText: string,
  job: StructuredJob,
  jobRawText: string
): Promise<RequirementMatch[]> {
  const client = getGroqClient();

  const userContent = `## Candidate's Resume (Structured)
${JSON.stringify(resume, null, 2)}

## Candidate's Resume (Raw Text)
${resumeRawText}

## Target Job Posting (Structured)
${JSON.stringify(job, null, 2)}

## Target Job Posting (Raw Text)
${jobRawText}

Analyze all requirements from the job posting against the resume and return the JSON object with the matches array.`;

  const { result: matches } = await runWithModelFailover(async (model) => {
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: MATCH_REQUIREMENTS_PROMPT },
        { role: "user", content: userContent },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const text = response.choices[0]?.message?.content || "";
    if (!text) {
      throw new Error(`Empty response from Groq matcher (${model})`);
    }

    let jsonStr = text.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1];
    const rawMatch = jsonStr.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (rawMatch) jsonStr = rawMatch[1];

    const parsed = JSON.parse(jsonStr.trim());
    const rawArray = Array.isArray(parsed)
      ? parsed
      : parsed.matches || parsed.requirementMatches || parsed.requirements || parsed.results || [];

    const normalized = rawArray.map((m: any) => ({
      requirement: m?.requirement || m?.skill || m?.name || "",
      requirementSource: m?.requirementSource || m?.source || "",
      status: ["met", "partial", "missing"].includes(String(m?.status || "").toLowerCase())
        ? String(m.status).toLowerCase()
        : "missing",
      resumeEvidence: m?.resumeEvidence || m?.evidence || m?.evidenceQuote || null,
      explanation: m?.explanation || m?.reason || "",
      priority: String(m?.priority || "").toLowerCase().includes("nice") ? "nice-to-have" : "must-have",
    }));

    return z.array(RequirementMatchSchema).parse(normalized);
  }, `Match Requirements for "${job.title}"`);

  // Verify evidence citations against raw resume text
  return matches.map((match) => {
    if (match.resumeEvidence && match.status !== "missing") {
      const verification = verifyEvidence(match.resumeEvidence, resumeRawText);
      if (!verification.verified) {
        return {
          ...match,
          resumeEvidence: verification.bestMatch || match.resumeEvidence,
          explanation:
            match.explanation + " [⚠️ Citation could not be fully verified against resume]",
        };
      }
    }
    return match;
  });
}
