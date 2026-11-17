import { NextRequest, NextResponse } from "next/server";
import { sessionStore } from "@/lib/session-store";
import { matchRequirements } from "@/lib/matcher";
import { computeScore } from "@/lib/scorer";
import type { MatchResult } from "@/types/match";
import type { ApiError } from "@/types/api";

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" } as ApiError,
        { status: 400 }
      );
    }

    const session = sessionStore.get(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: "Session not found" } as ApiError,
        { status: 404 }
      );
    }

    if (!session.resumeStructured || !session.resumeRawText) {
      return NextResponse.json(
        { error: "Please upload a resume first" } as ApiError,
        { status: 400 }
      );
    }

    if (session.jobs.length === 0) {
      return NextResponse.json(
        { error: "Please add at least one job posting" } as ApiError,
        { status: 400 }
      );
    }

    const startTime = Date.now();

    // Run matching for all jobs in parallel
    const matchPromises = session.jobs.map(async (job) => {
      if (!job.structured || !session.resumeStructured || !session.resumeRawText) {
        throw new Error(`Job ${job.label} is not structured yet`);
      }

      const matches = await matchRequirements(
        session.resumeStructured,
        session.resumeRawText,
        job.structured,
        job.rawText
      );

      const scoreBreakdown = computeScore(matches, job.structured, session.resumeStructured);

      // Determine top strengths and gaps
      const met = matches.filter((m) => m.status === "met");
      const missing = matches.filter((m) => m.status === "missing");

      const topStrengths = met.slice(0, 3).map((m) => m.requirement);

      const topGaps = missing
        .sort((a, b) => (a.priority === "must-have" ? -1 : 1) - (b.priority === "must-have" ? -1 : 1))
        .slice(0, 3)
        .map((m) => `${m.requirement} (${m.priority})`);

      const result: MatchResult = {
        jobId: job.id,
        jobTitle: job.structured.title,
        overallScore: scoreBreakdown.overall,
        scoreBreakdown: {
          mustHaveScore: scoreBreakdown.mustHaveScore,
          niceToHaveScore: scoreBreakdown.niceToHaveScore,
          experienceScore: scoreBreakdown.experienceScore,
        },
        requirementMatches: matches,
        topStrengths,
        topGaps,
        recommendation: generateRecommendation(scoreBreakdown.overall, topStrengths, topGaps),
      };

      return result;
    });

    const results = await Promise.all(matchPromises);
    results.sort((a, b) => b.overallScore - a.overallScore);

    sessionStore.update(sessionId, { matchResults: results });

    return NextResponse.json({
      results,
      processingTime: Date.now() - startTime,
    });
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Analysis failed" } as ApiError,
      { status: 500 }
    );
  }
}

function generateRecommendation(score: number, strengths: string[], gaps: string[]): string {
  if (score >= 80) {
    return `Strong fit! Your top strengths (${strengths.join(", ")}) align well with this role. Focus on addressing: ${gaps.join(", ") || "minor gaps"}.`;
  } else if (score >= 60) {
    return `Moderate fit. You match several requirements but have gaps in: ${gaps.join(", ")}. Consider highlighting your strengths in ${strengths.join(", ")}.`;
  } else if (score >= 40) {
    return `Partial fit. Key gaps include: ${gaps.join(", ")}. This role may require targeted upskilling.`;
  } else {
    return `Low fit for this role. Major gaps in: ${gaps.join(", ")}. Consider roles more aligned with your current experience.`;
  }
}
