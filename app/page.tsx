import { ShieldCheck, Sparkles, Zap } from "lucide-react";

import { AppWorkspace } from "@/components/app-workspace";
import { AuthPanel } from "@/components/auth-panel";
import { PixelLogo } from "@/components/pixel-logo";
import { Badge } from "@/components/ui/badge";
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

  return (
    <AppWorkspace
      analysis={latestResume?.analysis ?? null}
      profile={{
        email: profile.email,
        plan: profile.plan,
      }}
      resumes={resumes}
    />
  );
}

function SignedOutHome() {
  return (
    <main className="flex min-h-screen items-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.08fr_0.92fr]">
        <section>
          <PixelLogo className="mb-8" />
          <Badge
            className="pixel-badge mb-5 border-emerald-300 bg-emerald-300 text-slate-950"
            variant="outline"
          >
            AI career arcade
          </Badge>
          <h1 className="max-w-3xl font-mono text-5xl font-black uppercase leading-[1.02] text-slate-50 sm:text-6xl">
            Build your career loadout.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-400">
            Score resumes, format PDF exports, stage portfolio copy, and
            prep applications inside one pixel-sharp workspace.
          </p>
          <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
            <FeatureTile
              icon={Zap}
              label="gpt-4o-mini"
              text="Fast AI review and conversion flows."
            />
            <FeatureTile
              icon={ShieldCheck}
              label="RLS data"
              text="Supabase keeps user data scoped."
            />
            <FeatureTile
              icon={Sparkles}
              label="Premium Pass"
              text="Premium unlocks the full feed."
            />
          </div>
        </section>
        <AuthPanel />
      </div>
    </main>
  );
}

function FeatureTile({
  icon: Icon,
  label,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  text: string;
}) {
  return (
    <div className="pixel-panel p-4">
      <Icon className="mb-3 size-5 text-emerald-300" />
      <div className="font-mono text-xs font-black uppercase text-slate-100">
        {label}
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
    </div>
  );
}

function SetupRequired({ detail }: { detail?: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="pixel-panel max-w-xl p-6">
        <h1 className="font-mono text-xl font-black uppercase text-slate-50">
          Environment setup required
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Add the Supabase, OpenAI, and Stripe variables from{" "}
          <code className="bg-slate-950 px-1.5 py-0.5 font-mono text-slate-200">
            .env.example
          </code>
          , then run the SQL in{" "}
          <code className="bg-slate-950 px-1.5 py-0.5 font-mono text-slate-200">
            supabase/schema.sql
          </code>
          .
        </p>
        {detail ? (
          <p className="mt-3 border-2 border-amber-300 bg-amber-950/50 px-3 py-2 font-mono text-xs text-amber-100">
            {detail}
          </p>
        ) : null}
      </div>
    </main>
  );
}
