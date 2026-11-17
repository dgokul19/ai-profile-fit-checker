import type { StructuredResume } from "./resume";
import type { StructuredJob } from "./job";
import type { MatchResult } from "./match";
import type { Citation } from "./session";

export interface UploadResumeResponse {
  sessionId: string;
  structured: StructuredResume;
  rawTextPreview: string;
}

export interface UploadJobResponse {
  sessionId: string;
  jobId: string;
  structured: StructuredJob;
  rawTextPreview: string;
}

export interface AnalyzeResponse {
  results: MatchResult[];
  processingTime: number;
}

export interface ChatRequest {
  sessionId: string;
  message: string;
}

export interface ChatStreamEvent {
  type: "token" | "citations" | "done" | "error";
  text?: string;
  citations?: Citation[];
  error?: string;
}

export interface ApiError {
  error: string;
  details?: string;
}
