import {
  CSVProjectRow,
  Metrics,
  RankExcluded,
  RunReport,
} from "./types";
import { normalizeRepoIdentifier } from "./csv";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const NOT_PUBLIC_REASON = "not publicly accessible on GitHub";

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
  if (!owner || !repo || !/^[a-zA-Z0-9-]+$/.test(owner) || !/^[a-zA-Z0-9._-]+$/.test(repo)) return false;
  try {
    await execFileAsync("git", ["ls-remote", `https://github.com/${owner}/${repo}.git`, "HEAD"], {
      timeout: 20000,
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: process.platform === "win32" ? "NUL" : "/dev/null", GIT_ASKPASS: "echo" },
    });
    return true;
  } catch (error) {
    const stderr = String((error as { stderr?: string }).stderr || "");
    if (/repository not found|authentication failed|could not read username|terminal prompts disabled/i.test(stderr)) return false;
    throw new Error(`Could not check ${ownerRepo}: ${stderr.trim() || (error instanceof Error ? error.message : String(error))}`);
  }
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
    summary: `${norm.ownerRepo || project.repoUrl} could not be accessed anonymously on GitHub, so it was not sent to Entire judge.`,
    lenses: [],
  };
}

export async function partitionPublicProjects(
  projects: CSVProjectRow[],
  onProgress?: (checked: number, total: number, repoUrl: string, isPublic: boolean) => void
): Promise<{ publicProjects: CSVProjectRow[]; excluded: RankExcluded[] }> {
  const publicProjects: CSVProjectRow[] = [];
  const excluded: RankExcluded[] = [];
  for (const project of projects) {
    const norm = normalizeRepoIdentifier(project.repoUrl);
    const isPublic = await isPublicGitHubRepo(norm.ownerRepo);
    onProgress?.(publicProjects.length + excluded.length + 1, projects.length, project.repoUrl, isPublic);
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
