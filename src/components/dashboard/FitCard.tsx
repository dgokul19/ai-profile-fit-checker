"use client";

import { useState } from "react";
import type { MatchResult } from "@/types/match";
import { ScoreRing } from "./ScoreRing";
import { ViewDetailsModal } from "./ViewDetailsModal";
import styles from "./FitCard.module.css";

interface FitCardProps {
  result: MatchResult;
  jobLabel: string;
  isBestFit?: boolean;
}

export function FitCard({ result, jobLabel, isBestFit }: FitCardProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const topMatches =
    result.topStrengths && result.topStrengths.length > 0
      ? result.topStrengths
      : ["Python", "REST APIs", "PostgreSQL"];

  const topGaps =
    result.topGaps && result.topGaps.length > 0
      ? result.topGaps
      : ["Kubernetes (required)", "Kafka (nice)"];

  return (
    <>
      <div className={styles.card}>
        <div className={styles.cardInner}>
          {/* 1. Score Donut Ring */}
          <ScoreRing score={result.overallScore} size={72} />

          {/* 2. Middle Content */}
          <div className={styles.content}>
            <div className={styles.titleRow}>
              <h3 className={styles.jobTitle}>
                {jobLabel} &middot; {result.jobTitle}
              </h3>
              {isBestFit && (
                <span className={styles.bestFitBadge}>Best fit</span>
              )}
            </div>

            <div className={styles.tagsRow}>
              {/* TOP MATCHES */}
              <div className={styles.tagGroup}>
                <span className={styles.tagLabelMatches}>Top Matches</span>
                <div className={styles.pillsContainer}>
                  {topMatches.map((skill, i) => (
                    <span key={i} className={styles.pillMatch}>
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* TOP GAPS */}
              <div className={styles.tagGroup}>
                <span className={styles.tagLabelGaps}>Top Gaps</span>
                <div className={styles.pillsContainer}>
                  {topGaps.map((gap, i) => (
                    <span key={i} className={styles.pillGap}>
                      {gap}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 3. View details button */}
          <div className={styles.actionArea}>
            <button
              onClick={() => setModalOpen(true)}
              className={styles.viewDetailsBtn}
            >
              View details
            </button>
          </div>
        </div>
      </div>

      {modalOpen && (
        <ViewDetailsModal
          result={result}
          jobLabel={jobLabel}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}
