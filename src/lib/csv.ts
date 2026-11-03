import { CSVProjectRow, EnrichedSubmission, LensResult, RankReport } from "./types";

/**
 * Normalizes a GitHub URL or repo string into `gh/<owner>/<repo>`
 * and extracts `<owner>/<repo>` and full GitHub URL.
 */
export function normalizeRepoIdentifier(input: string): {
  submissionId: string;
  ownerRepo: string;
  repoUrl: string;
  defaultProjectName: string;
} {
  const clean = input.trim().replace(/\/+$/, "").replace(/\.git$/i, "");
  if (!clean) {
    return {
      submissionId: "",
      ownerRepo: "",
      repoUrl: "",
      defaultProjectName: "Untitled Project",
    };
  }

  if (clean.toLowerCase().startsWith("gh/")) {
    const parts = clean.slice(3).split("/").filter(Boolean);
    if (parts.length >= 2) {
      const owner = parts[parts.length - 2];
      const repo = parts[parts.length - 1];
      return {
        submissionId: `gh/${owner}/${repo}`,
        ownerRepo: `${owner}/${repo}`,
        repoUrl: `https://github.com/${owner}/${repo}`,
        defaultProjectName: formatRepoAsTitle(repo),
      };
    }
  }

  let pathPart = clean;
  const protoIdx = pathPart.indexOf("://");
  if (protoIdx >= 0) {
    const rest = pathPart.slice(protoIdx + 3);
    const slashIdx = rest.indexOf("/");
    pathPart = slashIdx >= 0 ? rest.slice(slashIdx + 1) : rest;
  } else if (pathPart.includes(":")) {
    pathPart = pathPart.slice(pathPart.lastIndexOf(":") + 1);
  } else if (pathPart.toLowerCase().startsWith("github.com/")) {
    pathPart = pathPart.slice("github.com/".length);
  }

  const parts = pathPart.split("/").filter(Boolean);
  if (parts.length >= 2) {
    const owner = parts[0];
    const repo = parts[1];
    return {
      submissionId: `gh/${owner}/${repo}`,
      ownerRepo: `${owner}/${repo}`,
      repoUrl: `https://github.com/${owner}/${repo}`,
      defaultProjectName: formatRepoAsTitle(repo),
    };
  }

  return {
    submissionId: `gh/unknown/${clean}`,
    ownerRepo: clean,
    repoUrl: clean.startsWith("http") ? clean : `https://github.com/${clean}`,
    defaultProjectName: formatRepoAsTitle(clean),
  };
}

export function formatRepoAsTitle(slug: string): string {
  return slug
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

export function parseRawCSV(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        currentRow.push(currentField.trim());
        currentField = "";
      } else if (char === "\r" && nextChar === "\n") {
        currentRow.push(currentField.trim());
        if (currentRow.some((cell) => cell !== "")) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = "";
        i++;
      } else if (char === "\n" || char === "\r") {
        currentRow.push(currentField.trim());
        if (currentRow.some((cell) => cell !== "")) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = "";
      } else {
        currentField += char;
      }
    }
  }

  if (currentField !== "" || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((cell) => cell !== "")) {
      rows.push(currentRow);
    }
  }

  return rows;
}

const URL_HEADER_PATTERNS = [
  /repo/i,
  /github/i,
  /git_url/i,
  /source/i,
  /submission_url/i,
  /code_url/i,
  /^url$/i,
  /link/i,
];

const PROJECT_NAME_PATTERNS = [
  /^project[\s_-]*name$/i,
  /^project[\s_-]*title$/i,
  /^project$/i,
  /^title$/i,
  /^submission[\s_-]*name$/i,
  /^name$/i,
];

const TEAM_NAME_PATTERNS = [
  /^team[\s_-]*name$/i,
  /^team$/i,
  /^group$/i,
  /^organization$/i,
];

const TRACK_PATTERNS = [
  /^track$/i,
  /^category$/i,
  /^prize[\s_-]*track$/i,
  /^challenge$/i,
  /^vertical$/i,
];

const MEMBERS_PATTERNS = [
  /member/i,
  /participant/i,
  /author/i,
  /builder/i,
  /hacker/i,
  /creator/i,
];

const DESCRIPTION_PATTERNS = [
  /desc/i,
  /summary/i,
  /pitch/i,
  /tagline/i,
  /about/i,
  /overview/i,
];

const DEMO_URL_PATTERNS = [/demo/i, /video/i, /live[\s_-]*url/i, /website/i];

function findColumnIndex(headers: string[], patterns: RegExp[]): number {
  for (const pattern of patterns) {
    const idx = headers.findIndex((h) => pattern.test(h.trim()));
    if (idx !== -1) return idx;
  }
  return -1;
}

export function parseProjectsCSV(csvText: string): {
  projects: CSVProjectRow[];
  headers: string[];
  detectedMapping: Record<string, string>;
} {
  const rows = parseRawCSV(csvText);
  if (rows.length === 0) {
    return { projects: [], headers: [], detectedMapping: {} };
  }

  const firstRowHasGithubUrl = rows[0].some((cell) =>
    /github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+/i.test(cell)
  );

  let headers: string[];
  let dataRows: string[][];

  if (firstRowHasGithubUrl) {
    headers = rows[0].map((_, idx) => (idx === 0 ? "repo_url" : `column_${idx + 1}`));
    dataRows = rows;
  } else {
    headers = rows[0];
    dataRows = rows.slice(1);
  }

  let urlCol = findColumnIndex(headers, URL_HEADER_PATTERNS);
  if (urlCol === -1 && dataRows.length > 0) {
    for (let col = 0; col < headers.length; col++) {
      if (
        dataRows.some((r) =>
          /github\.com\/|^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test((r[col] || "").trim())
        )
      ) {
        urlCol = col;
        break;
      }
    }
  }
  if (urlCol === -1) urlCol = 0;

  const projectCol = findColumnIndex(headers, PROJECT_NAME_PATTERNS);
  const teamCol = findColumnIndex(headers, TEAM_NAME_PATTERNS);
  const trackCol = findColumnIndex(headers, TRACK_PATTERNS);
  const membersCol = findColumnIndex(headers, MEMBERS_PATTERNS);
  const descCol = findColumnIndex(headers, DESCRIPTION_PATTERNS);
  const demoCol = findColumnIndex(headers, DEMO_URL_PATTERNS);

  const detectedMapping: Record<string, string> = {
    repoUrl: headers[urlCol] || "Column 1",
  };
  if (projectCol !== -1) detectedMapping.projectName = headers[projectCol];
  if (teamCol !== -1) detectedMapping.teamName = headers[teamCol];
  if (trackCol !== -1) detectedMapping.track = headers[trackCol];
  if (membersCol !== -1) detectedMapping.members = headers[membersCol];
  if (descCol !== -1) detectedMapping.description = headers[descCol];
  if (demoCol !== -1) detectedMapping.demoUrl = headers[demoCol];

  const projects: CSVProjectRow[] = [];

  dataRows.forEach((row, index) => {
    const rawUrl = (row[urlCol] || "").trim();
    if (!rawUrl) return;

    const { submissionId, repoUrl, defaultProjectName } =
      normalizeRepoIdentifier(rawUrl);

    const rawRow: Record<string, string> = {};
    headers.forEach((h, i) => {
      rawRow[h] = row[i] || "";
    });

    const projectName =
      projectCol !== -1 && row[projectCol]?.trim()
        ? row[projectCol].trim()
        : defaultProjectName;

    projects.push({
      id: `${submissionId.toLowerCase()}-${index}`,
      repoUrl,
      submissionId,
      projectName,
      teamName: teamCol !== -1 ? row[teamCol]?.trim() : undefined,
      track: trackCol !== -1 ? row[trackCol]?.trim() : undefined,
      members: membersCol !== -1 ? row[membersCol]?.trim() : undefined,
      description: descCol !== -1 ? row[descCol]?.trim() : undefined,
      demoUrl: demoCol !== -1 ? row[demoCol]?.trim() : undefined,
      rawRow,
    });
  });

  return { projects, headers, detectedMapping };
}

export function mergeReportWithCSV(
  board: RankReport,
  csvRows: CSVProjectRow[]
): EnrichedSubmission[] {
  const csvMap = new Map<string, CSVProjectRow>();
  for (const row of csvRows) {
    csvMap.set(row.submissionId.toLowerCase(), row);
  }

  const enriched: EnrichedSubmission[] = [];

  for (const entry of board.submissions || []) {
    const key = entry.submission_id.toLowerCase();
    const csvMatch = csvMap.get(key);
    const norm = normalizeRepoIdentifier(entry.submission_id);
    const report = entry.report;

    const lensesByName: Record<string, LensResult> = {};
    for (const l of report.lenses || []) {
      lensesByName[l.lens] = l;
    }

    const outcomeComponents = lensesByName["idea_plan_execution"]?.components || [];
    const ideaScore =
      outcomeComponents.find((c) => c.name === "idea")?.score ?? null;
    const planScore =
      outcomeComponents.find((c) => c.name === "plan")?.score ?? null;
    const executionScore =
      outcomeComponents.find((c) => c.name === "execution")?.score ?? null;

    enriched.push({
      submissionId: entry.submission_id,
      repoUrl: csvMatch?.repoUrl || norm.repoUrl,
      ownerRepo: norm.ownerRepo,
      projectName: csvMatch?.projectName || norm.defaultProjectName,
      teamName: csvMatch?.teamName,
      track: csvMatch?.track,
      members: csvMatch?.members,
      description: csvMatch?.description,
      demoUrl: csvMatch?.demoUrl,
      status: "ranked",
      rank: entry.rank,
      composite: entry.composite ?? report.composite ?? null,
      gradeProcess: report.grade_process ?? null,
      gradeSolution: report.grade_solution ?? null,
      integrityFlag: Boolean(report.integrity_flag),
      integrityReason: report.integrity_reason,
      report,
      lensesByName,
      ideaScore,
      planScore,
      executionScore,
    });
  }

  for (const ex of board.excluded || []) {
    const key = ex.submission_id.toLowerCase();
    const csvMatch = csvMap.get(key);
    const norm = normalizeRepoIdentifier(ex.submission_id);
    const report = ex.report;

    const lensesByName: Record<string, LensResult> = {};
    for (const l of report.lenses || []) {
      lensesByName[l.lens] = l;
    }

    const outcomeComponents = lensesByName["idea_plan_execution"]?.components || [];
    const ideaScore =
      outcomeComponents.find((c) => c.name === "idea")?.score ?? null;
    const planScore =
      outcomeComponents.find((c) => c.name === "plan")?.score ?? null;
    const executionScore =
      outcomeComponents.find((c) => c.name === "execution")?.score ?? null;

    enriched.push({
      submissionId: ex.submission_id,
      repoUrl: csvMatch?.repoUrl || norm.repoUrl,
      ownerRepo: norm.ownerRepo,
      projectName: csvMatch?.projectName || norm.defaultProjectName,
      teamName: csvMatch?.teamName,
      track: csvMatch?.track,
      members: csvMatch?.members,
      description: csvMatch?.description,
      demoUrl: csvMatch?.demoUrl,
      status: "excluded",
      exclusionReason: ex.reason,
      composite: report.composite ?? null,
      gradeProcess: report.grade_process ?? null,
      gradeSolution: report.grade_solution ?? null,
      integrityFlag: Boolean(report.integrity_flag),
      integrityReason: report.integrity_reason,
      report,
      lensesByName,
      ideaScore,
      planScore,
      executionScore,
    });
  }

  return enriched;
}

export function exportSubmissionsToCSV(
  submissions: EnrichedSubmission[],
  hackathonName: string
): string {
  const headers = [
    "Hackathon",
    "Status",
    "Rank",
    "Project Name",
    "Team Name",
    "Track",
    "Submission ID",
    "GitHub URL",
    "Combined Score",
    "Grade A (Process)",
    "Grade B (Solution)",
    "Authenticity",
    "Prompting Skill",
    "Effort Consistency",
    "CLI Awareness",
    "Integrity",
    "Idea / Plan / Execution",
    "Idea Sub-score",
    "Plan Sub-score",
    "Execution Sub-score",
    "Integrity Red Flag",
    "Integrity Reason",
    "Exclusion Reason",
    "Timeline Category",
    "Primary Agent",
    "Sessions",
    "Turns",
    "Time on Task (min)",
    "Total Commits",
    "Covered Commits",
    "Files Touched",
    "AI Judge Summary",
  ];

  const escapeCSV = (val: unknown): string => {
    if (val === null || val === undefined) return "";
    const str = String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const fmtScore = (val: number | null | undefined): string =>
    typeof val === "number" ? val.toFixed(2) : "";

  const lines = [headers.map(escapeCSV).join(",")];

  for (const sub of submissions) {
    const m = sub.report.deterministic;
    const row = [
      hackathonName,
      sub.status.toUpperCase(),
      sub.rank ?? "EXCLUDED",
      sub.projectName,
      sub.teamName ?? "",
      sub.track ?? "",
      sub.submissionId,
      sub.repoUrl,
      fmtScore(sub.composite),
      fmtScore(sub.gradeProcess),
      fmtScore(sub.gradeSolution),
      fmtScore(sub.lensesByName["authenticity"]?.score),
      fmtScore(sub.lensesByName["prompting_skill"]?.score),
      fmtScore(sub.lensesByName["effort_consistency"]?.score),
      fmtScore(sub.lensesByName["cli_awareness"]?.score),
      fmtScore(sub.lensesByName["integrity"]?.score),
      fmtScore(sub.lensesByName["idea_plan_execution"]?.score),
      fmtScore(sub.ideaScore),
      fmtScore(sub.planScore),
      fmtScore(sub.executionScore),
      sub.integrityFlag ? "TRUE" : "FALSE",
      sub.integrityReason ?? "",
      sub.exclusionReason ?? "",
      m.timeline_category,
      m.primary_agent ?? "",
      m.sessions,
      m.turns,
      Math.round(m.time_on_task_minutes),
      m.total_commits,
      m.covered_commits,
      m.files_touched,
      sub.report.summary ?? "",
    ];
    lines.push(row.map(escapeCSV).join(","));
  }

  return lines.join("\n");
}
