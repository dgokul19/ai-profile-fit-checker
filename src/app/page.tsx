"use client";

import { SessionProvider, useSession } from "@/context/SessionContext";
import { ResumeUploader } from "@/components/upload/ResumeUploader";
import { JobPostingList } from "@/components/upload/JobPostingList";
import { FitDashboard } from "@/components/dashboard/FitDashboard";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { SAMPLE_RESUME_TEXT, SAMPLE_JOBS } from "@/lib/sample-data";
import { Loader2 } from "lucide-react";
import styles from "./page.module.css";

function MainApp() {
  const { state, dispatch } = useSession();

  const handleStartOver = () => {
    dispatch({ type: "RESET" });
  };

  const handleLoadSampleData = async () => {
    dispatch({ type: "SET_UPLOADING", payload: true });
    dispatch({ type: "SET_ERROR", payload: null });

    try {
      // 1. Upload sample resume
      const resResume = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "resume", text: SAMPLE_RESUME_TEXT }),
      });
      const dataResume = await resResume.json();
      if (!resResume.ok) throw new Error(dataResume.error || "Failed to process resume");

      dispatch({ type: "SET_SESSION_ID", payload: dataResume.sessionId });
      dispatch({
        type: "SET_RESUME",
        payload: {
          structured: dataResume.structured,
          preview: dataResume.rawTextPreview,
        },
      });

      // 2. Upload 2 sample target jobs
      for (const job of SAMPLE_JOBS.slice(0, 2)) {
        const resJob = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "job",
            sessionId: dataResume.sessionId,
            text: job.text,
            label: job.label,
          }),
        });
        const dataJob = await resJob.json();
        if (resJob.ok) {
          dispatch({
            type: "ADD_JOB",
            payload: {
              id: dataJob.jobId,
              label: job.label,
              preview: dataJob.rawTextPreview,
              structured: dataJob.structured,
            },
          });
        }
      }
    } catch (error) {
      dispatch({
        type: "SET_ERROR",
        payload: error instanceof Error ? error.message : "Failed to load sample data",
      });
    } finally {
      dispatch({ type: "SET_UPLOADING", payload: false });
    }
  };

  return (
    <div className={styles.wrapper}>
      {/* Global Top Loading Bar */}
      {(state.isUploading || state.isAnalyzing) && (
        <div className={styles.topProgressBar} />
      )}

      {/* Top Header */}
      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoFit}>Job</span>
          <span className={styles.logoCheck}>Fit Analyzer</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {!state.resumeUploaded && (
            <button
              onClick={handleLoadSampleData}
              disabled={state.isUploading}
              style={{
                border: "1px solid #bfdbfe",
                padding: "6px 14px",
                fontSize: "12px",
                fontWeight: 600,
                borderRadius: "8px",
                color: "#1d4ed8",
                backgroundColor: "#eff6ff",
                cursor: state.isUploading ? "not-allowed" : "pointer",
                opacity: state.isUploading ? 0.6 : 1,
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              {state.isUploading ? (
                <>
                  <Loader2 size={13} className={styles.spinIcon} />
                  <span>Loading sample...</span>
                </>
              ) : (
                "Load Sample (Gokul + 2 Jobs)"
              )}
            </button>
          )}

          <button onClick={handleStartOver} className={styles.startOverBtn}>
            Start over
          </button>
        </div>
      </header>

      {/* Global In-Progress Status Banner */}
      {(state.isUploading || state.isAnalyzing) && (
        <div className={styles.globalStatusBanner}>
          <Loader2 size={15} className={styles.spinIcon} />
          <span>
            {state.isUploading
              ? "Extracting & structuring candidate profile with Groq Llama 3.3..."
              : `Evaluating requirements & calculating fit across ${state.jobs.length} roles with Groq Llama 3.3...`}
          </span>
        </div>
      )}

      {/* Main Container */}
      <main className={styles.mainContainer}>
        {/* Upper Two-Column Layout */}
        <div className={styles.topColumns}>
          {/* Left Column: YOUR RESUME + JOB POSTINGS */}
          <div className={styles.leftColumn}>
            {/* 1. YOUR RESUME CARD */}
            <div className={styles.sidebarCard}>
              <h3 className={styles.cardTitle}>Your Resume</h3>
              <ResumeUploader />
            </div>

            {/* 2. JOB POSTINGS (X OF 5) CARD */}
            <div className={styles.sidebarCard}>
              <h3 className={styles.cardTitle}>
                Job Postings ({state.jobs.length} of 5)
              </h3>
              <JobPostingList />
            </div>
          </div>

          {/* Right Column: Fit dashboard */}
          <div className={styles.rightColumn}>
            <FitDashboard />
          </div>
        </div>

        {/* Lower Full-Width Section: Ask about your fit */}
        <div>
          <ChatWindow />
        </div>
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <SessionProvider>
      <MainApp />
    </SessionProvider>
  );
}
