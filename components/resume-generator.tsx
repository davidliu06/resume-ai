"use client";

import { useActionState, useMemo, useState } from "react";
import { Download, FileText, Loader2, Upload, WandSparkles } from "lucide-react";

import { prepareResumeExport } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  downloadResumePdf,
  resumeStyles,
  type ResumeStyleId,
} from "@/lib/resume-pdf";
import {
  getResumeLines,
  isBulletLine,
  isResumeHeading,
  lineToDisplayText,
  stripBullet,
} from "@/lib/resume-text";
import type { ResumeExportState, ResumeLink } from "@/lib/types";

const initialState: ResumeExportState = {
  ok: false,
  message: "",
  resumeText: "",
  links: [],
};

export function ResumeGenerator() {
  const [state, action, pending] = useActionState(
    prepareResumeExport,
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
              Resume generator
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Upload a PDF or paste text. The app preserves your words and only
              applies layout.
            </p>
          </div>
        </div>

        <label className="grid gap-2 text-sm text-slate-300">
          Upload resume PDF
          <div className="pixel-input flex min-h-20 items-center gap-3 p-3">
            <Upload className="size-5 text-emerald-200" />
            <input
              accept="application/pdf,.pdf"
              className="w-full text-sm file:mr-3 file:border-2 file:border-slate-950 file:bg-emerald-300 file:px-3 file:py-2 file:font-mono file:text-xs file:font-black file:uppercase file:text-slate-950"
              name="resumeFile"
              type="file"
            />
          </div>
        </label>

        <label className="grid gap-2 text-sm text-slate-300">
          Or paste resume text
          <Textarea
            className="pixel-input min-h-72 resize-y"
            name="resumeText"
            placeholder="Paste the exact resume text you want formatted..."
          />
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
            <FileText className="size-4" />
          )}
          {pending ? "Loading resume" : "Load resume text"}
        </Button>
      </form>

      <section className="pixel-panel min-h-[680px] overflow-hidden">
        <div className="flex flex-col gap-3 border-b-2 border-slate-950 bg-slate-800 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 font-mono text-sm font-black uppercase text-slate-50">
              <FileText className="size-4 text-emerald-200" />
              PDF preview
            </div>
            <p className="mt-1 text-xs text-slate-400">{activeStyle.label}</p>
          </div>
          <Button
            className="pixel-button h-9"
            disabled={!state.resumeText}
            onClick={() =>
              downloadResumePdf({
                links: state.links,
                text: state.resumeText,
                styleId: selectedStyle,
              })
            }
            type="button"
          >
            <Download className="size-4" />
            Download PDF
          </Button>
        </div>

        <div className="bg-slate-950/80 p-4">
          <div
            className={cn(
              "resume-template",
              `resume-template-${selectedStyle}`
            )}
          >
            {state.resumeText ? (
              <ResumePreview links={state.links} text={state.resumeText} />
            ) : (
              <div className="resume-empty">
                <h2>Your formatted resume will appear here.</h2>
                <p>
                  Upload a selectable-text PDF or paste the exact text to keep.
                  The generator will not add missing sections or rewrite bullets.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function ResumePreview({
  links,
  text,
}: {
  links: ResumeLink[];
  text: string;
}) {
  const lines = getResumeLines(text);

  return (
    <div>
      {lines.map((line, index) => {
        if (index === 0) {
          return (
            <h1 key={`${line}-${index}`}>
              <LinkedLine links={links} line={line} />
            </h1>
          );
        }

        if (isResumeHeading(line)) {
          return (
            <h2 key={`${line}-${index}`}>
              <LinkedLine links={links} line={line} />
            </h2>
          );
        }

        if (isBulletLine(line)) {
          return (
            <p className="resume-bullet" key={`${line}-${index}`}>
              <LinkedLine links={links} line={stripBullet(line)} />
            </p>
          );
        }

        return (
          <p key={`${line}-${index}`}>
            <LinkedLine links={links} line={line} />
          </p>
        );
      })}
    </div>
  );
}

function LinkedLine({
  links,
  line,
}: {
  links: ResumeLink[];
  line: string;
}) {
  const display = lineToDisplayText(line);
  const link = links.find(
    (item) =>
      line.includes(item.url) ||
      line.includes(`[${item.text}](${item.url})`) ||
      (item.text !== item.url && line.includes(item.text))
  );

  if (!link) {
    return display;
  }

  return (
    <a
      className="text-sky-700 underline decoration-sky-400 underline-offset-2"
      href={link.url}
      rel="noreferrer"
      target="_blank"
    >
      {display}
    </a>
  );
}
