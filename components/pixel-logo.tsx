import { cn } from "@/lib/utils";

const pixels = [
  "00111100",
  "01111110",
  "11011011",
  "11111111",
  "10111101",
  "00100100",
  "01000010",
  "10000001",
];

export function PixelLogo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        aria-hidden="true"
        className="grid size-10 grid-cols-8 grid-rows-8 gap-px rounded-[4px] border-2 border-slate-950 bg-slate-950 p-1 shadow-[4px_4px_0_#020617]"
      >
        {pixels.flatMap((row, rowIndex) =>
          row.split("").map((pixel, columnIndex) => (
            <span
              className={cn(
                "block",
                pixel === "1"
                  ? rowIndex < 2
                    ? "bg-emerald-300"
                    : columnIndex % 3 === 0
                      ? "bg-sky-300"
                      : "bg-fuchsia-300"
                  : "bg-transparent"
              )}
              key={`${rowIndex}-${columnIndex}`}
            />
          ))
        )}
      </div>
      <div className="leading-none">
        <div className="font-mono text-base font-black uppercase tracking-normal text-slate-50">
          spec.ai
        </div>
        <div className="mt-1 font-mono text-[10px] uppercase tracking-normal text-emerald-200">
          resume arcade
        </div>
      </div>
    </div>
  );
}
