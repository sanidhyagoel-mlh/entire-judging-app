import {
  CSVProjectRow,
  Metrics,
  RankExcluded,
  RunReport,
} from "./types";
import { normalizeRepoIdentifier } from "./csv";

const githubHeaders = {
  Accept: "application/vnd.github+json",
  "User-Agent": "entire-judging-app/1.0",
};

const NOT_PUBLIC_REASON = "not a public GitHub repository";

function emptyMetrics(): Metrics {
  return {
    timeline_category: "insufficient_brain",
    timeline_reason: NOT_PUBLIC_REASON,
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

async function isPublicGitHubRepo(ownerRepo: string): Promise<boolean> {
  const [owner, repo] = ownerRepo.split("/");
  if (!owner || !repo) return false;
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: githubHeaders,
    cache: "no-store",
  });
  if (res.status === 404) return false;
  if (!res.ok) {
    throw new Error(`GitHub could not be checked (${res.status})`);
  }
  const body = (await res.json()) as { private?: boolean };
  return body.private !== true;
}

function notPublicReport(
  project: CSVProjectRow,
  norm: { submissionId: string; ownerRepo: string }
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
    deterministic: emptyMetrics(),
    summary: `${norm.ownerRepo || project.repoUrl} is not a public GitHub repository, so it was not sent to Entire judge.`,
    lenses: [],
  };
}

export async function partitionPublicProjects(
  projects: CSVProjectRow[]
): Promise<{ publicProjects: CSVProjectRow[]; excluded: RankExcluded[] }> {
  const publicProjects: CSVProjectRow[] = [];
  const excluded: RankExcluded[] = [];
  for (const project of projects) {
    const norm = normalizeRepoIdentifier(project.repoUrl);
    const isPublic = await isPublicGitHubRepo(norm.ownerRepo);
    if (isPublic) {
      publicProjects.push(project);
      continue;
    }
    excluded.push({
      submission_id: norm.submissionId || project.repoUrl,
      brain_path: "",
      reason: NOT_PUBLIC_REASON,
      report: notPublicReport(project, norm),
    });
  }
  return { publicProjects, excluded };
}
