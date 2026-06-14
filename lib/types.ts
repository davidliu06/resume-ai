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
  category?: string;
  before: string;
  after: string;
  rationale: string;
  impact?: string;
};

export type ResumeStyleReview = {
  verdict: string;
  strengths: string[];
  issues: string[];
  recommendation: string;
};

export type ResumeAnalysis = {
  summary: string;
  score: number;
  rawText: string;
  atsKeywords: string[];
  suggestions: ResumeSuggestion[];
  styleReview?: ResumeStyleReview;
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

export type ResumeExportState = ActionState & {
  resumeText: string;
  links: ResumeLink[];
};

export type ResumeRewriteState = ActionState & {
  suggestions: ResumeSuggestion[];
};

export type ResumeLink = {
  text: string;
  url: string;
};

export type PortfolioBlock = {
  id: string;
  type: "text" | "image" | "frame";
  text?: string;
  src?: string;
  shape?: "rect" | "circle";
  fontSize?: number;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex?: number;
};

export type PortfolioOptimizeState = ActionState & {
  blocks: PortfolioBlock[];
};
