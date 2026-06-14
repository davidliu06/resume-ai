import OpenAI from "openai";
import { z } from "zod";

import { requireEnv } from "@/lib/env";
import type { ResumeAnalysis } from "@/lib/types";

const suggestionSchema = z.object({
  title: z.string().min(1),
  severity: z.enum(["critical", "high", "medium", "low"]).default("medium"),
  before: z.string().min(1),
  after: z.string().min(1),
  rationale: z.string().min(1),
});

const analysisSchema = z.object({
  summary: z.string().min(1),
  score: z.coerce.number().min(0).max(100),
  atsKeywords: z.array(z.string()).default([]),
  suggestions: z.array(suggestionSchema).default([]),
});

export async function extractPdfText(buffer: Buffer) {
  const canvas = await import("@napi-rs/canvas");
  const globals = globalThis as unknown as {
    DOMMatrix?: unknown;
    DOMPoint?: unknown;
    DOMRect?: unknown;
    ImageData?: unknown;
    Path2D?: unknown;
  };

  globals.DOMMatrix ??= canvas.DOMMatrix;
  globals.DOMPoint ??= canvas.DOMPoint;
  globals.DOMRect ??= canvas.DOMRect;
  globals.ImageData ??= canvas.ImageData;
  globals.Path2D ??= canvas.Path2D;

  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText();
    return result.text.replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  } finally {
    await parser.destroy();
  }
}

export async function analyzeResumeText(rawText: string): Promise<ResumeAnalysis> {
  const openai = new OpenAI({
    apiKey: requireEnv("OPENAI_API_KEY"),
  });

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    temperature: 0.25,
    messages: [
      {
        role: "system",
        content:
          "You are a cynical Technical Recruiter for SpaceX. Evaluate this engineering resume for metrics, technical depth, and ATS keywords. Output JSON only.",
      },
      {
        role: "user",
        content: `Return JSON with this exact shape:
{
  "summary": "one blunt paragraph",
  "score": 0-100,
  "atsKeywords": ["keyword"],
  "suggestions": [
    {
      "title": "short issue title",
      "severity": "critical" | "high" | "medium" | "low",
      "before": "weak resume excerpt or missing signal",
      "after": "strong rewritten bullet or concrete improvement",
      "rationale": "why this matters to engineering recruiters"
    }
  ]
}

Resume text:
${rawText.slice(0, 24000)}`,
      },
    ],
  });

  const content = completion.choices[0]?.message.content;

  if (!content) {
    throw new Error("OpenAI returned an empty analysis.");
  }

  const parsed = analysisSchema.parse(JSON.parse(content));

  return {
    ...parsed,
    rawText,
  };
}
