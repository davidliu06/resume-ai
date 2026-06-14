import { FileText, LogOut, ShieldCheck, Zap } from "lucide-react";

import { signOut } from "@/app/actions";
import { AuthPanel } from "@/components/auth-panel";
import { ResumeUploadForm } from "@/components/resume-upload-form";
import { ReviewFeed } from "@/components/review-feed";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSupabaseEnvError } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Profile, Resume } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Home() {
  const setupError = getSupabaseEnvError();

  if (setupError) {
    return <SetupRequired detail={setupError} />;
  }

  let supabase;
  let user = null;

  try {
    supabase = await createSupabaseServerClient();
    const authResult = await supabase.auth.getUser();
    user = authResult.data.user;
  } catch (error) {
    console.error("Supabase setup failed", error);

    return (
      <SetupRequired detail="Supabase could not initialize. Check the Supabase URL and anon key in Vercel." />
    );
  }

  if (!user) {
    return <SignedOutHome />;
  }

  const [{ data: profileData }, { data: resumesData }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id,email,stripe_customer_id,plan")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("resumes")
      .select("id,user_id,file_url,score,analysis,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const profile =
    (profileData as Profile | null) ??
    ({
      id: user.id,
      email: user.email ?? "",
      stripe_customer_id: null,
      plan: "free",
    } satisfies Profile);
  const resumes = (resumesData ?? []) as Resume[];
  const latestResume = resumes[0] ?? null;
  const analysis = latestResume?.analysis ?? null;

  return (
    <main className="min-h-screen px-4 py-4 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <header className="flex min-h-14 items-center justify-between gap-3 rounded-lg border border-white/10 bg-slate-950/70 px-4 backdrop-blur">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-md border border-emerald-300/30 bg-emerald-300/10 text-sm font-semibold text-emerald-200">
              s
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold">spec.ai</h1>
              <p className="truncate text-xs text-slate-500">{profile.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              className={
                profile.plan === "pro"
                  ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-100"
                  : "border-white/10 bg-white/[0.04] text-slate-300"
              }
              variant="outline"
            >
              {profile.plan}
            </Badge>
            <form action={signOut}>
              <Button
                aria-label="Sign out"
                className="border-white/10 bg-slate-900/70"
                size="icon"
                type="submit"
                variant="outline"
              >
                <LogOut className="size-4" />
              </Button>
            </form>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[minmax(340px,0.9fr)_minmax(0,1.35fr)]">
          <aside className="grid content-start gap-4">
            <ResumeUploadForm />

            <div className="rounded-lg border border-white/10 bg-slate-900/65">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-100">
                  <FileText className="size-4 text-sky-300" />
                  Resume text
                </div>
                {latestResume ? (
                  <span className="text-xs tabular-nums text-slate-500">
                    Score {latestResume.score}
                  </span>
                ) : null}
              </div>
              <pre className="max-h-[640px] min-h-[420px] overflow-auto whitespace-pre-wrap p-4 font-mono text-xs leading-6 text-slate-300">
                {analysis?.rawText ??
                  "No resume parsed yet. Upload a selectable-text PDF to populate this pane."}
              </pre>
            </div>

            {resumes.length > 1 ? (
              <div className="rounded-lg border border-white/10 bg-slate-900/65 p-4">
                <div className="mb-3 text-sm font-medium text-slate-100">
                  Recent reviews
                </div>
                <div className="grid gap-2">
                  {resumes.slice(1).map((resume) => (
                    <div
                      className="flex items-center justify-between rounded-md border border-white/10 bg-slate-950/50 px-3 py-2 text-sm"
                      key={resume.id}
                    >
                      <span className="truncate text-slate-400">
                        {new Date(resume.created_at).toLocaleDateString()}
                      </span>
                      <span className="tabular-nums text-slate-200">
                        {resume.score}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </aside>

          <section className="min-w-0">
            <ReviewFeed analysis={analysis} plan={profile.plan} />
          </section>
        </section>
      </div>
    </main>
  );
}

function SignedOutHome() {
  return (
    <main className="flex min-h-screen items-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section>
          <Badge
            className="mb-5 border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
            variant="outline"
          >
            AI resume review for engineering roles
          </Badge>
          <h1 className="max-w-3xl text-5xl font-semibold leading-[1.02] text-slate-50 sm:text-6xl">
            spec.ai
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-400">
            Upload a PDF resume and get a blunt technical recruiter pass focused
            on metrics, depth, ATS signal, and before-vs-after rewrites.
          </p>
          <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-slate-900/50 p-4">
              <Zap className="mb-3 size-5 text-emerald-300" />
              <div className="text-sm font-medium text-slate-100">
                Server-side analysis
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                PDF text extraction, gpt-4o-mini review, and database writes happen in
                authenticated Server Actions.
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-slate-900/50 p-4">
              <ShieldCheck className="mb-3 size-5 text-sky-300" />
              <div className="text-sm font-medium text-slate-100">
                RLS-protected data
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Supabase policies keep profiles, resumes, and storage objects
                scoped to the signed-in user.
              </p>
            </div>
          </div>
        </section>
        <AuthPanel />
      </div>
    </main>
  );
}

function SetupRequired({ detail }: { detail?: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-xl rounded-lg border border-white/10 bg-slate-900/70 p-6">
        <h1 className="text-xl font-semibold text-slate-50">
          Environment setup required
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Add the Supabase, OpenAI, and Stripe variables from{" "}
          <code className="rounded bg-slate-950 px-1.5 py-0.5 text-slate-200">
            .env.example
          </code>
          , then run the SQL in{" "}
          <code className="rounded bg-slate-950 px-1.5 py-0.5 text-slate-200">
            supabase/schema.sql
          </code>
          .
        </p>
        {detail ? (
          <p className="mt-3 rounded-md border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
            {detail}
          </p>
        ) : null}
      </div>
    </main>
  );
}
