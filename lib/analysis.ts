import { join } from "node:path";
import { pathToFileURL } from "node:url";

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
  await installPdfDomGlobals();

  const errors: unknown[] = [];

  try {
    return normalizeExtractedText(await extractWithPdfParse(buffer));
  } catch (error) {
    errors.push(error);
  }

  try {
    return normalizeExtractedText(await extractWithPdfJs(buffer));
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
      parseHyperlinks: false,
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

  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent({
        disableNormalization: false,
        includeMarkedContent: false,
      });
      const text = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .filter(Boolean)
        .join(" ");

      pages.push(text);
      page.cleanup();
    }
  } finally {
    await document.destroy();
  }

  return pages.join("\n\n");
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
