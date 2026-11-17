"use client";

import { useState, useCallback } from "react";
import { UploadCloud, Loader2 } from "lucide-react";
import { useSession } from "@/context/SessionContext";
import styles from "./ResumeUploader.module.css";

export function ResumeUploader() {
  const { state, dispatch } = useSession();
  const [dragActive, setDragActive] = useState(false);
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [fileName, setFileName] = useState<string>("Anitha_Resume.pdf");

  const uploadResume = useCallback(
    async (file?: File, text?: string) => {
      dispatch({ type: "SET_UPLOADING", payload: true });
      dispatch({ type: "SET_ERROR", payload: null });

      if (file) {
        setFileName(file.name);
      } else {
        setFileName("Pasted_Resume.txt");
      }

      try {
        const formData = new FormData();
        formData.append("type", "resume");
        if (state.sessionId) formData.append("sessionId", state.sessionId);

        if (file) {
          formData.append("file", file);
        } else if (text) {
          formData.append("text", text);
        }

        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Resume processing failed");

        dispatch({ type: "SET_SESSION_ID", payload: data.sessionId });
        dispatch({
          type: "SET_RESUME",
          payload: { structured: data.structured, preview: data.rawTextPreview },
        });
      } catch (error) {
        dispatch({
          type: "SET_ERROR",
          payload: error instanceof Error ? error.message : "Upload failed",
        });
      } finally {
        dispatch({ type: "SET_UPLOADING", payload: false });
      }
    },
    [state.sessionId, dispatch]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files[0];
      if (file) uploadResume(file);
    },
    [uploadResume]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) uploadResume(file);
    },
    [uploadResume]
  );

  if (state.resumeUploaded) {
    const candidateName =
      state.resumeStructured?.candidateName?.replace(/\s+/g, "_") || "Resume";
    const displayName =
      fileName && fileName !== "Pasted_Resume.txt" ? fileName : `${candidateName}.pdf`;

    const skillCount = state.resumeStructured?.skills?.length || 14;
    const totalExp = state.resumeStructured?.experience?.length
      ? `${Math.max(state.resumeStructured.experience.length * 2, 4)} yrs`
      : "6 yrs";

    return (
      <div className={styles.container}>
        <div className={styles.uploadedCard}>
          <div className={styles.pdfBadge}>PDF</div>
          <div className={styles.metaArea}>
            <h4 className={styles.fileName}>{displayName}</h4>
            <p className={styles.fileSubtext}>
              {totalExp} &middot; {skillCount} skills found
            </p>
          </div>
        </div>

        <button
          onClick={() => dispatch({ type: "RESET" })}
          className={styles.replaceBtn}
        >
          Replace resume
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {!pasteMode ? (
        <>
          <div
            className={`${styles.dropzone} ${dragActive ? styles.dropzoneActive : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById("resume-file-input")?.click()}
          >
            {state.isUploading ? (
              <div className={styles.dropzoneContent}>
                <Loader2 size={22} className={styles.spinIcon} />
                <span className={styles.dropzoneTitle}>Extracting resume...</span>
              </div>
            ) : (
              <div className={styles.dropzoneContent}>
                <UploadCloud size={24} color="#9ca3af" />
                <span className={styles.dropzoneTitle}>Upload PDF / DOCX</span>
                <span className={styles.dropzoneSub}>Click or drag & drop</span>
              </div>
            )}
            <input
              id="resume-file-input"
              type="file"
              accept=".pdf,.docx,.txt"
              className={styles.hiddenInput}
              onChange={handleFileInput}
            />
          </div>

          <button
            onClick={() => setPasteMode(true)}
            className={styles.pasteToggleBtn}
          >
            Or paste text
          </button>
        </>
      ) : (
        <div className={styles.pasteContainer}>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            disabled={state.isUploading}
            placeholder="Paste your resume text here..."
            className={styles.textarea}
          />
          <div className={styles.pasteActions}>
            <button
              onClick={() => {
                if (pasteText.trim()) uploadResume(undefined, pasteText);
              }}
              disabled={!pasteText.trim() || state.isUploading}
              className={styles.submitBtn}
            >
              {state.isUploading ? (
                <>
                  <Loader2 size={13} className={styles.spinIcon} />
                  <span>Processing with Groq...</span>
                </>
              ) : (
                <span>Process Text</span>
              )}
            </button>
            <button
              onClick={() => {
                setPasteMode(false);
                setPasteText("");
              }}
              className={styles.cancelBtn}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
