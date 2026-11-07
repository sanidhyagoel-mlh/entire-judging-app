import {
  CSVProjectRow,
  Metrics,
  RankExcluded,
  RunReport,
} from "./types";
import { normalizeRepoIdentifier } from "./csv";

const NOT_PUBLIC_REASON = "not publicly accessible on GitHub";

function emptyMetrics(reason: string): Metrics {
  return {
    timeline_category: "insufficient_brain",
    timeline_reason: reason,
    sessions: 0,
    human_prompts: 0,
    turns: 0,
    files_touched: 0,
    exported_checkpoints: 0,
    input_tokens: 0,
    output_tokens: 0,
    total_commits: 0,
    pre_session_commits: 0,
    covered_commits: 0,
    missing_session_commits: 0,
    no_session_history_commits: 0,
    merge_commits: 0,
    time_on_task_minutes: 0,
    first_commit_before_first_session: false,
  };
}

export type RepoVisibility = "public" | "not_public" | "unknown";
export interface VisibilityResult {
  status: RepoVisibility;
  detail: string;
}

const GITHUB_HEADERS: Record<string, string> = {
  "User-Agent": "entire-judging-app",
  Accept: "application/vnd.github+json",
};
if (process.env.GITHUB_TOKEN) GITHUB_HEADERS.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function probe(url: string, headers: Record<string, string>): Promise<{ status: number; body?: string }> {
  const res = await fetch(url, { headers, redirect: "follow", signal: AbortSignal.timeout(15000) });
  const body = url.includes("api.github.com") ? await res.text() : undefined;
  return { status: res.status, body };
}

// One pass over two independent GitHub signals. Only a definitive answer is
// returned as public / not_public; anything ambiguous (rate limits, 5xx,
// network errors, proxies) is "unknown" so the caller can retry instead of
// wrongly calling a public repo inaccessible.
async function checkVisibilityOnce(owner: string, repo: string): Promise<VisibilityResult> {
  let apiNote = "";
  try {
    // Authoritative: the API reports `private` explicitly and follows renames.
    const api = await probe(`https://api.github.com/repos/${owner}/${repo}`, GITHUB_HEADERS);
    if (api.status === 200) {
      const info = JSON.parse(api.body || "{}") as { private?: boolean };
      return info.private === false
        ? { status: "public", detail: "GitHub API: public" }
        : { status: "not_public", detail: "GitHub API: private" };
    }
    if (api.status === 404) apiNote = "GitHub API: 404";
    else apiNote = `GitHub API: HTTP ${api.status} (rate limit or temporary error)`;
  } catch (error) {
    apiNote = `GitHub API: ${error instanceof Error ? error.message : String(error)}`;
  }

  try {
    // Second opinion from the web page (separate rate limit from the API).
    const web = await probe(`https://github.com/${owner}/${repo}`, { "User-Agent": "entire-judging-app" });
    if (web.status === 200) return { status: "public", detail: `${apiNote}; github.com page: 200` };
    if (web.status === 404 && apiNote.endsWith("404")) {
      return { status: "not_public", detail: "GitHub API and github.com both return 404 (private or does not exist)" };
    }
    return { status: "unknown", detail: `${apiNote}; github.com page: HTTP ${web.status}` };
  } catch (error) {
    return { status: "unknown", detail: `${apiNote}; github.com page: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export async function checkRepoVisibility(ownerRepo: string): Promise<VisibilityResult> {
  const [owner, repo] = ownerRepo.split("/");
  if (!owner || !repo || !/^[a-zA-Z0-9-]+$/.test(owner) || !/^[a-zA-Z0-9._-]+$/.test(repo)) {
    return { status: "not_public", detail: "not a valid GitHub owner/repo" };
  }
  let last: VisibilityResult = { status: "unknown", detail: "not checked" };
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await sleep(1000 * 2 ** (attempt - 1));
    last = await checkVisibilityOnce(owner, repo);
    if (last.status !== "unknown") return last;
  }
  return last;
}

export function excludedReport(
  project: CSVProjectRow,
  norm: { submissionId: string; ownerRepo: string },
  reason: string
): RunReport {
  return {
    schema_version: 1,
    kind: "entire_judge_submission",
    advisory: true,
    disclaimer:
      "Advisory only: these scores inform the jury's judgment, they do not replace it.",
    generated_at: new Date().toISOString(),
    submission_id: norm.submissionId || project.repoUrl,
    repo_dir: "",
    brain_path: "",
    run: {
      agent: "",
      prompt_fingerprint: "",
      llm_status: "skipped",
    },
    deterministic: emptyMetrics(reason),
    summary: `${norm.ownerRepo || project.repoUrl} was not sent to Entire judge: ${reason}.`,
    lenses: [],
  };
}

export async function partitionPublicProjects(
  projects: CSVProjectRow[],
  onProgress?: (checked: number, total: number, repoUrl: string, result: VisibilityResult) => void
): Promise<{ publicProjects: CSVProjectRow[]; excluded: RankExcluded[] }> {
  const publicProjects: CSVProjectRow[] = [];
  const excluded: RankExcluded[] = [];
  for (const project of projects) {
    const norm = normalizeRepoIdentifier(project.repoUrl);
    const result = await checkRepoVisibility(norm.ownerRepo);
    onProgress?.(publicProjects.length + excluded.length + 1, projects.length, project.repoUrl, result);
    // Only a definitive "not public" excludes a repo. "unknown" (couldn't verify)
    // is still attempted: the clone itself is the final test.
    if (result.status !== "not_public") {
      publicProjects.push(project);
      continue;
    }
    const reason = `${NOT_PUBLIC_REASON} (${result.detail})`;
    excluded.push({
      submission_id: norm.submissionId || project.repoUrl,
      brain_path: "",
      reason,
      report: excludedReport(project, norm, reason),
    });
  }
  return { publicProjects, excluded };
}
