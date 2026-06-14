"use client";

import { useActionState, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import {
  Circle,
  Download,
  Frame,
  Globe2,
  ImagePlus,
  Loader2,
  Minus,
  MousePointer2,
  Plus,
  Sparkles,
  Square,
  Trash2,
  Type,
} from "lucide-react";

import { optimizePortfolioFromResume } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cleanResumeText } from "@/lib/resume-text";
import type { PortfolioBlock, PortfolioOptimizeState } from "@/lib/types";

const PORTFOLIO_CANVAS_WIDTH = 794;
const PORTFOLIO_CANVAS_HEIGHT = 1123;

const initialState: PortfolioOptimizeState = {
  ok: false,
  message: "",
  blocks: [],
};

const backgrounds = [
  {
    id: "blueprint",
    label: "Blueprint",
    description: "Engineering blueprint blue with cyan rules.",
  },
  {
    id: "whiteboard",
    label: "Whiteboard",
    description: "Clean white slide with black editorial framing.",
  },
  {
    id: "launch",
    label: "Launch Pad",
    description: "Deep slate with amber highlight blocks.",
  },
] as const;

type DeckBackground = (typeof backgrounds)[number]["id"];

export function PortfolioBuilder() {
  const [hasResumeFile, setHasResumeFile] = useState(false);
  const [resumeText, setResumeText] = useState("");
  const [blocks, setBlocks] = useState<PortfolioBlock[]>(() =>
    getStarterBlocks()
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [background, setBackground] = useState<DeckBackground>("whiteboard");
  const [state, action, pending] = useActionState(
    async (previousState: PortfolioOptimizeState, formData: FormData) => {
      const nextState = await optimizePortfolioFromResume(
        previousState,
        formData
      );

      if (nextState.ok && nextState.blocks.length) {
        setBlocks(nextState.blocks);
        setSelectedId(nextState.blocks[0]?.id ?? null);
      }

      return nextState;
    },
    initialState
  );
  const cleaned = useMemo(() => cleanResumeText(resumeText), [resumeText]);
  const hasPortfolioInput = hasResumeFile || cleaned.length >= 120;
  const selectedBlock = blocks.find((block) => block.id === selectedId) ?? null;

  function addBlock(type: PortfolioBlock["type"], shape?: "rect" | "circle") {
    const id = crypto.randomUUID();
    setBlocks((current) => [
      ...current,
      {
        id,
        type,
        text: type === "text" ? "Edit this text" : undefined,
        shape,
        fontSize: type === "text" ? 13 : undefined,
        x: 72,
        y: Math.min(920, 120 + current.length * 28),
        width: type === "text" ? 280 : 160,
        height: type === "text" ? 96 : 160,
        zIndex: type === "text" ? 30 : type === "image" ? 20 : 10,
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
        zIndex: 20,
        x: 450,
        y: 390 + index * 28,
        width: 250,
        height: 180,
      }))
    );

    setBlocks((current) => [...current, ...newBlocks]);
    setSelectedId(newBlocks[0]?.id ?? null);
  }

  function deleteSelectedBlock() {
    if (!selectedId) {
      return;
    }

    setBlocks((current) => current.filter((block) => block.id !== selectedId));
    setSelectedId(null);
  }

  function resizeSelectedBlock(delta: number) {
    if (!selectedBlock) {
      return;
    }

    updateBlock(selectedBlock.id, {
      height: Math.max(40, selectedBlock.height + delta),
      width: Math.max(60, selectedBlock.width + delta),
    });
  }

  function adjustSelectedFont(delta: number) {
    if (!selectedBlock || selectedBlock.type !== "text") {
      return;
    }

    updateBlock(selectedBlock.id, {
      fontSize: Math.min(
        42,
        Math.max(8, (selectedBlock.fontSize ?? 18) + delta)
      ),
    });
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
              Upload a resume PDF or paste resume text. AI extracts the
              strongest material and lays out an editable A4 portfolio page.
            </p>
          </div>
        </div>

        <label className="grid gap-2 text-sm text-slate-300">
          Resume PDF
          <div className="pixel-input flex min-h-20 items-center gap-3 p-3">
            <ImagePlus className="size-5 text-emerald-200" />
            <input
              accept="application/pdf,.pdf"
              className="w-full text-sm file:mr-3 file:border-2 file:border-slate-950 file:bg-emerald-300 file:px-3 file:py-2 file:font-mono file:text-xs file:font-black file:uppercase file:text-slate-950"
              name="resumeFile"
              onChange={(event) =>
                setHasResumeFile(Boolean(event.target.files?.length))
              }
              type="file"
            />
          </div>
        </label>

        <label className="grid gap-2 text-sm text-slate-300">
          Or paste resume text
          <Textarea
            className="pixel-input min-h-56 resize-y"
            name="resumeText"
            onChange={(event) => setResumeText(event.target.value)}
            placeholder="Paste resume text with projects, links, and contact info..."
            value={resumeText}
          />
        </label>

        <Button
          className="pixel-button h-11"
          disabled={pending || !hasPortfolioInput}
          type="submit"
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Sparkles className="size-4" />
          )}
          {pending ? "Optimizing deck" : "AI optimize deck"}
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

        <div className="grid gap-2">
          <div className="font-mono text-xs font-black uppercase text-slate-400">
            Slide background
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {backgrounds.map((item) => (
              <button
                className={`border-2 border-slate-950 p-3 text-left shadow-[3px_3px_0_#020617] ${
                  background === item.id
                    ? "bg-emerald-300 text-slate-950"
                    : "bg-slate-900 text-slate-200"
                }`}
                key={item.id}
                onClick={() => setBackground(item.id)}
                type="button"
              >
                <span className="block font-mono text-xs font-black uppercase">
                  {item.label}
                </span>
                <span className="mt-1 block text-xs opacity-70">
                  {item.description}
                </span>
              </button>
            ))}
          </div>
        </div>

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

        {selectedBlock ? (
          <div className="grid gap-2 border-2 border-slate-950 bg-slate-950/70 p-3 shadow-[3px_3px_0_#020617]">
            <div className="font-mono text-xs font-black uppercase text-slate-300">
              Selected block
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                className="pixel-icon-button justify-start"
                onClick={() => resizeSelectedBlock(-16)}
                type="button"
              >
                <Minus className="size-4" />
                Size
              </Button>
              <Button
                className="pixel-icon-button justify-start"
                onClick={() => resizeSelectedBlock(16)}
                type="button"
              >
                <Plus className="size-4" />
                Size
              </Button>
              <Button
                className="pixel-icon-button justify-start"
                disabled={selectedBlock.type !== "text"}
                onClick={() => adjustSelectedFont(-1)}
                type="button"
              >
                <Minus className="size-4" />
                Font
              </Button>
              <Button
                className="pixel-icon-button justify-start"
                disabled={selectedBlock.type !== "text"}
                onClick={() => adjustSelectedFont(1)}
                type="button"
              >
                <Plus className="size-4" />
                Font
              </Button>
            </div>
            <Button
              className="pixel-icon-button justify-start bg-red-300 text-slate-950 hover:bg-red-200"
              onClick={deleteSelectedBlock}
              type="button"
            >
              <Trash2 className="size-4" />
              Delete block
            </Button>
          </div>
        ) : null}

        <Button
          className="pixel-button h-11"
          onClick={() => downloadPortfolioPdf(blocks, background)}
          type="button"
        >
          <Download className="size-4" />
          Download PDF deck
        </Button>
      </form>

      <div className="pixel-panel overflow-hidden">
        <div className="flex flex-col gap-3 border-b-2 border-slate-950 bg-slate-800 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 font-mono text-sm font-black uppercase text-slate-50">
            <MousePointer2 className="size-4 text-emerald-200" />
            Portfolio deck
          </div>
          <div className="text-xs text-slate-400">
            Drag blocks. Edit text directly.
          </div>
        </div>

        <div className="overflow-auto bg-slate-950 p-4">
          <div
            className={`portfolio-canvas portfolio-canvas-${background} relative mx-auto overflow-hidden`}
            style={{
              height: PORTFOLIO_CANVAS_HEIGHT,
              minWidth: PORTFOLIO_CANVAS_WIDTH,
              width: PORTFOLIO_CANVAS_WIDTH,
            }}
          >
            {blocks
              .slice()
              .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))
              .map((block) => (
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
        zIndex: block.zIndex ?? 0,
      }}
    >
      {block.type === "text" ? (
        <textarea
          className="h-full w-full resize-none border-2 border-slate-950 bg-white/95 p-3 text-sm leading-5 text-slate-950 shadow-[4px_4px_0_#020617] outline-none"
          onChange={(event) => onUpdate({ text: event.target.value })}
          onPointerDown={(event) => event.stopPropagation()}
          style={{ fontSize: block.fontSize ?? 18 }}
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
      text: "YOUR NAME\nEngineering Portfolio\nMechanical / Software / Systems",
      x: 54,
      y: 56,
      width: 480,
      height: 130,
      fontSize: 32,
      zIndex: 30,
    },
    {
      id: crypto.randomUUID(),
      type: "frame",
      shape: "circle",
      x: 604,
      y: 54,
      width: 132,
      height: 132,
      zIndex: 10,
    },
    {
      id: crypto.randomUUID(),
      type: "text",
      text: "Profile photo",
      x: 628,
      y: 104,
      width: 86,
      height: 36,
      fontSize: 12,
      zIndex: 30,
    },
    {
      id: crypto.randomUUID(),
      type: "text",
      text: "ABOUT ME\n2-3 lines on engineering focus, build style, and the kinds of problems you like solving.",
      x: 56,
      y: 230,
      width: 316,
      height: 150,
      fontSize: 13,
      zIndex: 30,
    },
    {
      id: crypto.randomUUID(),
      type: "text",
      text: "SKILLS\nCAD  /  Python  /  MATLAB  /  FEA\nControls  /  Fabrication  /  Testing",
      x: 420,
      y: 230,
      width: 316,
      height: 150,
      fontSize: 12,
      zIndex: 30,
    },
    {
      id: crypto.randomUUID(),
      type: "frame",
      shape: "rect",
      x: 58,
      y: 430,
      width: 280,
      height: 210,
      zIndex: 10,
    },
    {
      id: crypto.randomUUID(),
      type: "text",
      text: "PROJECT IMAGE / CAD",
      x: 104,
      y: 518,
      width: 190,
      height: 38,
      fontSize: 12,
      zIndex: 30,
    },
    {
      id: crypto.randomUUID(),
      type: "text",
      text: "FEATURED PROJECT\nProject name\nShort problem statement, technical approach, tools used, and strongest outcome.",
      x: 374,
      y: 430,
      width: 360,
      height: 210,
      fontSize: 14,
      zIndex: 30,
    },
    {
      id: crypto.randomUUID(),
      type: "frame",
      shape: "rect",
      x: 56,
      y: 694,
      width: 680,
      height: 156,
      zIndex: 10,
    },
    {
      id: crypto.randomUUID(),
      type: "text",
      text: "EXPERIENCE TIMELINE\nRole / Company / Date\nConcise scope and impact line.",
      x: 84,
      y: 724,
      width: 620,
      height: 96,
      fontSize: 13,
      zIndex: 30,
    },
    {
      id: crypto.randomUUID(),
      type: "text",
      text: "CONTACT\nemail@example.com | github.com/name | linkedin.com/in/name",
      x: 56,
      y: 980,
      width: 680,
      height: 78,
      fontSize: 12,
      zIndex: 30,
    },
  ];
}

function downloadPortfolioPdf(
  blocks: PortfolioBlock[],
  background: DeckBackground
) {
  const doc = new jsPDF({ format: "a4", orientation: "portrait", unit: "pt" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const scaleX = pageWidth / PORTFOLIO_CANVAS_WIDTH;
  const scaleY = pageHeight / PORTFOLIO_CANVAS_HEIGHT;

  drawDeckBackground(doc, background, pageWidth, pageHeight);

  blocks
    .slice()
    .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))
    .forEach((block) => {
      const x = block.x * scaleX;
      const y = block.y * scaleY;
      const width = block.width * scaleX;
      const height = block.height * scaleY;

      if (block.type === "text") {
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(2, 6, 23);
        doc.setLineWidth(1.5);
        doc.rect(x, y, width, height, "FD");
        doc.setFont("helvetica", "normal");
        doc.setFontSize((block.fontSize ?? 13) * 0.72);
        doc.setTextColor(15, 23, 42);
        const lines = doc.splitTextToSize(block.text ?? "", width - 20);
        doc.text(lines, x + 10, y + 18);
        return;
      }

      if (block.type === "image" && block.src) {
        doc.addImage(
          block.src,
          getImageFormat(block.src),
          x,
          y,
          width,
          height,
          undefined,
          "FAST"
        );
        doc.setDrawColor(2, 6, 23);
        doc.rect(x, y, width, height);
        return;
      }

      doc.setDrawColor(134, 239, 172);
      doc.setFillColor(34, 197, 94);
      doc.setLineDashPattern([5, 4], 0);
      if (block.shape === "circle") {
        doc.circle(
          x + width / 2,
          y + height / 2,
          Math.min(width, height) / 2,
          "S"
        );
      } else {
        doc.rect(x, y, width, height, "S");
      }
      doc.setLineDashPattern([], 0);
    });

  doc.save("portfolio-deck.pdf");
}

function getImageFormat(src: string) {
  if (src.startsWith("data:image/jpeg") || src.startsWith("data:image/jpg")) {
    return "JPEG";
  }

  if (src.startsWith("data:image/webp")) {
    return "WEBP";
  }

  return "PNG";
}

function drawDeckBackground(
  doc: jsPDF,
  background: DeckBackground,
  width: number,
  height: number
) {
  if (background === "blueprint") {
    doc.setFillColor(8, 47, 73);
    doc.rect(0, 0, width, height, "F");
    doc.setDrawColor(125, 211, 252);
    for (let x = 0; x < width; x += 36) doc.line(x, 0, x, height);
    for (let y = 0; y < height; y += 36) doc.line(0, y, width, y);
    return;
  }

  if (background === "whiteboard") {
    doc.setFillColor(248, 250, 252);
    doc.rect(0, 0, width, height, "F");
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(4);
    doc.rect(18, 18, width - 36, height - 36);
    return;
  }

  if (background === "launch") {
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, width, height, "F");
    doc.setFillColor(251, 191, 36);
    doc.rect(0, 0, width, 18, "F");
    doc.rect(0, height - 18, width, 18, "F");
    return;
  }

  doc.setFillColor(248, 250, 252);
  doc.rect(0, 0, width, height, "F");
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(4);
  doc.rect(18, 18, width - 36, height - 36);
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}
