"use client";

import { useActionState, useMemo, useState } from "react";
import { Check, Crown, FilePenLine, Loader2, WandSparkles, X } from "lucide-react";

import { generateResumeRewriteSuggestions } from "@/app/actions";
import { Button } from "@/components/ui/button";
import type { Plan, ResumeAnalysis, ResumeRewriteState } from "@/lib/types";

type Decision = "accepted" | "declined";

const rewriteInitialState: ResumeRewriteState = {
  ok: false,
  message: "",
  suggestions: [],
};

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
  const [rewriteState, rewriteAction, rewritePending] = useActionState(
    async (previousState: ResumeRewriteState, formData: FormData) => {
      const nextState = await generateResumeRewriteSuggestions(
        previousState,
        formData
      );

      if (nextState.ok) {
        setDecisions({});
        setReasons({});
      }

      return nextState;
    },
    rewriteInitialState
  );
  const isPremium = plan === "pro";
  const activeSuggestions = rewriteState.suggestions.length
    ? rewriteState.suggestions
    : analysis?.suggestions ?? [];
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

    const suggestion = activeSuggestions[index];

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

    const suggestion = activeSuggestions[index];

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
        <textarea
          className="min-h-[720px] w-full resize-y rounded-none border-0 bg-white p-8 font-mono text-base leading-7 text-black caret-black shadow-inner outline-none placeholder:text-slate-500"
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

        <form
          action={rewriteAction}
          className="pixel-panel flex flex-col gap-3 bg-slate-900/80 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <input name="resumeText" type="hidden" value={resumeText} />
          <div>
            <div className="font-mono text-sm font-black uppercase text-slate-50">
              Line-level edits
            </div>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              Generate a fresh batch of concrete before/after rewrites from the
              resume text on the left.
            </p>
            {rewriteState.message ? (
              <p
                className={`mt-2 font-mono text-xs ${
                  rewriteState.ok ? "text-emerald-200" : "text-red-200"
                }`}
                aria-live="polite"
              >
                {rewriteState.message}
              </p>
            ) : null}
          </div>
          <Button
            className="pixel-button h-10 shrink-0"
            disabled={!isPremium || rewritePending || resumeText.length < 120}
            type="submit"
          >
            {rewritePending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <WandSparkles className="size-4" />
            )}
            {rewritePending ? "Writing edits" : "Generate rewrite edits"}
          </Button>
        </form>

        {activeSuggestions.map((suggestion, index) => (
          <article className="pixel-panel p-4" key={`${suggestion.title}-${index}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-mono text-sm font-black uppercase text-emerald-100">
                  Edit {String(index + 1).padStart(2, "0")}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {suggestion.category ?? suggestion.severity} ·{" "}
                  {suggestion.title}
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
            <div className="mt-3 grid gap-3">
              <div className="border-2 border-slate-950 bg-red-950/30 p-3 shadow-[3px_3px_0_#020617]">
                <div className="mb-2 font-mono text-[11px] font-black uppercase text-red-200">
                  Before
                </div>
                <p className="text-[13px] leading-5 text-slate-300">
                  {suggestion.before}
                </p>
              </div>
              <div className="border-2 border-slate-950 bg-emerald-950/30 p-3 shadow-[3px_3px_0_#020617]">
                <div className="mb-2 font-mono text-[11px] font-black uppercase text-emerald-200">
                  After
                </div>
                <p className="text-[13px] leading-5 text-slate-100">
                  {suggestion.after || "Delete this text."}
                </p>
              </div>
            </div>
            <div className="mt-3 grid gap-2 border-2 border-slate-950 bg-slate-950/60 p-3 text-xs leading-5 text-slate-400 shadow-[3px_3px_0_#020617]">
              <p>{suggestion.rationale}</p>
              {suggestion.impact ? <p>{suggestion.impact}</p> : null}
            </div>
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
