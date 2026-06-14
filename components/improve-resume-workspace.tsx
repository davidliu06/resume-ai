"use client";

import { useMemo, useState } from "react";
import { Check, Crown, FilePenLine, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Plan, ResumeAnalysis } from "@/lib/types";

type Decision = "accepted" | "declined";

export function ImproveResumeWorkspace({
  analysis,
  onShowPricing,
  plan,
}: {
  analysis: ResumeAnalysis | null;
  onShowPricing: () => void;
  plan: Plan;
}) {
  const [resumeText, setResumeText] = useState(analysis?.rawText ?? "");
  const [decisions, setDecisions] = useState<Record<number, Decision>>({});
  const [reasons, setReasons] = useState<Record<number, string>>({});
  const isPremium = plan === "pro";
  const acceptedCount = useMemo(
    () => Object.values(decisions).filter((item) => item === "accepted").length,
    [decisions]
  );

  if (!analysis) {
    return (
      <section className="pixel-panel grid min-h-[520px] place-items-center p-8 text-center">
        <div className="max-w-md">
          <FilePenLine className="mx-auto mb-4 size-9 text-emerald-300" />
          <h2 className="font-mono text-lg font-black uppercase text-slate-50">
            Improve resume
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Run a resume assessment first. The editor will load your current
            resume text and the suggestions beside it.
          </p>
        </div>
      </section>
    );
  }

  function acceptSuggestion(index: number) {
    if (!isPremium) {
      return;
    }

    const suggestion = analysis?.suggestions[index];

    if (!suggestion) {
      return;
    }

    const before = suggestion.before.trim();
    const after = suggestion.after.trim();
    const nextText = before && resumeText.includes(before)
      ? resumeText.replace(before, after)
      : `${resumeText.trim()}\n\n${after}`;

    setResumeText(nextText);
    setDecisions((current) => ({ ...current, [index]: "accepted" }));
    setReasons((current) => ({
      ...current,
      [index]:
        before && resumeText.includes(before)
          ? "Applied directly to the matching resume text."
          : "Added as new resume text because the original excerpt was not found exactly.",
    }));
  }

  function declineSuggestion(index: number) {
    if (!isPremium) {
      return;
    }

    const suggestion = analysis?.suggestions[index];

    setDecisions((current) => ({ ...current, [index]: "declined" }));
    setReasons((current) => ({
      ...current,
      [index]: suggestion?.impact
        ? `Skipped for now: ${suggestion.impact}`
        : "Skipped for now. You can keep editing manually.",
    }));
  }

  return (
    <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
      <div className="pixel-panel overflow-hidden">
        <div className="flex items-center justify-between border-b-2 border-slate-950 bg-slate-800 px-4 py-3">
          <div className="flex items-center gap-2 font-mono text-sm font-black uppercase text-slate-50">
            <FilePenLine className="size-4 text-emerald-200" />
            Editable resume
          </div>
          <span className="font-mono text-xs text-slate-400">
            {acceptedCount} accepted
          </span>
        </div>
        <Textarea
          className="min-h-[720px] resize-y rounded-none border-0 bg-[#fffdf7] p-8 font-mono text-base leading-7 text-black shadow-inner placeholder:text-slate-500 focus-visible:ring-0"
          onChange={(event) => setResumeText(event.target.value)}
          value={resumeText}
        />
        <div className="border-t-2 border-slate-200 bg-[#fff8dc] px-4 py-3 text-xs text-slate-700">
          Tip: click inside the resume to edit text directly. Accepted
          suggestions update this editor, but you can still revise every line.
        </div>
      </div>

      <div className="grid content-start gap-3">
        {!isPremium ? (
          <div className="pixel-panel bg-emerald-950/40 p-4">
            <div className="flex items-start gap-3">
              <Crown className="mt-1 size-5 text-amber-300" />
              <div>
                <div className="font-mono text-sm font-black uppercase text-emerald-100">
                  Premium access
                </div>
                <p className="mt-1 text-sm leading-6 text-emerald-100/70">
                  Premium Pass unlocks one-click accept and decline decisions.
                </p>
                <Button
                  className="pixel-button mt-3 h-10"
                  onClick={onShowPricing}
                  type="button"
                >
                  <Crown className="size-4" />
                  View Pricing
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {analysis.suggestions.map((suggestion, index) => (
          <article className="pixel-panel p-4" key={`${suggestion.title}-${index}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-mono text-sm font-black uppercase text-slate-50">
                  {suggestion.title}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {suggestion.category ?? suggestion.severity}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  aria-label="Accept suggestion"
                  className="pixel-icon-button bg-emerald-300 text-slate-950 hover:bg-emerald-200"
                  disabled={!isPremium}
                  onClick={() => acceptSuggestion(index)}
                  size="icon"
                  type="button"
                >
                  <Check className="size-4" />
                </Button>
                <Button
                  aria-label="Decline suggestion"
                  className="pixel-icon-button bg-red-300 text-slate-950 hover:bg-red-200"
                  disabled={!isPremium}
                  onClick={() => declineSuggestion(index)}
                  size="icon"
                  type="button"
                >
                  <X className="size-4" />
                </Button>
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              {suggestion.rationale}
            </p>
            {suggestion.impact ? (
              <p className="mt-2 border-2 border-slate-950 bg-slate-950/60 p-3 text-sm leading-6 text-slate-300 shadow-[3px_3px_0_#020617]">
                {suggestion.impact}
              </p>
            ) : null}
            {decisions[index] ? (
              <div className="mt-3 border-2 border-slate-950 bg-slate-800 px-3 py-2 text-xs leading-5 text-slate-300 shadow-[3px_3px_0_#020617]">
                <span className="font-mono font-black uppercase text-emerald-200">
                  {decisions[index]}
                </span>
                <span className="ml-2">{reasons[index]}</span>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
