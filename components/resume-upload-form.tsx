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
      className="grid gap-3 rounded-lg border border-white/10 bg-slate-900/65 p-4"
    >
      <div className="flex items-center gap-2 text-sm font-medium text-slate-100">
        <ScanSearch className="size-4 text-emerald-300" />
        New resume review
      </div>
      <label className="grid gap-2 text-sm text-slate-300">
        <span className="sr-only">PDF resume</span>
        <Input
          className="h-10 border-white/10 bg-slate-950/70 file:text-slate-200"
          name="resume"
          type="file"
          accept="application/pdf,.pdf"
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
