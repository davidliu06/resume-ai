export type Plan = "free" | "pro";

export type Profile = {
  id: string;
  email: string;
  stripe_customer_id: string | null;
  plan: Plan;
};

export type ResumeSuggestion = {
  title: string;
  severity: "critical" | "high" | "medium" | "low";
  before: string;
  after: string;
  rationale: string;
};

export type ResumeAnalysis = {
  summary: string;
  score: number;
  rawText: string;
  atsKeywords: string[];
  suggestions: ResumeSuggestion[];
};

export type Resume = {
  id: string;
  user_id: string;
  file_url: string;
  score: number;
  analysis: ResumeAnalysis;
  created_at: string;
};

export type ActionState = {
  ok: boolean;
  message: string;
};

export type LinkedInResumeState = ActionState & {
  resumeMarkdown: string;
};
