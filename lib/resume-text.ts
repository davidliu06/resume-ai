import type { ResumeLink } from "@/lib/types";

export function cleanResumeText(input: string) {
  return input
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\*\*/g, "")
    .replace(/__/g, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "- ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function getResumeLines(input: string) {
  return cleanResumeText(input)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

const sectionWords = [
  "education",
  "experience",
  "work experience",
  "professional experience",
  "projects",
  "skills",
  "technical skills",
  "certifications",
  "awards",
  "activities",
  "leadership",
  "publications",
  "summary",
  "objective",
];

export function isResumeHeading(line: string) {
  const normalized = line
    .toLowerCase()
    .replace(/[^a-z/&\s-]/g, "")
    .trim();

  if (sectionWords.includes(normalized)) {
    return true;
  }

  return (
    line.length <= 42 &&
    /[A-Za-z]/.test(line) &&
    line === line.toUpperCase() &&
    !line.includes("@")
  );
}

export function isBulletLine(line: string) {
  return /^[-*]\s+/.test(line);
}

export function stripBullet(line: string) {
  return line.replace(/^[-*]\s+/, "").trim();
}

const markdownLinkPattern = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;
const urlPattern = /https?:\/\/[^\s)]+/g;

export function extractLinksFromText(text: string): ResumeLink[] {
  const links = new Map<string, ResumeLink>();
  let match: RegExpExecArray | null;

  while ((match = markdownLinkPattern.exec(text))) {
    links.set(match[2], {
      text: match[1],
      url: match[2],
    });
  }

  while ((match = urlPattern.exec(text))) {
    const cleanUrl = match[0].replace(/[.,;:!?]+$/, "");
    if (!links.has(cleanUrl)) {
      links.set(cleanUrl, {
        text: cleanUrl,
        url: cleanUrl,
      });
    }
  }

  return Array.from(links.values());
}

export function mergeResumeLinks(...groups: ResumeLink[][]) {
  const links = new Map<string, ResumeLink>();

  groups.flat().forEach((link) => {
    if (link.url.startsWith("http")) {
      links.set(link.url, link);
    }
  });

  return Array.from(links.values());
}

export function lineToDisplayText(line: string) {
  return line.replace(markdownLinkPattern, "$1");
}

export function lineToHtml(line: string) {
  const markdownLinks: string[] = [];
  const withoutMarkdown = line.replace(markdownLinkPattern, (_match, label, url) => {
    const token = `@@LINK_${markdownLinks.length}@@`;
    markdownLinks.push(
      `<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(
        label
      )}</a>`
    );
    return token;
  });

  let html = escapeHtml(withoutMarkdown)
    .replace(
      /(https?:\/\/[^\s<]+)/g,
      '<a href="$1" target="_blank" rel="noreferrer">$1</a>'
    );

  markdownLinks.forEach((link, index) => {
    html = html.replace(`@@LINK_${index}@@`, link);
  });

  return html;
}

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
