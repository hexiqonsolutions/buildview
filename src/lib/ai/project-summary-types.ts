/** Structured AI-style summary for a single project (all reports + ops context). */
export type ProjectAiSummary = {
  overallProgress: string;
  /** One row per uploaded report — full coverage of report library. */
  reportDigest: Array<{
    id: string;
    title: string;
    typeLabel: string;
    date: string;
    excerpt: string;
  }>;
  keyChanges: string[];
  pendingActivities: string[];
  criticalRisks: string[];
  recommendedActions: string[];
  generatedAt: string;
};
