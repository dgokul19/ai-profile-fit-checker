"use client";

import React, { createContext, useContext, useReducer, type ReactNode } from "react";
import type { MatchResult } from "@/types/match";
import type { StructuredResume } from "@/types/resume";
import type { StructuredJob } from "@/types/job";

export interface SessionJobItem {
  id: string;
  label: string;
  rawTextPreview: string;
  structured: StructuredJob | null;
}

interface SessionState {
  sessionId: string | null;
  resumeUploaded: boolean;
  resumeStructured: StructuredResume | null;
  resumeRawPreview: string | null;
  jobs: SessionJobItem[];
  matchResults: MatchResult[] | null;
  isAnalyzing: boolean;
  isUploading: boolean;
  error: string | null;
}

type Action =
  | { type: "SET_SESSION_ID"; payload: string }
  | { type: "SET_RESUME"; payload: { structured: StructuredResume; preview: string } }
  | { type: "ADD_JOB"; payload: { id: string; label: string; preview: string; structured: StructuredJob } }
  | { type: "REMOVE_JOB"; payload: string }
  | { type: "SET_RESULTS"; payload: MatchResult[] }
  | { type: "SET_ANALYZING"; payload: boolean }
  | { type: "SET_UPLOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "RESET" };

const initialState: SessionState = {
  sessionId: null,
  resumeUploaded: false,
  resumeStructured: null,
  resumeRawPreview: null,
  jobs: [],
  matchResults: null,
  isAnalyzing: false,
  isUploading: false,
  error: null,
};

function reducer(state: SessionState, action: Action): SessionState {
  switch (action.type) {
    case "SET_SESSION_ID":
      return { ...state, sessionId: action.payload };
    case "SET_RESUME":
      return {
        ...state,
        resumeUploaded: true,
        resumeStructured: action.payload.structured,
        resumeRawPreview: action.payload.preview,
        matchResults: null,
      };
    case "ADD_JOB": {
      // Prevent duplicate job entries by id
      if (state.jobs.some((j) => j.id === action.payload.id)) {
        return state;
      }
      return {
        ...state,
        jobs: [
          ...state.jobs,
          {
            id: action.payload.id,
            label: action.payload.label,
            rawTextPreview: action.payload.preview,
            structured: action.payload.structured,
          },
        ],
        matchResults: null,
      };
    }
    case "REMOVE_JOB":
      return {
        ...state,
        jobs: state.jobs.filter((j) => j.id !== action.payload),
        matchResults: null,
      };
    case "SET_RESULTS":
      return { ...state, matchResults: action.payload, isAnalyzing: false };
    case "SET_ANALYZING":
      return { ...state, isAnalyzing: action.payload, error: null };
    case "SET_UPLOADING":
      return { ...state, isUploading: action.payload, error: null };
    case "SET_ERROR":
      return { ...state, error: action.payload, isAnalyzing: false, isUploading: false };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

const SessionContext = createContext<{
  state: SessionState;
  dispatch: React.Dispatch<Action>;
} | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <SessionContext.Provider value={{ state, dispatch }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession must be used within SessionProvider");
  return context;
}
