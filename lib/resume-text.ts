import type { ResumeLink } from "@/lib/types";

export function cleanResumeText(input: string) {
  const normalized = input
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\*\*/g, "")
    .replace(/__/g, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "- ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return dedupeResumeContact(normalized);
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

export type ResumeLineRole =
  | "name"
  | "contact"
  | "section"
  | "company"
  | "position"
  | "date"
  | "skillGroup"
  | "bullet"
  | "body";

export function getResumeLineRole(line: string, index: number): ResumeLineRole {
  const display = lineToDisplayText(line).trim();

  if (index === 0) {
    return "name";
  }

  if (
    display.includes("@") ||
    /https?:\/\//.test(display) ||
    /\bgithub\b|\blinkedin\b|\bportfolio\b/i.test(display)
  ) {
    return "contact";
  }

  if (isResumeHeading(display)) {
    return "section";
  }

  if (isBulletLine(display)) {
    return "bullet";
  }

  if (/^\d{4}\s*[-\u2013]\s*(\d{4}|present|current)$/i.test(display)) {
    return "date";
  }

  if (
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{4}\b/i.test(
      display
    ) ||
    /\b\d{4}\b\s*[-\u2013]\s*\b(\d{4}|present|current)\b/i.test(display)
  ) {
    return "date";
  }

  if (/^[A-Za-z][A-Za-z /&+#.-]{2,24}:/.test(display)) {
    return "skillGroup";
  }

  if (
    /\b(engineer|developer|designer|analyst|researcher|intern|assistant|lead|manager|founder|president|captain|tutor)\b/i.test(
      display
    )
  ) {
    return "position";
  }

  if (
    display.length <= 64 &&
    !/[.!?]$/.test(display) &&
    /\b(inc|llc|corp|university|college|school|club|lab|systems|technologies|aerospace|space|team|company)\b/i.test(
      display
    )
  ) {
    return "company";
  }

  return "body";
}

function dedupeResumeContact(text: string) {
  const seenContact = new Set<string>();

  return text
    .split("\n")
    .map((line) => dedupeContactTokens(line.trim()))
    .filter((line) => {
      if (!isContactHeavy(line)) {
        return true;
      }

      const key = line.toLowerCase().replace(/\s+/g, " ");

      if (seenContact.has(key)) {
        return false;
      }

      seenContact.add(key);
      return true;
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function dedupeContactTokens(line: string) {
  const tokens = line.split(/(\s*[|\u2022,]\s*|\s{2,})/).filter(Boolean);
  const seen = new Set<string>();

  return tokens
    .filter((token) => {
      const normalized = token.toLowerCase().trim();

      if (!normalized || /^[|\u2022,]+$/.test(normalized)) {
        return true;
      }

      const isContact =
        normalized.includes("@") ||
        /https?:\/\//.test(normalized) ||
        /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(normalized);

      if (!isContact) {
        return true;
      }

      if (seen.has(normalized)) {
        return false;
      }

      seen.add(normalized);
      return true;
    })
    .join("")
    .replace(/\s*([|\u2022,])\s*([|\u2022,])\s*/g, "$1 ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function isContactHeavy(line: string) {
  return (
    line.includes("@") ||
    /https?:\/\//.test(line) ||
    /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(line)
  );
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
