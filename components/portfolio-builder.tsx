"use client";

import { useMemo, useState } from "react";
import { Download, Globe2, Monitor, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  cleanResumeText,
  getResumeLines,
  isResumeHeading,
} from "@/lib/resume-text";

const themes = [
  { id: "terminal", label: "Terminal" },
  { id: "studio", label: "Studio" },
  { id: "operator", label: "Operator" },
] as const;

type PortfolioTheme = (typeof themes)[number]["id"];

export function PortfolioBuilder() {
  const [resumeText, setResumeText] = useState("");
  const [theme, setTheme] = useState<PortfolioTheme>("terminal");
  const cleaned = cleanResumeText(resumeText);
  const lines = useMemo(() => getResumeLines(cleaned), [cleaned]);
  const title = lines[0] || "Portfolio";

  return (
    <section className="grid gap-4 xl:grid-cols-[0.82fr_1.18fr]">
      <div className="pixel-panel grid content-start gap-4 p-4">
        <div className="flex items-center gap-2">
          <Globe2 className="size-5 text-sky-300" />
          <div>
            <h2 className="font-mono text-sm font-black uppercase text-slate-50">
              Resume to portfolio
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Turn resume text into a downloadable one-page website.
            </p>
          </div>
        </div>

        <label className="grid gap-2 text-sm text-slate-300">
          Resume text
          <Textarea
            className="pixel-input min-h-80 resize-y"
            onChange={(event) => setResumeText(event.target.value)}
            placeholder="Paste resume text..."
            value={resumeText}
          />
        </label>

        <div className="grid gap-2">
          <div className="text-sm text-slate-300">Site style</div>
          <div className="grid gap-2 sm:grid-cols-3">
            {themes.map((item) => (
              <button
                className={`border-2 border-slate-950 p-3 text-left font-mono text-xs font-black uppercase shadow-[3px_3px_0_#020617] ${
                  theme === item.id
                    ? "bg-emerald-300 text-slate-950"
                    : "bg-slate-900 text-slate-200"
                }`}
                key={item.id}
                onClick={() => setTheme(item.id)}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <Button
          className="pixel-button h-11"
          disabled={lines.length < 2}
          onClick={() => downloadPortfolioHtml(cleaned, theme)}
          type="button"
        >
          <Download className="size-4" />
          Download site HTML
        </Button>
      </div>

      <div className="pixel-panel overflow-hidden">
        <div className="flex items-center gap-2 border-b-2 border-slate-950 bg-slate-800 px-4 py-3 font-mono text-sm font-black uppercase text-slate-50">
          <Monitor className="size-4 text-emerald-200" />
          Website preview
        </div>
        <div className={`portfolio-preview portfolio-preview-${theme}`}>
          {lines.length ? (
            <PortfolioPreview lines={lines} title={title} />
          ) : (
            <div className="grid min-h-[520px] place-items-center p-8 text-center">
              <div>
                <Sparkles className="mx-auto mb-3 size-7 text-emerald-300" />
                <h3 className="font-mono text-lg font-black uppercase text-slate-50">
                  Portfolio preview
                </h3>
                <p className="mt-2 text-sm text-slate-400">
                  Paste resume text to preview a website.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function PortfolioPreview({
  lines,
  title,
}: {
  lines: string[];
  title: string;
}) {
  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1>{title}</h1>
      <div className="mt-8 grid gap-4">
        {lines.slice(1).map((line, index) =>
          isResumeHeading(line) ? (
            <h2 key={`${line}-${index}`}>{line}</h2>
          ) : (
            <p key={`${line}-${index}`}>{line}</p>
          )
        )}
      </div>
    </div>
  );
}

function downloadPortfolioHtml(text: string, theme: PortfolioTheme) {
  const lines = getResumeLines(text);
  const title = escapeHtml(lines[0] || "Portfolio");
  const body = lines
    .slice(1)
    .map((line) =>
      isResumeHeading(line)
        ? `<h2>${escapeHtml(line)}</h2>`
        : `<p>${escapeHtml(line)}</p>`
    )
    .join("\n");
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>${getPortfolioCss(theme)}</style>
</head>
<body>
  <main>
    <h1>${title}</h1>
    <section>${body}</section>
  </main>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "portfolio.html";
  link.click();
  URL.revokeObjectURL(url);
}

function getPortfolioCss(theme: PortfolioTheme) {
  const themesById = {
    terminal:
      "body{margin:0;background:#020617;color:#e2e8f0;font-family:ui-monospace,Menlo,monospace}main{max-width:980px;margin:0 auto;padding:72px 24px}h1{font-size:48px;text-transform:uppercase;color:#86efac}h2{margin-top:36px;border-bottom:2px solid #86efac;padding-bottom:8px}p{line-height:1.7;color:#cbd5e1}",
    studio:
      "body{margin:0;background:#f8fafc;color:#0f172a;font-family:Inter,Arial,sans-serif}main{max-width:980px;margin:0 auto;padding:72px 24px}h1{font-size:54px;letter-spacing:0;text-transform:uppercase}h2{margin-top:36px;background:#0f172a;color:#fff;padding:10px 12px}p{line-height:1.7;color:#334155}",
    operator:
      "body{margin:0;background:#111827;color:#f8fafc;font-family:Arial,sans-serif}main{max-width:980px;margin:0 auto;padding:72px 24px;border-left:14px solid #22c55e}h1{font-size:50px;color:#22c55e}h2{margin-top:36px;color:#f0abfc;text-transform:uppercase}p{line-height:1.7;color:#d1d5db}",
  } satisfies Record<PortfolioTheme, string>;

  return themesById[theme];
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
