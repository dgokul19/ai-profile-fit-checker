import { NextRequest, NextResponse } from "next/server";
import { sessionStore } from "@/lib/session-store";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;
    const url = new URL(request.url);
    const sessionId = url.searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId query parameter is required" },
        { status: 400 }
      );
    }

    const session = sessionStore.get(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const updatedJobs = session.jobs.filter((j) => j.id !== jobId);
    if (updatedJobs.length === session.jobs.length) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Re-label remaining jobs
    const relabeledJobs = updatedJobs.map((job, index) => ({
      ...job,
      label: `Job #${index + 1}`,
    }));

    sessionStore.update(sessionId, {
      jobs: relabeledJobs,
      matchResults: null, // invalidate results
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Delete failed" },
      { status: 500 }
    );
  }
}
