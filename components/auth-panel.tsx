"use client";

import { useActionState, useState } from "react";
import { ArrowRight, KeyRound, UserPlus } from "lucide-react";

import { signIn, signUp } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActionState } from "@/lib/types";

const initialState: ActionState = {
  ok: false,
  message: "",
};

export function AuthPanel() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [signInState, signInAction, signInPending] = useActionState(
    signIn,
    initialState
  );
  const [signUpState, signUpAction, signUpPending] = useActionState(
    signUp,
    initialState
  );
  const state = mode === "signin" ? signInState : signUpState;

  return (
    <div className="w-full max-w-md rounded-lg border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/30 backdrop-blur">
      <div className="mb-5 flex rounded-lg border border-white/10 bg-slate-950/70 p-1">
        <button
          type="button"
          className={`h-8 flex-1 rounded-md text-sm transition ${
            mode === "signin"
              ? "bg-white text-slate-950"
              : "text-slate-400 hover:text-slate-100"
          }`}
          onClick={() => setMode("signin")}
        >
          Sign in
        </button>
        <button
          type="button"
          className={`h-8 flex-1 rounded-md text-sm transition ${
            mode === "signup"
              ? "bg-white text-slate-950"
              : "text-slate-400 hover:text-slate-100"
          }`}
          onClick={() => setMode("signup")}
        >
          Create account
        </button>
      </div>

      <form
        action={mode === "signin" ? signInAction : signUpAction}
        className="grid gap-3"
      >
        <label className="grid gap-1.5 text-sm text-slate-300">
          Email
          <Input
            className="h-10 border-white/10 bg-slate-950/70"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </label>
        <label className="grid gap-1.5 text-sm text-slate-300">
          Password
          <Input
            className="h-10 border-white/10 bg-slate-950/70"
            name="password"
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            minLength={8}
            required
          />
        </label>

        {state.message ? (
          <p
            className={`rounded-md border px-3 py-2 text-sm ${
              state.ok
                ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
                : "border-red-400/25 bg-red-400/10 text-red-200"
            }`}
            aria-live="polite"
          >
            {state.message}
          </p>
        ) : null}

        <Button
          className="h-10 bg-emerald-300 text-slate-950 hover:bg-emerald-200"
          disabled={signInPending || signUpPending}
          type="submit"
        >
          {mode === "signin" ? (
            <KeyRound className="size-4" />
          ) : (
            <UserPlus className="size-4" />
          )}
          {signInPending || signUpPending
            ? "Working"
            : mode === "signin"
              ? "Enter dashboard"
              : "Start review"}
          <ArrowRight className="size-4" />
        </Button>
      </form>
    </div>
  );
}
