"use client";

import styles from "./ScoreRing.module.css";

interface ScoreRingProps {
  score: number;
  size?: number;
}

export function ScoreRing({ score, size = 76 }: ScoreRingProps) {
  const strokeWidth = 6.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;

  const strokeColor =
    score >= 75
      ? "#2563eb" // Blue
      : score >= 50
      ? "#a16207" // Amber/brown
      : "#dc2626"; // Red

  return (
    <div className={styles.container}>
      <svg width={size} height={size} className={styles.svg}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          className={styles.bgCircle}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          stroke={strokeColor}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={styles.progressCircle}
        />
      </svg>
      <div className={styles.textOverlay}>
        <span className={styles.scoreNumber}>{score}</span>
        <span className={styles.scoreTotal}>/100</span>
      </div>
    </div>
  );
}
