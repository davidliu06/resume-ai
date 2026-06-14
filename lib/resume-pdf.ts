"use client";

import { jsPDF } from "jspdf";

import {
  getResumeLines,
  isBulletLine,
  isResumeHeading,
  stripBullet,
} from "@/lib/resume-text";

export const resumeStyles = [
  {
    id: "classic",
    label: "Classic Resume",
    source: "Classic-Resume-12851.docx",
    description: "Centered header with traditional section rules.",
  },
  {
    id: "easy",
    label: "Easy Resume",
    source: "Easy-Resume-13122.docx",
    description: "Simple spacing with a readable serif feel.",
  },
  {
    id: "traditional",
    label: "Traditional Simple",
    source: "Traditional-Simple-Resume-17613.docx",
    description: "Conservative single-column resume format.",
  },
  {
    id: "general",
    label: "General Resume",
    source: "General-Resume-23100.docx",
    description: "Balanced density with a crisp accent line.",
  },
  {
    id: "business",
    label: "Business Resume",
    source: "Business-Resume-12524.docx",
    description: "Professional left rail and compact content.",
  },
  {
    id: "editable",
    label: "Editable Professional",
    source: "Editable-Professional-Resume-18665.docx",
    description: "Modern section bars and clean spacing.",
  },
  {
    id: "combination",
    label: "Combination Resume",
    source: "Combination-Resume-20228.docx",
    description: "Skills-forward green accent styling.",
  },
  {
    id: "two-page",
    label: "Two Page Resume",
    source: "Two-Page-Resume-19210.docx",
    description: "Roomier spacing for longer resumes.",
  },
] as const;

export type ResumeStyleId = (typeof resumeStyles)[number]["id"];

type Template = {
  accent: [number, number, number];
  bodyFont: "helvetica" | "times";
  marginLeft: number;
  marginRight: number;
  marginTop: number;
  headingBar?: boolean;
  leftRail?: boolean;
  centeredHeader?: boolean;
  roomy?: boolean;
  topRule?: boolean;
};

const templates: Record<ResumeStyleId, Template> = {
  classic: {
    accent: [79, 129, 189],
    bodyFont: "helvetica",
    marginLeft: 22,
    marginRight: 22,
    marginTop: 30,
    centeredHeader: true,
  },
  easy: {
    accent: [120, 142, 137],
    bodyFont: "helvetica",
    marginLeft: 28,
    marginRight: 42,
    marginTop: 38,
    roomy: true,
  },
  traditional: {
    accent: [17, 24, 39],
    bodyFont: "helvetica",
    marginLeft: 28,
    marginRight: 28,
    marginTop: 38,
    topRule: true,
  },
  general: {
    accent: [15, 23, 42],
    bodyFont: "times",
    marginLeft: 36,
    marginRight: 36,
    marginTop: 42,
  },
  business: {
    accent: [192, 192, 192],
    bodyFont: "helvetica",
    marginLeft: 58,
    marginRight: 36,
    marginTop: 32,
    leftRail: true,
  },
  editable: {
    accent: [61, 61, 61],
    bodyFont: "helvetica",
    marginLeft: 32,
    marginRight: 32,
    marginTop: 36,
    headingBar: true,
  },
  combination: {
    accent: [22, 46, 102],
    bodyFont: "helvetica",
    marginLeft: 30,
    marginRight: 30,
    marginTop: 34,
  },
  "two-page": {
    accent: [202, 225, 232],
    bodyFont: "times",
    marginLeft: 30,
    marginRight: 30,
    marginTop: 38,
    roomy: true,
  },
};

export function downloadResumePdf({
  text,
  styleId,
}: {
  text: string;
  styleId: ResumeStyleId;
}) {
  const lines = getResumeLines(text);
  const template = templates[styleId];
  const doc = new jsPDF({ format: "letter", unit: "pt" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const usableWidth = pageWidth - template.marginLeft - template.marginRight;
  let y = template.marginTop;

  const ensureSpace = (height: number) => {
    if (y + height <= pageHeight - 42) {
      return;
    }

    doc.addPage();
    y = template.marginTop;
    drawPageChrome(doc, template, pageWidth);
  };

  drawPageChrome(doc, template, pageWidth);

  lines.forEach((line, index) => {
    const heading = index > 0 && isResumeHeading(line);
    const firstLine = index === 0;
    const bullet = isBulletLine(line);

    if (firstLine) {
      doc.setFont(template.bodyFont, "bold");
      doc.setFontSize(18);
      doc.setTextColor(...template.accent);
      const nameLines = doc.splitTextToSize(line, usableWidth);
      ensureSpace(nameLines.length * 20 + 8);
      nameLines.forEach((nameLine: string) => {
        const x = template.centeredHeader
          ? pageWidth / 2
          : template.marginLeft;
        doc.text(nameLine, x, y, {
          align: template.centeredHeader ? "center" : "left",
        });
        y += 20;
      });
      y += 4;
      return;
    }

    if (heading) {
      const headingHeight = template.headingBar ? 22 : 18;
      ensureSpace(headingHeight + 8);
      y += template.roomy ? 8 : 5;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      const headingTextColor =
        styleId === "two-page" || styleId === "business"
          ? ([15, 23, 42] as [number, number, number])
          : template.accent;
      doc.setTextColor(
        template.headingBar ? 255 : headingTextColor[0],
        template.headingBar ? 255 : headingTextColor[1],
        template.headingBar ? 255 : headingTextColor[2]
      );

      if (template.headingBar) {
        doc.setFillColor(...template.accent);
        doc.rect(template.marginLeft, y - 12, usableWidth, 18, "F");
        doc.text(line.toUpperCase(), template.marginLeft + 8, y);
      } else {
        doc.text(line.toUpperCase(), template.marginLeft, y);
        doc.setDrawColor(...template.accent);
        doc.setLineWidth(styleId === "general" ? 2 : 0.75);
        doc.line(template.marginLeft, y + 4, pageWidth - template.marginRight, y + 4);
      }
      y += headingHeight;
      return;
    }

    doc.setFont(template.bodyFont, bullet ? "normal" : "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    const x = template.marginLeft + (bullet ? 13 : 0);
    const lineWidth = usableWidth - (bullet ? 13 : 0);
    const wrapped = doc.splitTextToSize(bullet ? stripBullet(line) : line, lineWidth);
    const lineHeight = template.roomy ? 13.5 : 12;
    ensureSpace(wrapped.length * lineHeight + 4);

    wrapped.forEach((part: string, partIndex: number) => {
      if (bullet && partIndex === 0) {
        doc.setFont("helvetica", "bold");
        doc.text("-", template.marginLeft, y);
        doc.setFont(template.bodyFont, "normal");
      }
      doc.text(part, x, y);
      y += lineHeight;
    });
    y += template.roomy ? 3 : 1;
  });

  const style = resumeStyles.find((item) => item.id === styleId);
  doc.save(`${style?.label ?? "resume"}.pdf`);
}

function drawPageChrome(
  doc: jsPDF,
  template: Template,
  pageWidth: number
) {
  if (template.leftRail) {
    doc.setFillColor(...template.accent);
    doc.rect(0, 0, 38, 792, "F");
  }

  if (template.topRule) {
    doc.setFillColor(...template.accent);
    doc.rect(0, 0, pageWidth, 12, "F");
  }
}
