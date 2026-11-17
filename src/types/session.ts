import type { StructuredResume } from "./resume";
import type { StructuredJob } from "./job";
import type { MatchResult } from "./match";

export interface JobEntry {
  id: string;
  label: string;
  rawText: string;
  structured: StructuredJob | null;
}

export interface Citation {
  text: string;
  source: "resume" | "job";
  jobId?: string;
  verified: boolean;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  timestamp: number;
}

export interface Session {
  id: string;
  resumeRawText: string | null;
  resumeStructured: StructuredResume | null;
  jobs: JobEntry[];
  matchResults: MatchResult[] | null;
  chatHistory: ChatMessage[];
  createdAt: number;
}
