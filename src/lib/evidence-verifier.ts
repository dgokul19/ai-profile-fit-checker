import Fuse from "fuse.js";

interface VerificationResult {
  original: string;
  verified: boolean;
  bestMatch?: string;
  score: number;
}

export function verifyEvidence(citation: string, sourceText: string, threshold: number = 0.3): VerificationResult {
  if (!citation || !sourceText) {
    return { original: citation, verified: false, score: 0 };
  }
  if (sourceText.toLowerCase().includes(citation.toLowerCase())) {
    return { original: citation, verified: true, bestMatch: citation, score: 1.0 };
  }
  const sentences = sourceText.split(/[.\n]/).map(s => s.trim()).filter(s => s.length > 10);
  const fuse = new Fuse(sentences, {
    includeScore: true,
    threshold: threshold,
    minMatchCharLength: Math.min(citation.length, 10),
  });
  const results = fuse.search(citation);
  if (results.length > 0 && results[0].score !== undefined) {
    const best = results[0];
    return {
      original: citation,
      verified: best.score! <= threshold,
      bestMatch: best.item,
      score: 1 - (best.score ?? 1),
    };
  }
  return { original: citation, verified: false, score: 0 };
}

export function verifyAllEvidence(citations: string[], sourceText: string, threshold?: number): VerificationResult[] {
  return citations.map(c => verifyEvidence(c, sourceText, threshold));
}
