import { Check, Crown, Lock, Sparkles, Zap } from "lucide-react";

import { createCheckoutSession } from "@/app/actions";
import { Button } from "@/components/ui/button";
import type { Plan } from "@/lib/types";

const features = [
  "Unlimited full resume reviews",
  "All suggestions unlocked",
  "LinkedIn to resume drafts",
  "Styled PDF resume exports",
  "Portfolio conversion workspace",
  "Job application tracker area",
];

export function PremiumPanel({ plan }: { plan: Plan }) {
  return (
    <section className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
      <div className="pixel-panel p-5">
        <div className="flex items-center gap-3">
          <div className="grid size-12 place-items-center border-2 border-slate-950 bg-amber-300 text-slate-950 shadow-[4px_4px_0_#020617]">
            <Crown className="size-6" />
          </div>
          <div>
            <h2 className="font-mono text-lg font-black uppercase text-slate-50">
              Premium Pass
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Unlock the full career toolkit.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3">
          {features.map((feature) => (
            <div
              className="flex items-center gap-3 border-2 border-slate-950 bg-slate-900 px-3 py-2 text-sm text-slate-200 shadow-[3px_3px_0_#020617]"
              key={feature}
            >
              <Check className="size-4 text-emerald-300" />
              {feature}
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="pixel-panel flex flex-col p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-mono text-base font-black uppercase text-slate-50">
                Free
              </h3>
              <p className="mt-1 text-sm text-slate-400">Good for a first scan.</p>
            </div>
            <Lock className="size-5 text-slate-500" />
          </div>
          <div className="mt-5 font-mono text-4xl font-black text-slate-50">
            $0
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Upload resumes, see the score, and read the first 3 suggestions.
            Full review cards remain locked.
          </p>
          <div className="mt-auto pt-5">
            <div className="border-2 border-slate-950 bg-slate-800 px-3 py-2 text-center font-mono text-xs uppercase text-slate-300 shadow-[3px_3px_0_#020617]">
              Current starter tier
            </div>
          </div>
        </div>

        <div className="pixel-panel relative flex flex-col overflow-hidden p-5">
          <div className="absolute right-4 top-4 border-2 border-slate-950 bg-fuchsia-300 px-2 py-1 font-mono text-[10px] font-black uppercase text-slate-950 shadow-[3px_3px_0_#020617]">
            Popular
          </div>
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center border-2 border-slate-950 bg-emerald-300 text-slate-950 shadow-[3px_3px_0_#020617]">
              <Zap className="size-5" />
            </div>
            <div>
              <h3 className="pr-20 font-mono text-base font-black uppercase text-slate-50">
                Premium Pass
              </h3>
              <p className="mt-1 text-sm text-slate-400">
                The paid tier for active applications.
              </p>
            </div>
          </div>
          <div className="mt-5 flex items-end gap-2">
            <span className="font-mono text-4xl font-black text-emerald-200">
              Pass
            </span>
            <span className="pb-1 text-sm text-slate-400">via Stripe Checkout</span>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Unlock every suggestion, generate more complete career assets, and
            export styled resume PDFs while keeping the conversion tools available
            as they come online.
          </p>

          <form action={createCheckoutSession} className="mt-auto pt-5">
            <Button
              className="pixel-button h-11 w-full disabled:opacity-75"
              disabled={plan === "pro"}
              type="submit"
            >
              <Sparkles className="size-4" />
              {plan === "pro"
                ? "Premium Pass Active"
                : "Upgrade to Premium Pass"}
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}
