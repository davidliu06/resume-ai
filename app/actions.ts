"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Stripe from "stripe";

import { analyzeResumeText, extractPdfText } from "@/lib/analysis";
import { requireEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionState, Profile } from "@/lib/types";

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
