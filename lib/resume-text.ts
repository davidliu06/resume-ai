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
