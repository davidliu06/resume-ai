"use client";

import { useActionState, useMemo, useState } from "react";
import {
  Circle,
  Download,
  Frame,
  Globe2,
  ImagePlus,
  Loader2,
  MousePointer2,
  Sparkles,
  Square,
  Type,
} from "lucide-react";

import { optimizePortfolioFromResume } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cleanResumeText, lineToHtml } from "@/lib/resume-text";
import type { PortfolioBlock, PortfolioOptimizeState } from "@/lib/types";

const initialState: PortfolioOptimizeState = {
  ok: false,
  message: "",
  blocks: [],
};

export function PortfolioBuilder() {
  const [state, action, pending] = useActionState(
    optimizePortfolioFromResume,
    initialState
  );
  const [resumeText, setResumeText] = useState("");
  const [blocks, setBlocks] = useState<PortfolioBlock[]>(() =>
    getStarterBlocks()
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const cleaned = useMemo(() => cleanResumeText(resumeText), [resumeText]);

  function addBlock(type: PortfolioBlock["type"], shape?: "rect" | "circle") {
    const id = crypto.randomUUID();
    setBlocks((current) => [
      ...current,
      {
        id,
        type,
        text: type === "text" ? "Edit this text" : undefined,
        shape,
        x: 80,
        y: 120 + current.length * 24,
        width: type === "text" ? 300 : 160,
        height: type === "text" ? 88 : 160,
      },
    ]);
    setSelectedId(id);
  }

  function updateBlock(id: string, patch: Partial<PortfolioBlock>) {
    setBlocks((current) =>
      current.map((block) =>
        block.id === id ? { ...block, ...patch } : block
      )
    );
  }

  async function addImages(files: FileList | null) {
    if (!files?.length) {
      return;
    }

    const newBlocks = await Promise.all(
      Array.from(files).map(async (file, index) => ({
        id: crypto.randomUUID(),
        type: "image" as const,
        src: await fileToDataUrl(file),
        x: 620,
        y: 110 + index * 24,
        width: 220,
        height: 160,
      }))
    );

    setBlocks((current) => [...current, ...newBlocks]);
    setSelectedId(newBlocks[0]?.id ?? null);
  }

  return (
    <section className="grid gap-4 xl:grid-cols-[0.78fr_1.22fr]">
      <form action={action} className="pixel-panel grid content-start gap-4 p-4">
        <div className="flex items-center gap-2">
          <Globe2 className="size-5 text-sky-300" />
          <div>
            <h2 className="font-mono text-sm font-black uppercase text-slate-50">
              Resume to portfolio
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              AI chooses the strongest resume material, then you edit the site
              canvas directly.
            </p>
          </div>
        </div>

        <label className="grid gap-2 text-sm text-slate-300">
          Resume text
          <Textarea
            className="pixel-input min-h-72 resize-y"
            name="resumeText"
            onChange={(event) => setResumeText(event.target.value)}
            placeholder="Paste resume text with links..."
            value={resumeText}
          />
        </label>

        <Button
          className="pixel-button h-11"
          disabled={pending || cleaned.length < 120}
          type="submit"
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Sparkles className="size-4" />
          )}
          {pending ? "Optimizing portfolio" : "AI optimize portfolio"}
        </Button>

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

        {state.blocks.length ? (
          <Button
            className="pixel-button h-11 bg-sky-300 hover:bg-sky-200"
            onClick={() => {
              setBlocks(state.blocks);
              setSelectedId(state.blocks[0]?.id ?? null);
            }}
            type="button"
          >
            <Sparkles className="size-4" />
            Use optimized canvas
          </Button>
        ) : null}

        <div className="grid gap-2">
          <div className="font-mono text-xs font-black uppercase text-slate-400">
            Canvas tools
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              className="pixel-icon-button justify-start"
              onClick={() => addBlock("text")}
              type="button"
            >
              <Type className="size-4" />
              Text
            </Button>
            <Button
              className="pixel-icon-button justify-start"
              onClick={() => addBlock("frame", "rect")}
              type="button"
            >
              <Square className="size-4" />
              Rect frame
            </Button>
            <Button
              className="pixel-icon-button justify-start"
              onClick={() => addBlock("frame", "circle")}
              type="button"
            >
              <Circle className="size-4" />
              Circle frame
            </Button>
            <label className="pixel-icon-button inline-flex h-10 cursor-pointer items-center justify-start gap-2 px-4 text-sm">
              <ImagePlus className="size-4" />
              Image
              <input
                accept="image/*"
                className="hidden"
                multiple
                onChange={(event) => addImages(event.target.files)}
                type="file"
              />
            </label>
          </div>
        </div>

        <Button
          className="pixel-button h-11"
          onClick={() => downloadPortfolioHtml(blocks)}
          type="button"
        >
          <Download className="size-4" />
          Download site HTML
        </Button>
      </form>

      <div className="pixel-panel overflow-hidden">
        <div className="flex flex-col gap-3 border-b-2 border-slate-950 bg-slate-800 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 font-mono text-sm font-black uppercase text-slate-50">
            <MousePointer2 className="size-4 text-emerald-200" />
            Portfolio canvas
          </div>
          <div className="text-xs text-slate-400">
            Drag blocks. Edit text directly.
          </div>
        </div>

        <div className="overflow-auto bg-slate-950 p-4">
          <div className="portfolio-canvas relative h-[760px] min-w-[980px] overflow-hidden">
            {blocks.map((block) => (
              <CanvasBlock
                block={block}
                key={block.id}
                onSelect={() => setSelectedId(block.id)}
                onUpdate={(patch) => updateBlock(block.id, patch)}
                selected={selectedId === block.id}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function CanvasBlock({
  block,
  onSelect,
  onUpdate,
  selected,
}: {
  block: PortfolioBlock;
  onSelect: () => void;
  onUpdate: (patch: Partial<PortfolioBlock>) => void;
  selected: boolean;
}) {
  function startDrag(event: React.PointerEvent<HTMLDivElement>) {
    const startX = event.clientX;
    const startY = event.clientY;
    const initialX = block.x;
    const initialY = block.y;
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);
    onSelect();

    function move(moveEvent: PointerEvent) {
      onUpdate({
        x: Math.max(0, initialX + moveEvent.clientX - startX),
        y: Math.max(0, initialY + moveEvent.clientY - startY),
      });
    }

    function up() {
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", up);
    }

    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", up);
  }

  return (
    <div
      className={`absolute cursor-move border-2 ${
        selected ? "border-emerald-300" : "border-transparent"
      }`}
      onPointerDown={startDrag}
      style={{
        height: block.height,
        left: block.x,
        top: block.y,
        width: block.width,
      }}
    >
      {block.type === "text" ? (
        <textarea
          className="h-full w-full resize-none border-2 border-slate-950 bg-white/95 p-3 text-sm leading-5 text-slate-950 shadow-[4px_4px_0_#020617] outline-none"
          onChange={(event) => onUpdate({ text: event.target.value })}
          onPointerDown={(event) => event.stopPropagation()}
          value={block.text ?? ""}
        />
      ) : null}

      {block.type === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt=""
          className="h-full w-full border-2 border-slate-950 object-cover shadow-[4px_4px_0_#020617]"
          src={block.src}
        />
      ) : null}

      {block.type === "frame" ? (
        <div
          className={`grid h-full w-full place-items-center border-2 border-dashed border-emerald-300 bg-emerald-300/10 text-center font-mono text-xs font-black uppercase text-emerald-100 shadow-[4px_4px_0_#020617] ${
            block.shape === "circle" ? "rounded-full" : ""
          }`}
        >
          <Frame className="mb-2 size-6" />
          Photo frame
        </div>
      ) : null}
    </div>
  );
}

function getStarterBlocks(): PortfolioBlock[] {
  return [
    {
      id: crypto.randomUUID(),
      type: "text",
      text: "Your Name\nEngineering portfolio\nSelected projects, technical systems, and contact links.",
      x: 48,
      y: 52,
      width: 460,
      height: 140,
    },
    {
      id: crypto.randomUUID(),
      type: "frame",
      shape: "circle",
      x: 760,
      y: 56,
      width: 140,
      height: 140,
    },
    {
      id: crypto.randomUUID(),
      type: "text",
      text: "Featured Project\nDescribe the problem, technical approach, tools, and result.",
      x: 70,
      y: 260,
      width: 380,
      height: 130,
    },
  ];
}

function downloadPortfolioHtml(blocks: PortfolioBlock[]) {
  const blockHtml = blocks.map(blockToHtml).join("\n");
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Portfolio</title>
  <style>${portfolioExportCss}</style>
</head>
<body>
  <main class="site-canvas">${blockHtml}</main>
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

function blockToHtml(block: PortfolioBlock) {
  const style = `left:${block.x}px;top:${block.y}px;width:${block.width}px;height:${block.height}px;`;

  if (block.type === "text") {
    return `<section class="text-block" style="${style}">${lineToHtml(
      block.text ?? ""
    ).replaceAll("\n", "<br />")}</section>`;
  }

  if (block.type === "image" && block.src) {
    return `<img class="image-block" style="${style}" src="${block.src}" alt="" />`;
  }

  return `<div class="frame-block ${
    block.shape === "circle" ? "circle" : ""
  }" style="${style}"></div>`;
}

const portfolioExportCss =
  "body{margin:0;background:#020617;color:#e2e8f0;font-family:Inter,Arial,sans-serif}.site-canvas{position:relative;width:980px;height:760px;margin:0 auto;background:linear-gradient(135deg,#0f172a,#111827);overflow:hidden}.site-canvas:before{content:'';position:absolute;inset:0;background-image:linear-gradient(to right,rgba(255,255,255,.05) 1px,transparent 1px),linear-gradient(to bottom,rgba(255,255,255,.05) 1px,transparent 1px);background-size:48px 48px}.text-block,.image-block,.frame-block{position:absolute;box-sizing:border-box}.text-block{background:rgba(248,250,252,.96);color:#0f172a;border:3px solid #020617;box-shadow:8px 8px 0 #22c55e;padding:16px;line-height:1.45;font-size:16px;white-space:pre-wrap}.text-block a{color:#0369a1}.image-block{object-fit:cover;border:3px solid #020617;box-shadow:8px 8px 0 #22c55e}.frame-block{border:3px dashed #86efac;background:rgba(34,197,94,.12)}.frame-block.circle{border-radius:999px}";

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}
