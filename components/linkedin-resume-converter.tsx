"use client";

import { useActionState } from "react";
import { FileText, Loader2, WandSparkles } from "lucide-react";

import { convertLinkedInToResume } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { LinkedInResumeState } from "@/lib/types";

const initialState: LinkedInResumeState = {
  ok: false,
  message: "",
  resumeMarkdown: "",
};

export function LinkedInResumeConverter() {
  const [state, action, pending] = useActionState(
    convertLinkedInToResume,
    initialState
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
              Paste exported profile text and turn it into an ATS-ready draft.
            </p>
          </div>
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
          Draft style
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

      <section className="pixel-panel min-h-[620px] overflow-hidden">
        <div className="flex items-center justify-between border-b-2 border-slate-950 bg-slate-800 px-4 py-3">
          <div className="flex items-center gap-2 font-mono text-sm font-black uppercase text-slate-50">
            <FileText className="size-4 text-emerald-200" />
            Resume draft
          </div>
          <div className="flex gap-1">
            <span className="size-3 border border-slate-950 bg-red-300" />
            <span className="size-3 border border-slate-950 bg-amber-300" />
            <span className="size-3 border border-slate-950 bg-emerald-300" />
          </div>
        </div>
        <pre className="min-h-[560px] overflow-auto whitespace-pre-wrap bg-slate-950/80 p-5 font-mono text-xs leading-6 text-slate-200">
          {state.resumeMarkdown ||
            "Your generated resume draft will appear here.\n\nTip: copy visible LinkedIn text from your profile, not just the profile URL. LinkedIn pages usually require auth and cannot be reliably scraped from a server action."}
        </pre>
      </section>
    </div>
  );
}
