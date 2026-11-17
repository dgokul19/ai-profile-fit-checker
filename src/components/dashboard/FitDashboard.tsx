"use client";

import { useSession } from "@/context/SessionContext";
import { FitCard } from "./FitCard";
import { Loader2, Sparkles, BarChart2 } from "lucide-react";
import styles from "./FitDashboard.module.css";

export function FitDashboard() {
  const { state, dispatch } = useSession();

  const handleAnalyze = async () => {
    if (!state.sessionId) return;
    dispatch({ type: "SET_ANALYZING", payload: true });
    dispatch({ type: "SET_ERROR", payload: null });

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

  if (state.isUploading) {
    return (
      <div className={styles.container}>
        <div className={styles.headerRow}>
          <h2 className={styles.title}>Fit dashboard</h2>
          <span className={styles.rankingLabel}>Parsing resume...</span>
        </div>
        <div className={styles.analyzingCard}>
          <div className={styles.analyzingHeader}>
            <div className={styles.analyzingSpinner}>
              <Loader2 size={24} className={styles.spinIcon} />
            </div>
            <div>
              <h4 className={styles.analyzingTitle}>
                Extracting Candidate Profile with Groq Llama 3.3...
              </h4>
              <p className={styles.analyzingDesc}>
                Parsing technical skills, career achievements, and work experience into structured data
              </p>
            </div>
          </div>
          <div className={styles.skeletonList}>
            <div className={styles.skeletonCard} />
            <div className={styles.skeletonCard} />
          </div>
        </div>
      </div>
    );
  }

  if (state.isAnalyzing) {
    return (
      <div className={styles.container}>
        <div className={styles.headerRow}>
          <h2 className={styles.title}>Fit dashboard</h2>
          <span className={styles.rankingLabel}>Calculating fit scores...</span>
        </div>
        <div className={styles.analyzingCard}>
          <div className={styles.analyzingHeader}>
            <div className={styles.analyzingSpinner}>
              <Loader2 size={24} className={styles.spinIcon} />
            </div>
            <div>
              <h4 className={styles.analyzingTitle}>
                Analyzing {state.jobs.length} Role{state.jobs.length > 1 ? "s" : ""} with Groq Llama 3.3...
              </h4>
              <p className={styles.analyzingDesc}>
                Evaluating must-have vs. nice-to-have requirements, verifying exact resume quotes, and computing weighted fit scores.
              </p>
            </div>
          </div>
          <div className={styles.stepsContainer}>
            <div className={styles.stepRow}>
              <span className={styles.pulseDot} />
              <span>Parsing must-have vs. nice-to-have job requirements</span>
            </div>
            <div className={styles.stepRow}>
              <span className={styles.pulseDot} />
              <span>Evaluating candidate experience & searching exact resume evidence</span>
            </div>
            <div className={styles.stepRow}>
              <span className={styles.pulseDot} />
              <span>Computing deterministic 0–100 fit scores & ranking best matches</span>
            </div>
          </div>
          <div className={styles.skeletonList}>
            <div className={styles.skeletonCard} />
            <div className={styles.skeletonCard} />
          </div>
        </div>
      </div>
    );
  }

  if (!state.resumeUploaded) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>
          <BarChart2 size={24} />
        </div>
        <h3 className={styles.emptyTitle}>Fit dashboard</h3>
        <p className={styles.emptyDesc}>
          Upload your resume on the left and add 1 to 5 target job postings to calculate your fit scores.
        </p>
      </div>
    );
  }

  if (state.jobs.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>
          <Sparkles size={24} />
        </div>
        <h3 className={styles.emptyTitle}>Add job postings to compare</h3>
        <p className={styles.emptyDesc}>
          Resume loaded. Now paste 1 to 5 target job postings on the left, then click <strong>Calculate fit</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header matching design */}
      <div className={styles.headerRow}>
        <h2 className={styles.title}>Fit dashboard</h2>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {state.matchResults && (
            <button
              onClick={handleAnalyze}
              disabled={state.isAnalyzing}
              style={{
                background: "transparent",
                border: "none",
                color: "#2563eb",
                fontSize: "12px",
                fontWeight: 600,
                cursor: state.isAnalyzing ? "not-allowed" : "pointer",
                textDecoration: "underline",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              {state.isAnalyzing ? (
                <>
                  <Loader2 size={12} className={styles.spinIcon} />
                  <span>Recalculating...</span>
                </>
              ) : (
                "Re-calculate fit"
              )}
            </button>
          )}
          <span className={styles.rankingLabel}>Ranked by fit score</span>
        </div>
      </div>

      {/* Trigger Analyze Banner */}
      {!state.matchResults && !state.isAnalyzing && (
        <div className={styles.readyBanner}>
          <div>
            <h4 className={styles.readyTitle}>
              Ready to analyze {state.jobs.length} job posting{state.jobs.length > 1 ? "s" : ""}
            </h4>
            <p className={styles.readyDesc}>
              Compare requirements with Groq Llama 3.3, compute weighted scores & cite exact resume quotes.
            </p>
          </div>
          <button
            onClick={handleAnalyze}
            disabled={state.isAnalyzing}
            className={styles.calcBtn}
          >
            <Sparkles size={14} />
            <span>Calculate fit</span>
          </button>
        </div>
      )}

      {/* In-Progress Analysis Card */}
      {state.isAnalyzing && (
        <div className={styles.analyzingCard}>
          <div className={styles.analyzingHeader}>
            <div className={styles.analyzingSpinner}>
              <Loader2 size={22} className={styles.spinIcon} />
            </div>
            <div>
              <h4 className={styles.analyzingTitle}>
                Analyzing {state.jobs.length} Role{state.jobs.length > 1 ? "s" : ""} with Groq Llama 3.3...
              </h4>
              <p className={styles.analyzingDesc}>
                Matching qualifications, verifying exact resume quotes, and calculating weighted fit scores.
              </p>
            </div>
          </div>

          <div className={styles.stepsContainer}>
            <div className={styles.stepRow}>
              <span className={styles.pulseDot} />
              <span>Parsing must-have vs. nice-to-have job requirements</span>
            </div>
            <div className={styles.stepRow}>
              <span className={styles.pulseDot} />
              <span>Evaluating candidate experience & searching exact resume evidence</span>
            </div>
            <div className={styles.stepRow}>
              <span className={styles.pulseDot} />
              <span>Computing deterministic 0–100 fit scores & ranking best matches</span>
            </div>
          </div>

          <div className={styles.skeletonList}>
            <div className={styles.skeletonCard} />
            <div className={styles.skeletonCard} />
          </div>
        </div>
      )}

      {/* Error state */}
      {state.error && <div className={styles.errorBox}>{state.error}</div>}

      {/* Results List: one card per job */}
      {!state.isAnalyzing && state.matchResults && (
        <div className={styles.cardsList}>
          {state.matchResults.map((result, idx) => {
            const job = state.jobs.find((j) => j.id === result.jobId);
            return (
              <FitCard
                key={result.jobId}
                result={result}
                jobLabel={job?.label || `Job #${idx + 1}`}
                isBestFit={idx === 0}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
