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
    <div className="pixel-panel w-full max-w-md p-5">
      <div className="mb-5 flex border-2 border-slate-950 bg-slate-950 p-1 shadow-[3px_3px_0_#020617]">
        <button
          type="button"
          className={`h-9 flex-1 font-mono text-xs font-black uppercase transition ${
            mode === "signin"
              ? "bg-emerald-300 text-slate-950"
              : "text-slate-400 hover:text-slate-100"
          }`}
          onClick={() => setMode("signin")}
        >
          Sign in
        </button>
        <button
          type="button"
          className={`h-9 flex-1 font-mono text-xs font-black uppercase transition ${
            mode === "signup"
              ? "bg-emerald-300 text-slate-950"
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
            className="pixel-input h-11"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </label>
        <label className="grid gap-1.5 text-sm text-slate-300">
          Password
          <Input
            className="pixel-input h-11"
            name="password"
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            minLength={8}
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

        <Button
          className="pixel-button h-11"
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
