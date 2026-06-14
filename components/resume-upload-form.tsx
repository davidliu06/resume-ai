"use client";

import { useActionState } from "react";
import { FileUp, Loader2, ScanSearch } from "lucide-react";

import { uploadResume } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActionState } from "@/lib/types";

const initialState: ActionState = {
  ok: false,
  message: "",
};

export function ResumeUploadForm() {
  const [state, action, pending] = useActionState(uploadResume, initialState);

  return (
    <form
      action={action}
      className="pixel-panel grid gap-3 p-4"
    >
      <div className="flex items-center gap-2 font-mono text-sm font-black uppercase text-slate-100">
        <ScanSearch className="size-4 text-emerald-300" />
        New resume review
      </div>
      <label className="grid gap-2 text-sm text-slate-300">
        <span className="sr-only">PDF resume</span>
        <Input
          className="pixel-input h-11 file:text-slate-200"
          name="resume"
          type="file"
          accept="application/pdf,.pdf"
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
        disabled={pending}
        type="submit"
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <FileUp className="size-4" />
        )}
        {pending ? "Parsing and scoring" : "Upload PDF"}
      </Button>
    </form>
  );
}
