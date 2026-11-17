"use client";

import { X, CheckCircle2, AlertTriangle, XCircle, Quote } from "lucide-react";
import type { MatchResult } from "@/types/match";
import styles from "./ViewDetailsModal.module.css";

interface ViewDetailsModalProps {
  result: MatchResult;
  jobLabel: string;
  onClose: () => void;
}

export function ViewDetailsModal({ result, jobLabel, onClose }: ViewDetailsModalProps) {
  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.titleArea}>
            <div className={styles.labelTitleRow}>
              <span className={styles.jobBadge}>{jobLabel}</span>
              <h3 className={styles.modalTitle}>{result.jobTitle}</h3>
            </div>
            <p className={styles.modalSubtext}>
              Fit Score: <strong>{result.overallScore}/100</strong> &bull;{" "}
              {result.scoreBreakdown.mustHaveScore}% must-have match &bull;{" "}
              {result.scoreBreakdown.niceToHaveScore}% nice-to-have match
            </p>
          </div>
          <button onClick={onClose} className={styles.closeBtn}>
            <X size={18} />
          </button>
        </div>

        {/* Content Table */}
        <div className={styles.modalBody}>
          <div>
            <h4 className={styles.sectionTitle}>Requirement & Evidence Mapping</h4>
            <div className={styles.matchesList}>
              {result.requirementMatches.map((match, i) => (
                <div key={i} className={styles.matchItem}>
                  <div className={styles.matchHeader}>
                    <div className={styles.matchNameRow}>
                      {match.status === "met" && (
                        <CheckCircle2 size={16} className={styles.iconMet} />
                      )}
                      {match.status === "partial" && (
                        <AlertTriangle size={16} className={styles.iconPartial} />
                      )}
                      {match.status === "missing" && (
                        <XCircle size={16} className={styles.iconMissing} />
                      )}
                      <span className={styles.requirementName}>{match.requirement}</span>
                    </div>

                    <span
                      className={
                        match.priority === "must-have"
                          ? styles.priorityBadgeMust
                          : styles.priorityBadgeNice
                      }
                    >
                      {match.priority}
                    </span>
                  </div>

                  <p className={styles.explanation}>{match.explanation}</p>

                  {/* Quoted Evidence */}
                  {match.resumeEvidence ? (
                    <div className={styles.evidenceBox}>
                      <Quote size={13} style={{ flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <strong>Resume Evidence: </strong>
                        <span>&ldquo;{match.resumeEvidence}&rdquo;</span>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.noEvidence}>
                      Evidence: not found in your resume.
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.modalFooter}>
          <button onClick={onClose} className={styles.footerCloseBtn}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
