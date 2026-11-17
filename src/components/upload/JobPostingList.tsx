"use client";

import { useState } from "react";
import { X, Plus, Loader2, Sparkles } from "lucide-react";
import { useSession } from "@/context/SessionContext";
import styles from "./JobPostingList.module.css";

export function JobPostingList() {
  const { state, dispatch } = useSession();
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRemove = async (e: React.MouseEvent, jobId: string) => {
    e.stopPropagation();
    if (!state.sessionId) return;

    try {
      await fetch(`/api/job/${jobId}?sessionId=${state.sessionId}`, {
        method: "DELETE",
      });
      dispatch({ type: "REMOVE_JOB", payload: jobId });
    } catch (error) {
      console.error("Failed to remove job:", error);
    }
  };

  const handleAddJob = async () => {
    if (!text.trim() || !state.sessionId) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "job",
          sessionId: state.sessionId,
          text: text.trim(),
          label: `Job #${state.jobs.length + 1}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add job");

      dispatch({
        type: "ADD_JOB",
        payload: {
          id: data.jobId,
          label: `Job #${state.jobs.length + 1}`,
          preview: data.rawTextPreview,
          structured: data.structured,
        },
      });
      dispatch({ type: "SET_SESSION_ID", payload: data.sessionId });
      setText("");
      setShowAddForm(false);
    } catch (error) {
      dispatch({
        type: "SET_ERROR",
        payload: error instanceof Error ? error.message : "Failed to add job",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAnalyze = async () => {
    if (!state.sessionId) return;
    dispatch({ type: "SET_ANALYZING", payload: true });

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: state.sessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      dispatch({ type: "SET_RESULTS", payload: data.results });
    } catch (error) {
      dispatch({
        type: "SET_ERROR",
        payload: error instanceof Error ? error.message : "Analysis failed",
      });
    }
  };

  const currentActive = activeJobId || (state.jobs[0]?.id ?? null);
  const canAnalyze = state.resumeUploaded && state.jobs.length > 0;

  return (
    <div className={styles.container}>
      {/* Job List */}
      <div className={styles.jobList}>
        {state.jobs.map((job) => {
          const isActive = currentActive === job.id;
          const roleTitle = job.structured?.title || "Role";
          const company = job.structured?.company || "Company";

          return (
            <div
              key={job.id}
              onClick={() => setActiveJobId(job.id)}
              className={`${styles.jobCard} ${isActive ? styles.jobCardActive : ""}`}
            >
              <div className={styles.jobMeta}>
                <h4 className={styles.jobLabel}>{job.label}</h4>
                <p className={styles.jobSubtitle}>
                  {roleTitle} &middot; {company}
                </p>
              </div>

              <button
                onClick={(e) => handleRemove(e, job.id)}
                title="Remove job"
                className={styles.removeBtn}
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Add job button / form */}
      {state.jobs.length < 5 && (
        <div>
          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              className={styles.addTriggerBtn}
            >
              <Plus size={14} />
              <span>Add job posting ({state.jobs.length}/5)</span>
            </button>
          ) : (
            <div className={styles.addFormBox}>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste job description & requirements here..."
                className={styles.textarea}
              />
              <div className={styles.formActions}>
                <button
                  onClick={handleAddJob}
                  disabled={!text.trim() || isSubmitting}
                  className={styles.submitBtn}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={12} className={styles.spinIcon} />
                      Structuring with Groq Llama 3.3...
                    </>
                  ) : (
                    <span>Add Job #{state.jobs.length + 1}</span>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setText("");
                  }}
                  className={styles.cancelBtn}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Primary Trigger Button in Sidebar */}
      {canAnalyze && (
        <button
          onClick={handleAnalyze}
          disabled={state.isAnalyzing}
          className={styles.analyzeTriggerBtn}
        >
          {state.isAnalyzing ? (
            <>
              <Loader2 size={15} className={styles.spinIcon} />
              <span>Analyzing Fit with Groq...</span>
            </>
          ) : (
            <>
              <Sparkles size={15} />
              <span>Analyze Fit ({state.jobs.length} Role{state.jobs.length > 1 ? "s" : ""})</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
