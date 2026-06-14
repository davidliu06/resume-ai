"use client";

import { useState } from "react";
import {
  BriefcaseBusiness,
  ExternalLink,
  FileCode2,
  FileSearch,
  FileText,
  Globe2,
  Link2,
  LogOut,
  Sparkles,
} from "lucide-react";

import { signOut } from "@/app/actions";
import { LinkedInResumeConverter } from "@/components/linkedin-resume-converter";
import { PixelLogo } from "@/components/pixel-logo";
import { PremiumPanel } from "@/components/premium-panel";
import { ResumeUploadForm } from "@/components/resume-upload-form";
import { ReviewFeed } from "@/components/review-feed";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Plan, Resume, ResumeAnalysis } from "@/lib/types";

type WorkspaceMode = "assessment" | "linkedin" | "portfolio" | "jobs";

const modes: Array<{
  id: WorkspaceMode;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: "assessment",
    label: "Resume assessment",
    description: "Score and improve a PDF resume",
    icon: FileSearch,
  },
  {
    id: "linkedin",
    label: "LinkedIn to resume",
    description: "Convert profile text into a resume",
    icon: Link2,
  },
  {
    id: "portfolio",
    label: "Resume/LinkedIn to portfolio",
    description: "Generate a portfolio structure",
    icon: Globe2,
  },
  {
    id: "jobs",
    label: "Job applications",
    description: "Track roles and materials",
    icon: BriefcaseBusiness,
  },
];

export function AppWorkspace({
  profile,
  resumes,
  analysis,
}: {
  profile: { email: string; plan: Plan };
  resumes: Resume[];
  analysis: ResumeAnalysis | null;
}) {
  const [mode, setMode] = useState<WorkspaceMode>("assessment");
  const latestResume = resumes[0] ?? null;

  return (
    <main className="min-h-screen px-3 py-3 text-slate-100 sm:px-5 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <header className="pixel-panel flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <PixelLogo />
            <div className="flex flex-wrap items-center gap-2">
              <button
                className="pixel-mini-tab bg-slate-900 text-slate-200"
                onClick={() => setMode("assessment")}
                type="button"
              >
                <Sparkles className="size-3.5 text-emerald-200" />
                Arcade dashboard
              </button>
              <Badge
                className={
                  profile.plan === "pro"
                    ? "pixel-badge border-emerald-300 bg-emerald-300 text-slate-950"
                    : "pixel-badge border-slate-950 bg-slate-800 text-slate-200"
                }
                variant="outline"
              >
                {profile.plan}
              </Badge>
              <span className="max-w-[220px] truncate font-mono text-xs text-slate-400">
                {profile.email}
              </span>
              <form action={signOut}>
                <Button
                  aria-label="Sign out"
                  className="pixel-icon-button"
                  size="icon"
                  type="submit"
                  variant="outline"
                >
                  <LogOut className="size-4" />
                </Button>
              </form>
            </div>
          </div>

          <nav className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {modes.map((item) => {
              const Icon = item.icon;
              const active = mode === item.id;

              return (
                <button
                  className={cn(
                    "pixel-mode-button group text-left",
                    active && "is-active"
                  )}
                  key={item.id}
                  onClick={() => setMode(item.id)}
                  type="button"
                >
                  <span className="flex items-center gap-2 font-mono text-xs font-black uppercase">
                    <Icon className="size-4" />
                    {item.label}
                  </span>
                  <span className="mt-2 block text-xs leading-5 text-slate-400 group-[.is-active]:text-slate-950/70">
                    {item.description}
                  </span>
                </button>
              );
            })}
          </nav>
        </header>

        {mode === "assessment" ? (
          <section className="grid gap-4 lg:grid-cols-[minmax(340px,0.9fr)_minmax(0,1.35fr)]">
            <aside className="grid content-start gap-4">
              <ResumeUploadForm />

              <div className="pixel-panel overflow-hidden">
                <div className="flex items-center justify-between border-b-2 border-slate-950 bg-slate-800 px-4 py-3">
                  <div className="flex items-center gap-2 font-mono text-sm font-black uppercase text-slate-50">
                    <FileText className="size-4 text-sky-300" />
                    Resume text
                  </div>
                  {latestResume ? (
                    <span className="font-mono text-xs tabular-nums text-emerald-200">
                      Score {latestResume.score}
                    </span>
                  ) : null}
                </div>
                <pre className="max-h-[640px] min-h-[420px] overflow-auto whitespace-pre-wrap bg-slate-950/75 p-4 font-mono text-xs leading-6 text-slate-300">
                  {analysis?.rawText ??
                    "No resume parsed yet. Upload a selectable-text PDF to populate this pane."}
                </pre>
              </div>

              {resumes.length > 1 ? (
                <div className="pixel-panel p-4">
                  <div className="mb-3 font-mono text-sm font-black uppercase text-slate-100">
                    Recent reviews
                  </div>
                  <div className="grid gap-2">
                    {resumes.slice(1).map((resume) => (
                      <div
                        className="flex items-center justify-between border-2 border-slate-950 bg-slate-900 px-3 py-2 text-sm shadow-[3px_3px_0_#020617]"
                        key={resume.id}
                      >
                        <span className="truncate text-slate-400">
                          {new Date(resume.created_at).toLocaleDateString()}
                        </span>
                        <span className="font-mono tabular-nums text-slate-200">
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
        ) : null}

        {mode === "linkedin" ? <LinkedInResumeConverter /> : null}

        {mode === "portfolio" ? (
          <PlaceholderPanel
            icon={FileCode2}
            title="Portfolio converter"
            body="This workspace is staged for turning resume and LinkedIn material into a personal portfolio outline, case-study cards, and project copy."
          />
        ) : null}

        {mode === "jobs" ? (
          <PlaceholderPanel
            icon={BriefcaseBusiness}
            title="Job application area"
            body="This area is staged for saved roles, fit notes, resume versions, and application status tracking."
          />
        ) : null}

        <PremiumPanel plan={profile.plan} />
      </div>
    </main>
  );
}

function PlaceholderPanel({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <section className="pixel-panel min-h-[420px] p-6">
      <div className="flex items-center gap-3">
        <div className="grid size-12 place-items-center border-2 border-slate-950 bg-sky-300 text-slate-950 shadow-[4px_4px_0_#020617]">
          <Icon className="size-6" />
        </div>
        <div>
          <h2 className="font-mono text-lg font-black uppercase text-slate-50">
            {title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            {body}
          </p>
        </div>
      </div>
      <div className="mt-8 grid gap-3 md:grid-cols-3">
        {["Input", "Generate", "Export"].map((step, index) => (
          <div
            className="border-2 border-slate-950 bg-slate-900 p-4 shadow-[4px_4px_0_#020617]"
            key={step}
          >
            <div className="font-mono text-xs font-black uppercase text-fuchsia-200">
              Stage {index + 1}
            </div>
            <div className="mt-2 text-sm text-slate-200">{step}</div>
          </div>
        ))}
      </div>
      <div className="mt-6 inline-flex items-center gap-2 border-2 border-slate-950 bg-slate-800 px-3 py-2 font-mono text-xs uppercase text-slate-300 shadow-[3px_3px_0_#020617]">
        <ExternalLink className="size-3.5" />
        Coming next
      </div>
    </section>
  );
}
