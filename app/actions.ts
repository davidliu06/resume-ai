"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Stripe from "stripe";

import {
  analyzeResumeText,
  extractPdfText,
  extractPdfTextWithLinks,
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
} from "@/lib/types";

const MAX_PDF_BYTES = 8 * 1024 * 1024;

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

export async function optimizePortfolioFromResume(
  _prevState: PortfolioOptimizeState,
  formData: FormData
): Promise<PortfolioOptimizeState> {
  try {
    await getAuthedUser();

    const resumeText = cleanResumeText(
      String(formData.get("resumeText") ?? "").trim()
    );

    if (resumeText.length < 120) {
      return {
        ok: false,
        message: "Paste more resume text before optimizing a portfolio.",
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
            "You are a portfolio creative director for early-career engineering candidates. Decide what resume material belongs on a concise personal portfolio site. Keep truthful claims only. Output JSON only.",
        },
        {
          role: "user",
          content: `Create editable portfolio blocks from this resume. Keep the strongest projects, technical skills, education, and contact links. Drop filler, repetitive bullets, and resume-only details. Return JSON:
{
  "blocks": [
    {"type":"text","text":"site copy","x":40,"y":40,"width":420,"height":90},
    {"type":"frame","shape":"circle","x":760,"y":48,"width":128,"height":128}
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

    return {
      id: crypto.randomUUID(),
      type,
      text:
        type === "text"
          ? String(item.text ?? "Edit this portfolio text")
          : undefined,
      src: type === "image" ? item.src : undefined,
      shape: item.shape === "circle" ? "circle" : "rect",
      x: clampNumber(item.x, 20, 860),
      y: clampNumber(item.y, 20, 920),
      width: clampNumber(item.width, type === "text" ? 220 : 120, 520),
      height: clampNumber(item.height, type === "text" ? 70 : 120, 320),
    };
  });
}

function clampNumber(value: unknown, fallback: number, max: number) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.min(Math.max(number, 0), max);
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
