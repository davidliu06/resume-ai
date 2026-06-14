import { join } from "node:path";
import { pathToFileURL } from "node:url";

import OpenAI from "openai";
import { z } from "zod";

import { requireEnv } from "@/lib/env";
import type { ResumeAnalysis, ResumeLink } from "@/lib/types";

const suggestionSchema = z.object({
  title: z.string().min(1),
  severity: z.enum(["critical", "high", "medium", "low"]).default("medium"),
  category: z.string().min(1).optional(),
  before: z.string().min(1),
  after: z.string(),
  rationale: z.string().min(1),
  impact: z.string().min(1).optional(),
});

const styleReviewSchema = z.object({
  verdict: z.string().min(1),
  strengths: z.array(z.string()).default([]),
  issues: z.array(z.string()).default([]),
  recommendation: z.string().min(1),
});

const analysisSchema = z.object({
  summary: z.string().min(1),
  score: z.coerce.number().min(0).max(100),
  atsKeywords: z.array(z.string()).default([]),
  suggestions: z.array(suggestionSchema).default([]),
  styleReview: styleReviewSchema.optional(),
});

export async function extractPdfText(buffer: Buffer) {
  return (await extractPdfTextWithLinks(buffer)).text;
}

export async function extractPdfTextWithLinks(buffer: Buffer) {
  await installPdfDomGlobals();

  const errors: unknown[] = [];

  try {
    const text = normalizeExtractedText(await extractWithPdfParse(buffer));
    return { text, links: [] as ResumeLink[] };
  } catch (error) {
    errors.push(error);
  }

  try {
    const result = await extractWithPdfJs(buffer);
    return {
      text: normalizeExtractedText(result.text),
      links: dedupeLinks(result.links),
    };
  } catch (error) {
    errors.push(error);
  }

  throw new Error(
    `Unable to extract selectable PDF text. ${errors
      .map((error) => (error instanceof Error ? error.message : String(error)))
      .join(" | ")}`
  );
}

async function installPdfDomGlobals() {
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
}

async function extractWithPdfParse(buffer: Buffer) {
  const { PDFParse } = await import("pdf-parse");
  PDFParse.setWorker(getPdfWorkerUrl());
  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText({
      parseHyperlinks: true,
      parsePageInfo: false,
      pageJoiner: "\n\n",
    });

    return result.text;
  } finally {
    await parser.destroy();
  }
}

async function extractWithPdfJs(buffer: Buffer) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = getPdfWorkerUrl();
  const documentInit = {
    data: new Uint8Array(buffer),
    disableWorker: true,
    useSystemFonts: true,
  } as unknown as Parameters<typeof pdfjs.getDocument>[0];
  const document = await pdfjs.getDocument(documentInit).promise;
  const pages: string[] = [];
  const links: ResumeLink[] = [];

  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const annotations = await page.getAnnotations();
      const content = await page.getTextContent({
        disableNormalization: false,
        includeMarkedContent: false,
      });
      const text = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .filter(Boolean)
        .join(" ");

      pages.push(text);
      annotations.forEach((annotation: unknown) => {
        const link = annotation as {
          url?: string;
          unsafeUrl?: string;
          title?: string;
          contents?: string;
        };
        const url = link.url ?? link.unsafeUrl;

        if (url?.startsWith("http")) {
          links.push({
            text: link.title ?? link.contents ?? url,
            url,
          });
        }
      });
      page.cleanup();
    }
  } finally {
    await document.destroy();
  }

  return { text: pages.join("\n\n"), links };
}

function getPdfWorkerUrl() {
  return pathToFileURL(
    join(process.cwd(), "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs")
  ).href;
}

function normalizeExtractedText(text: string) {
  return text
    .replace(/\s+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function dedupeLinks(links: ResumeLink[]) {
  const seen = new Map<string, ResumeLink>();

  links.forEach((link) => {
    seen.set(link.url, link);
  });

  return Array.from(seen.values());
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
          "You are a cynical Technical Recruiter for SpaceX. Evaluate this engineering resume for metrics, technical depth, ATS keywords, and visual style choices such as hierarchy, bolding, fonts, colors, spacing, and ATS readability. Your suggestions must be concrete phrasing changes, text additions, text subtractions, or line reorder edits, not broad topic advice. Output JSON only.",
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
      "title": "short concrete edit title",
      "severity": "critical" | "high" | "medium" | "low",
      "category": "Phrasing change | Text addition | Text subtraction | Line reorder",
      "before": "exact weak resume excerpt to replace, or exact text to remove",
      "after": "replacement text, added text, or empty string for deletion",
      "rationale": "why this matters to engineering recruiters",
      "impact": "how incorporating this suggestion would improve the resume"
    }
  ],
  "styleReview": {
    "verdict": "one sentence on whether the current visual style is right",
    "strengths": ["style choice that helps"],
    "issues": ["style choice that hurts"],
    "recommendation": "what to change about bolding, fonts, colors, spacing, or hierarchy"
  }
}

Return 10-14 suggestions when possible. Do not write generic topics like "Add metrics" by itself. Each suggestion must be a direct edit the Improve Resume tool can apply to the resume text. For additions, put a short insertion cue in before and the exact added text in after. For subtractions, put the exact removable text in before and use an empty after string.

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
