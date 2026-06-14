"use client";

import { useActionState, useMemo, useState } from "react";
import {
  Download,
  FileText,
  Loader2,
  Lock,
  WandSparkles,
} from "lucide-react";

import { convertLinkedInToResume } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { LinkedInResumeState } from "@/lib/types";

const initialState: LinkedInResumeState = {
  ok: false,
  message: "",
  resumeMarkdown: "",
};

const resumeStyles = [
  {
    id: "classic",
    label: "Classic Resume",
    source: "Classic-Resume-12851.docx",
    description: "Centered name, traditional sections, tight ATS layout.",
  },
  {
    id: "easy",
    label: "Easy Resume",
    source: "Easy-Resume-13122.docx",
    description: "Simple spacing and readable hierarchy for quick edits.",
  },
  {
    id: "traditional",
    label: "Traditional Simple",
    source: "Traditional-Simple-Resume-17613.docx",
    description: "Conservative, single-column, recruiter-friendly.",
  },
  {
    id: "general",
    label: "General Resume",
    source: "General-Resume-23100.docx",
    description: "Balanced section density for internships and early career.",
  },
  {
    id: "business",
    label: "Business Resume",
    source: "Business-Resume-12524.docx",
    description: "Subtle sidebar feel with polished professional contrast.",
  },
  {
    id: "editable",
    label: "Editable Professional",
    source: "Editable-Professional-Resume-18665.docx",
    description: "Modern headings with clean professional spacing.",
  },
  {
    id: "combination",
    label: "Combination Resume",
    source: "Combination-Resume-20228.docx",
    description: "Skills-forward layout with experience support.",
  },
  {
    id: "two-page",
    label: "Two Page Resume",
    source: "Two-Page-Resume-19210.docx",
    description: "Roomier format for larger project and experience histories.",
  },
] as const;

type ResumeStyleId = (typeof resumeStyles)[number]["id"];

export function LinkedInResumeConverter() {
  const [state, action, pending] = useActionState(
    convertLinkedInToResume,
    initialState
  );
  const [selectedStyle, setSelectedStyle] = useState<ResumeStyleId>("classic");
  const activeStyle = useMemo(
    () => resumeStyles.find((style) => style.id === selectedStyle)!,
    [selectedStyle]
  );

  return (
    <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <form action={action} className="pixel-panel grid content-start gap-4 p-4">
        <div className="flex items-center gap-2">
          <WandSparkles className="size-5 text-fuchsia-200" />
          <div>
            <h2 className="font-mono text-sm font-black uppercase text-slate-50">
              LinkedIn to Resume
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Paste profile text, choose a style, then export a PDF resume.
            </p>
          </div>
        </div>

        <div className="border-2 border-slate-950 bg-slate-950/70 p-3 shadow-[3px_3px_0_#020617]">
          <div className="flex items-center gap-2 font-mono text-xs font-black uppercase text-amber-200">
            <Lock className="size-4" />
            Direct LinkedIn import
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            LinkedIn sign-in can verify identity, but full profile and work
            history access requires LinkedIn API approval. Until that approval
            is available, paste your visible profile text here.
          </p>
        </div>

        <label className="grid gap-2 text-sm text-slate-300">
          Target role
          <Input
            className="pixel-input h-11"
            name="targetRole"
            placeholder="Aerospace mechanical engineering intern"
          />
        </label>

        <label className="grid gap-2 text-sm text-slate-300">
          Draft strategy
          <select
            className="pixel-input h-11 rounded-none px-3 text-sm text-slate-100 outline-none"
            name="tone"
            defaultValue="technical"
          >
            <option value="technical">Technical and metrics-first</option>
            <option value="startup">Concise startup operator</option>
            <option value="ats">ATS keyword dense</option>
          </select>
        </label>

        <div className="grid gap-2">
          <div className="text-sm text-slate-300">Resume style</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {resumeStyles.map((style) => (
              <button
                className={cn(
                  "border-2 border-slate-950 bg-slate-900 p-3 text-left shadow-[3px_3px_0_#020617] transition hover:-translate-y-0.5",
                  selectedStyle === style.id &&
                    "bg-emerald-300 text-slate-950"
                )}
                key={style.id}
                onClick={() => setSelectedStyle(style.id)}
                type="button"
              >
                <span className="block font-mono text-xs font-black uppercase">
                  {style.label}
                </span>
                <span
                  className={cn(
                    "mt-1 block text-[11px] leading-4 text-slate-500",
                    selectedStyle === style.id && "text-slate-950/70"
                  )}
                >
                  {style.source}
                </span>
              </button>
            ))}
          </div>
          <p className="text-xs leading-5 text-slate-500">
            {activeStyle.description}
          </p>
        </div>

        <label className="grid gap-2 text-sm text-slate-300">
          LinkedIn/profile text
          <Textarea
            className="pixel-input min-h-72 resize-y"
            name="profileText"
            placeholder="Paste About, Experience, Education, Projects, Skills, Awards..."
            required
          />
        </label>

        {state.message ? (
          <p
            className={`border-2 px-3 py-2 font-mono text-xs ${
              state.ok
                ? "border-emerald-300 bg-emerald-950/50 text-emerald-100"
                : "border-red-300 bg-red-950/50 text-red-100"
            }`}
            aria-live="polite"
          >
            {state.message}
          </p>
        ) : null}

        <Button className="pixel-button h-11" disabled={pending} type="submit">
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <WandSparkles className="size-4" />
          )}
          {pending ? "Generating draft" : "Generate resume"}
        </Button>
      </form>

      <section className="pixel-panel min-h-[680px] overflow-hidden">
        <div className="flex flex-col gap-3 border-b-2 border-slate-950 bg-slate-800 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 font-mono text-sm font-black uppercase text-slate-50">
              <FileText className="size-4 text-emerald-200" />
              Resume draft
            </div>
            <p className="mt-1 text-xs text-slate-400">{activeStyle.label}</p>
          </div>
          <Button
            className="pixel-button h-9"
            disabled={!state.resumeMarkdown}
            onClick={() => window.print()}
            type="button"
          >
            <Download className="size-4" />
            Download PDF
          </Button>
        </div>

        <div className="bg-slate-950/80 p-4">
          <div
            className={cn(
              "resume-print-area resume-template",
              `resume-template-${selectedStyle}`
            )}
          >
            {state.resumeMarkdown ? (
              <MarkdownResume markdown={state.resumeMarkdown} />
            ) : (
              <div className="resume-empty">
                <h2>Your generated resume draft will appear here.</h2>
                <p>
                  Choose a template, paste visible LinkedIn/profile text, and
                  generate a draft. The download button opens your browser PDF
                  export dialog.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function MarkdownResume({ markdown }: { markdown: string }) {
  const lines = markdown
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <div>
      {lines.map((line, index) => {
        const cleaned = line.replace(/^#{1,6}\s*/, "");

        if (index === 0 || line.startsWith("# ")) {
          return <h1 key={`${line}-${index}`}>{cleaned}</h1>;
        }

        if (line.startsWith("##") || /^[A-Z][A-Z\s/&+-]{3,}$/.test(line)) {
          return <h2 key={`${line}-${index}`}>{cleaned}</h2>;
        }

        if (line.startsWith("- ") || line.startsWith("* ")) {
          return <p className="resume-bullet" key={`${line}-${index}`}>{line.slice(2)}</p>;
        }

        return <p key={`${line}-${index}`}>{cleaned}</p>;
      })}
    </div>
  );
}
