import { NextRequest, NextResponse } from "next/server";
import { sessionStore } from "@/lib/session-store";
import { parseDocument, detectDocumentType, parseRawText } from "@/lib/parser";
import { structureResume, structureJob } from "@/lib/structurer";
import { v4 as uuidv4 } from "uuid";
import type { UploadResumeResponse, UploadJobResponse, ApiError } from "@/types/api";

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";

    let type: "resume" | "job";
    let sessionId: string | undefined;
    let text: string;
    let label: string | undefined;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      type = (formData.get("type") as string) as "resume" | "job";
      sessionId = (formData.get("sessionId") as string) || undefined;
      label = (formData.get("label") as string) || undefined;

      const file = formData.get("file") as File | null;
      const pastedText = formData.get("text") as string | null;

      if (file) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const docType = detectDocumentType(file.name, file.type);
        text = await parseDocument(buffer, docType);
      } else if (pastedText) {
        text = parseRawText(pastedText);
      } else {
        return NextResponse.json(
          { error: "No file or text provided" } as ApiError,
          { status: 400 }
        );
      }
    } else {
      const body = await request.json();
      type = body.type;
      sessionId = body.sessionId;
      text = parseRawText(body.text || "");
      label = body.label;
    }

    if (!type || !["resume", "job"].includes(type)) {
      return NextResponse.json(
        { error: "type must be 'resume' or 'job'" } as ApiError,
        { status: 400 }
      );
    }

    // Get or create session
    let session = sessionId ? sessionStore.get(sessionId) : null;
    if (!session) {
      session = sessionStore.create();
    }

    if (type === "resume") {
      const structured = await structureResume(text);
      session = sessionStore.update(session.id, {
        resumeRawText: text,
        resumeStructured: structured,
        matchResults: null, // invalidate previous results
      });

      const response: UploadResumeResponse = {
        sessionId: session.id,
        structured,
        rawTextPreview: text.substring(0, 200),
      };
      return NextResponse.json(response);
    } else {
      // Job posting
      if (session.jobs.length >= 5) {
        return NextResponse.json(
          { error: "Maximum 5 job postings allowed" } as ApiError,
          { status: 400 }
        );
      }

      const structured = await structureJob(text);
      const jobId = uuidv4();
      const jobLabel = label || `Job #${session.jobs.length + 1}`;

      const updatedJobs = [
        ...session.jobs,
        { id: jobId, label: jobLabel, rawText: text, structured },
      ];
      session = sessionStore.update(session.id, {
        jobs: updatedJobs,
        matchResults: null,
      });

      const response: UploadJobResponse = {
        sessionId: session.id,
        jobId,
        structured,
        rawTextPreview: text.substring(0, 200),
      };
      return NextResponse.json(response);
    }
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" } as ApiError,
      { status: 500 }
    );
  }
}
