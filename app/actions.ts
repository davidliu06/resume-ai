"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Stripe from "stripe";

import {
  analyzeResumeText,
  extractPdfText,
  extractPdfTextWithLinks,
  generateResumeEditSuggestions,
} from "@/lib/analysis";
import { requireEnv } from "@/lib/env";
import {
  cleanResumeText,
  extractLinksFromText,
  mergeResumeLinks,
} from "@/lib/resume-text";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  ActionState,
  PortfolioBlock,
  PortfolioOptimizeState,
  Profile,
  ResumeExportState,
  ResumeRewriteState,
} from "@/lib/types";

const MAX_PDF_BYTES = 8 * 1024 * 1024;
const PORTFOLIO_CANVAS_WIDTH = 794;
const PORTFOLIO_CANVAS_HEIGHT = 1123;

function friendlyAuthError(message: string) {
  if (message.toLowerCase().includes("email not confirmed")) {
    return "Check your inbox to confirm your email, then sign in.";
  }

  if (message.toLowerCase().includes("invalid login credentials")) {
    return "That email and password do not match.";
  }

  return message;
}

function friendlyUploadError(error: unknown) {
  if (!(error instanceof Error)) {
    return "Unable to analyze the resume. Try again in a moment.";
  }

  const message = error.message.toLowerCase();

  if (
    "status" in error &&
    error.status === 429 &&
    (message.includes("quota") || message.includes("insufficient_quota"))
  ) {
    return "OpenAI quota is exhausted for this API key. Check billing or use a key with gpt-4o-mini quota.";
  }

  if (message.includes("insufficient_quota")) {
    return "OpenAI quota is exhausted for this API key. Check billing or use a key with gpt-4o-mini quota.";
  }

  if (
    "status" in error &&
    error.status === 429 &&
    message.includes("rate")
  ) {
    return "OpenAI is rate limiting this key. Wait a moment, then try again.";
  }

  if ("status" in error && error.status === 401) {
    return "OpenAI rejected the API key. Check OPENAI_API_KEY in .env.local.";
  }

  if (message.includes("unable to extract selectable pdf text")) {
    return "We could not extract readable text from that PDF. Links are okay, but the file needs selectable text rather than a scanned image.";
  }

  if (
    message.includes("worker") ||
    message.includes("pdf.worker") ||
    message.includes("invalid pdf") ||
    message.includes("password")
  ) {
    return "We could not read that PDF. Try an unlocked, text-based PDF export.";
  }

  if (message.includes("openai")) {
    return "The AI review service did not return a usable response. Try again.";
  }

  return error.message;
}

async function getAuthedUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("You need to sign in first.");
  }

  return { supabase, user };
}

export async function signUp(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || password.length < 8) {
    return {
      ok: false,
      message: "Use a valid email and a password with at least 8 characters.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return { ok: false, message: friendlyAuthError(error.message) };
  }

  if (data.user) {
    await supabase.from("profiles").upsert({
      id: data.user.id,
      email,
      plan: "free",
    });
  }

  revalidatePath("/");

  return {
    ok: true,
    message: data.session
      ? "Account created. You are signed in."
      : "Account created. Check your inbox to finish signing in.",
  };
}

export async function signIn(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { ok: false, message: friendlyAuthError(error.message) };
  }

  revalidatePath("/");

  return { ok: true, message: "Signed in." };
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath("/");
  redirect("/");
}

export async function uploadResume(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const { supabase, user } = await getAuthedUser();
    const file = formData.get("resume");

    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, message: "Choose a PDF resume first." };
    }

    if (file.size > MAX_PDF_BYTES) {
      return { ok: false, message: "Keep the PDF under 8 MB." };
    }

    const isPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      return { ok: false, message: "Only PDF resumes can be reviewed." };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const rawText = await extractPdfText(buffer);

    if (rawText.length < 200) {
      return {
        ok: false,
        message: "That PDF did not contain enough selectable text to review.",
      };
    }

    const analysis = await analyzeResumeText(rawText);
    const path = `${user.id}/${crypto.randomUUID()}-${file.name.replaceAll(
      /[^a-zA-Z0-9._-]/g,
      "-"
    )}`;

    const { error: uploadError } = await supabase.storage
      .from("resumes")
      .upload(path, buffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { error: insertError } = await supabase.from("resumes").insert({
      user_id: user.id,
      file_url: path,
      score: analysis.score,
      analysis,
    });

    if (insertError) {
      throw insertError;
    }

    revalidatePath("/");

    return {
      ok: true,
      message: "Resume analyzed. The review feed has been refreshed.",
    };
  } catch (error) {
    console.error("Resume upload failed", error);

    return {
      ok: false,
      message: friendlyUploadError(error),
    };
  }
}

export async function prepareResumeExport(
  _prevState: ResumeExportState,
  formData: FormData
): Promise<ResumeExportState> {
  try {
    await getAuthedUser();

    const resumeText = String(formData.get("resumeText") ?? "").trim();
    const file = formData.get("resumeFile");
    let rawText = resumeText;
    let pdfLinks: ResumeExportState["links"] = [];

    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_PDF_BYTES) {
        return {
          ok: false,
          message: "Keep the PDF under 8 MB.",
          resumeText: "",
          links: [],
        };
      }

      const isPdf =
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf");

      if (!isPdf) {
        return {
          ok: false,
          message: "Upload a PDF resume or paste resume text.",
          resumeText: "",
          links: [],
        };
      }

      const extracted = await extractPdfTextWithLinks(
        Buffer.from(await file.arrayBuffer())
      );
      rawText = extracted.text;
      pdfLinks = extracted.links;
    }

    const cleaned = cleanResumeText(rawText);
    const links = mergeResumeLinks(extractLinksFromText(cleaned), pdfLinks);

    if (cleaned.length < 80) {
      return {
        ok: false,
        message: "Add more resume text or upload a selectable-text PDF.",
        resumeText: "",
        links: [],
      };
    }

    return {
      ok: true,
      message: "Resume text loaded. Choose a style and download the PDF.",
      resumeText: cleaned,
      links,
    };
  } catch (error) {
    console.error("Resume export preparation failed", error);

    return {
      ok: false,
      message: friendlyUploadError(error),
      resumeText: "",
      links: [],
    };
  }
}

export async function generateResumeRewriteSuggestions(
  _prevState: ResumeRewriteState,
  formData: FormData
): Promise<ResumeRewriteState> {
  try {
    await getAuthedUser();

    const resumeText = cleanResumeText(
      String(formData.get("resumeText") ?? "").trim()
    );

    if (resumeText.length < 120) {
      return {
        ok: false,
        message: "Add more resume text before generating rewrite edits.",
        suggestions: [],
      };
    }

    const suggestions = await generateResumeEditSuggestions(resumeText);

    if (!suggestions.length) {
      return {
        ok: false,
        message: "The AI did not return usable rewrite edits. Try again.",
        suggestions: [],
      };
    }

    return {
      ok: true,
      message: `Generated ${suggestions.length} line-level rewrite edits.`,
      suggestions,
    };
  } catch (error) {
    console.error("Resume rewrite generation failed", error);

    return {
      ok: false,
      message: friendlyUploadError(error),
      suggestions: [],
    };
  }
}

export async function optimizePortfolioFromResume(
  _prevState: PortfolioOptimizeState,
  formData: FormData
): Promise<PortfolioOptimizeState> {
  try {
    await getAuthedUser();

    const file = formData.get("resumeFile");
    let resumeText = cleanResumeText(
      String(formData.get("resumeText") ?? "").trim()
    );

    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_PDF_BYTES) {
        return {
          ok: false,
          message: "Keep the PDF under 8 MB.",
          blocks: [],
        };
      }

      const isPdf =
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf");

      if (!isPdf) {
        return {
          ok: false,
          message: "Upload a PDF resume or paste resume text.",
          blocks: [],
        };
      }

      const extracted = await extractPdfTextWithLinks(
        Buffer.from(await file.arrayBuffer())
      );
      const extractedLinks = extracted.links
        .map((link) => `${link.text}: ${link.url}`)
        .join("\n");
      resumeText = cleanResumeText(
        [
          extracted.text,
          extractedLinks && `Extracted links:\n${extractedLinks}`,
        ]
          .filter(Boolean)
          .join("\n\n")
      );
    }

    if (resumeText.length < 120) {
      return {
        ok: false,
        message: "Upload a selectable-text PDF or paste more resume text.",
        blocks: [],
      };
    }

    const openai = new (await import("openai")).default({
      apiKey: requireEnv("OPENAI_API_KEY"),
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.35,
      messages: [
        {
          role: "system",
          content:
            "You are a portfolio creative director for early-career engineering candidates. Decide what resume material belongs in a concise visual PDF portfolio deck. Keep truthful claims only. Output JSON only.",
        },
        {
          role: "user",
          content: `Create editable PDF portfolio blocks from this resume. You are designing one polished A4 portrait portfolio page, not a website and not a cramped landscape slide. Use the resume to decide the content and layout.

Required sections:
- Name and title headline.
- About Me: 2-3 concise lines about the candidate's engineering focus.
- Skills: compact grouped skill chips or short columns.
- Projects: at least one featured project with project name, short description, technical details, and an image/CAD/screenshot frame.
- Experience: a timeline or stacked role block, not the same shape as the project block.
- Contact: email, LinkedIn, GitHub, portfolio, or other real links when present.

Layout rules:
- Do not make every section the same kind of box.
- Use varied block sizes, spacing, and positions: large title, an about block, small skill chips/columns, a project feature area, timeline blocks, and a footer contact strip.
- Include image frames for profile and project visuals. Empty frames must sit under images, and text can overlap images when useful.
- Keep truthful claims only. Drop filler, repeated bullets, and resume-only details.
- Use zIndex 10 for frames, 20 for images, 30 for text.
- Coordinates target a 794 x 1123 A4 portrait canvas. Keep all blocks inside the canvas with generous breathing room.
- Use normal reading sizes: 30-40 for the name, 14-18 for section headings, 10-13 for body copy.

Return JSON:
{
  "blocks": [
    {"type":"text","text":"deck copy","x":48,"y":48,"width":460,"height":120,"fontSize":28,"zIndex":30},
    {"type":"frame","shape":"circle","x":604,"y":52,"width":128,"height":128,"zIndex":10}
  ]
}

Resume:
${resumeText.slice(0, 18000)}`,
        },
      ],
    });

    const content = completion.choices[0]?.message.content;
    const parsed = content ? JSON.parse(content) : null;
    const blocks = normalizePortfolioBlocks(parsed?.blocks);

    return {
      ok: true,
      message: "Portfolio optimized. Edit the canvas before exporting.",
      blocks,
    };
  } catch (error) {
    console.error("Portfolio optimization failed", error);

    return {
      ok: false,
      message: friendlyUploadError(error),
      blocks: [],
    };
  }
}

function normalizePortfolioBlocks(input: unknown): PortfolioBlock[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input.slice(0, 14).map((block) => {
    const item = block as Partial<PortfolioBlock>;
    const type =
      item.type === "frame" || item.type === "image" || item.type === "text"
        ? item.type
        : "text";
    const x = clampNumber(item.x, 48, PORTFOLIO_CANVAS_WIDTH - 80, 20);
    const y = clampNumber(item.y, 48, PORTFOLIO_CANVAS_HEIGHT - 80, 20);
    const width = clampNumber(
      item.width,
      type === "text" ? 280 : 120,
      PORTFOLIO_CANVAS_WIDTH - x - 40,
      80
    );
    const height = clampNumber(
      item.height,
      type === "text" ? 88 : 120,
      PORTFOLIO_CANVAS_HEIGHT - y - 40,
      40
    );

    return {
      id: crypto.randomUUID(),
      type,
      text:
        type === "text"
          ? String(item.text ?? "Edit this portfolio text")
          : undefined,
      src: type === "image" ? item.src : undefined,
      shape: item.shape === "circle" ? "circle" : "rect",
      fontSize: clampNumber(
        item.fontSize,
        type === "text" ? 18 : 0,
        42,
        type === "text" ? 10 : 0
      ),
      x,
      y,
      width,
      height,
      zIndex:
        typeof item.zIndex === "number"
          ? clampNumber(item.zIndex, type === "text" ? 30 : 10, 50)
          : type === "text"
            ? 30
            : type === "image"
              ? 20
              : 10,
    };
  });
}

function clampNumber(
  value: unknown,
  fallback: number,
  max: number,
  min = 0
) {
  const number = Number(value);
  const upper = Math.max(min, max);

  if (!Number.isFinite(number)) {
    return Math.min(Math.max(fallback, min), upper);
  }

  return Math.min(Math.max(number, min), upper);
}

export async function createCheckoutSession() {
  const { supabase, user } = await getAuthedUser();
  const stripe = new Stripe(requireEnv("STRIPE_SECRET_KEY"));
  const requestHeaders = await headers();
  const origin =
    requestHeaders.get("origin") ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,email,stripe_customer_id,plan")
    .eq("id", user.id)
    .single<Profile>();

  let customerId = profile?.stripe_customer_id ?? undefined;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: {
        user_id: user.id,
      },
    });

    customerId = customer.id;

    await supabase.from("profiles").upsert(
      {
        id: user.id,
        email: user.email ?? profile?.email ?? "",
        plan: profile?.plan ?? "free",
        stripe_customer_id: customerId,
      },
      { onConflict: "id" }
    );
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: user.id,
    success_url: `${origin}/?checkout=success`,
    cancel_url: `${origin}/?checkout=cancelled`,
    line_items: [
      {
        price: requireEnv("STRIPE_PRO_PRICE_ID"),
        quantity: 1,
      },
    ],
    metadata: {
      user_id: user.id,
    },
    subscription_data: {
      metadata: {
        user_id: user.id,
      },
    },
  });

  if (!session.url) {
    throw new Error("Stripe did not return a Checkout URL.");
  }

  redirect(session.url);
}
