import { ArrowRight, Lock, Sparkles, Target } from "lucide-react";

import { createCheckoutSession } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { Plan, ResumeAnalysis } from "@/lib/types";

const severityTone = {
  critical: "border-red-300/30 bg-red-400/10 text-red-200",
  high: "border-orange-300/30 bg-orange-400/10 text-orange-100",
  medium: "border-sky-300/30 bg-sky-400/10 text-sky-100",
  low: "border-emerald-300/30 bg-emerald-400/10 text-emerald-100",
};

export function ReviewFeed({
  analysis,
  plan,
}: {
  analysis: ResumeAnalysis | null;
  plan: Plan;
}) {
  if (!analysis) {
    return (
      <div className="pixel-panel flex min-h-[540px] items-center justify-center border-dashed p-8 text-center">
        <div className="max-w-sm">
          <Sparkles className="mx-auto mb-4 size-8 text-emerald-300" />
          <h2 className="text-lg font-semibold text-slate-100">
            Upload a resume to generate the first review feed.
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            The analysis will score the resume, extract ATS keywords, and produce
            before-vs-after edits.
          </p>
        </div>
      </div>
    );
  }

  const locked = plan === "free" && analysis.suggestions.length > 3;

  return (
    <div className="grid gap-4">
      <div className="pixel-panel p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-100">
              <Target className="size-4 text-emerald-300" />
              Recruiter score
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              {analysis.summary}
            </p>
          </div>
          <div className="min-w-16 text-right">
            <div className="text-3xl font-semibold tabular-nums text-slate-50">
              {analysis.score}
            </div>
            <div className="text-xs text-slate-500">/ 100</div>
          </div>
        </div>
        <Progress className="mt-4 bg-slate-950" value={analysis.score} />
        {analysis.atsKeywords.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {analysis.atsKeywords.slice(0, 12).map((keyword) => (
              <Badge
                className="pixel-badge border-slate-950 bg-slate-800 text-slate-300"
                key={keyword}
                variant="outline"
              >
                {keyword}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>

      <div className="grid gap-3">
        {analysis.suggestions.map((suggestion, index) => {
          const isLocked = plan === "free" && index >= 3;

          return (
            <div
              className="pixel-panel relative overflow-hidden"
              key={`${suggestion.title}-${index}`}
            >
              <div
                className={cn(
                  "grid gap-3 p-4 transition",
                  isLocked && "max-h-36 select-none overflow-hidden blur-[3px]"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-slate-100">
                      {suggestion.title}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      Suggestion {index + 1}
                    </div>
                  </div>
                  <Badge
                    className={severityTone[suggestion.severity]}
                    variant="outline"
                  >
                    {suggestion.severity}
                  </Badge>
                </div>

                <div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr]">
                  <div className="border-2 border-slate-950 bg-red-950/30 p-3 shadow-[3px_3px_0_#020617]">
                    <div className="mb-2 font-mono text-xs font-black uppercase text-red-200/80">
                      Before
                    </div>
                    <p className="text-sm leading-6 text-slate-300">
                      {suggestion.before}
                    </p>
                  </div>
                  <div className="hidden items-center text-slate-500 lg:flex">
                    <ArrowRight className="size-4" />
                  </div>
                  <div className="border-2 border-slate-950 bg-emerald-950/30 p-3 shadow-[3px_3px_0_#020617]">
                    <div className="mb-2 font-mono text-xs font-black uppercase text-emerald-200/80">
                      After
                    </div>
                    <p className="text-sm leading-6 text-slate-200">
                      {suggestion.after}
                    </p>
                  </div>
                </div>

                <p className="text-sm leading-6 text-slate-400">
                  {suggestion.rationale}
                </p>
              </div>

              {isLocked ? (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[1px]">
                  <div className="flex items-center gap-2 border-2 border-slate-950 bg-slate-950/90 px-3 py-2 font-mono text-xs uppercase text-slate-200 shadow-[3px_3px_0_#020617]">
                    <Lock className="size-4 text-emerald-300" />
                    Pro suggestion
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {locked ? (
        <form
          action={createCheckoutSession}
          className="pixel-panel bg-emerald-950/40 p-4"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-mono text-sm font-black uppercase text-emerald-100">
                Full review locked
              </div>
              <p className="mt-1 text-sm text-emerald-100/70">
                Free accounts see 3 suggestions. Pro unlocks the complete feed.
              </p>
            </div>
            <Button
              className="pixel-button h-10"
              type="submit"
            >
              <Lock className="size-4" />
              Unlock Full Review
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
