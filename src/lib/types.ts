export type LensName =
  | "authenticity"
  | "prompting_skill"
  | "effort_consistency"
  | "cli_awareness"
  | "integrity"
  | "idea_plan_execution"
  | "agent_leverage";

export type TimelineCategory =
  | "clean_start"
  | "mixed"
  | "predates_event"
  | "no_session_history"
  | "insufficient_brain";

export interface LensComponent {
  name: string; // "idea" | "plan" | "execution"
  score: number;
}

export interface LensResult {
  lens: LensName | string;
  score?: number | null;
  components?: LensComponent[];
  verdict: string;
  bullets?: string[];
  evidence?: string[];
  supported: boolean;
  warnings?: string[];
  raw?: string;
}

export interface Metrics {
  timeline_category: TimelineCategory | string;
  timeline_reason: string;
  sessions: number;
  human_prompts: number;
  turns: number;
  files_touched: number;
  facts?: number;
  exported_checkpoints: number;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens?: number;
  cache_creation_tokens?: number;
  total_commits: number;
  pre_session_commits: number;
  covered_commits: number;
  missing_session_commits: number;
  no_session_history_commits: number;
  merge_commits: number;
  oldest_session_at?: string;
  first_session_at?: string;
  last_session_at?: string;
  time_on_task_minutes: number;
  first_commit_at?: string;
  first_commit_to_first_session_minutes?: number;
  first_commit_before_first_session: boolean;
  agent_histogram?: Record<string, number>;
  primary_agent?: string;
  semantic_symbols?: number;
  semantic_relations?: number;
  semantic_files?: number;
  semantic_capabilities?: string[];
}

export interface RunMetadata {
  agent: string;
  model?: string;
  effort?: string;
  prompt_fingerprint: string;
  hackathon_started_at?: string;
  llm_status: string;
}

export interface RunReport {
  schema_version: number;
  kind: string;
  advisory: boolean;
  disclaimer: string;
  generated_at: string;
  submission_id: string;
  repo_dir: string;
  brain_path: string;
  run: RunMetadata;
  deterministic: Metrics;
  grade_process?: number | null;
  grade_solution?: number | null;
  composite?: number | null;
  integrity_flag?: boolean;
  integrity_reason?: string;
  integrity_signal?: boolean;
  flags?: string[];
  summary?: string;
  lenses: LensResult[];
  warnings?: string[];
}

export interface RankEntry {
  rank: number;
  submission_id: string;
  brain_path: string;
  composite?: number | null;
  report: RunReport;
}

export interface RankExcluded {
  submission_id: string;
  brain_path: string;
  reason: string;
  report: RunReport;
}

export interface RankReport {
  schema_version: number;
  kind: string;
  advisory: boolean;
  disclaimer: string;
  generated_at: string;
  run: RunMetadata;
  submissions: RankEntry[];
  excluded?: RankExcluded[];
  fairness_notes?: string[];
  warnings?: string[];
}

export interface CSVProjectRow {
  id: string;
  repoUrl: string;
  submissionId: string; // normalized "gh/owner/repo"
  projectName: string;
  teamName?: string;
  track?: string;
  members?: string;
  description?: string;
  demoUrl?: string;
  rawRow: Record<string, string>;
}

export interface EnrichedSubmission {
  submissionId: string;
  repoUrl: string;
  ownerRepo: string;
  projectName: string;
  teamName?: string;
  track?: string;
  members?: string;
  description?: string;
  demoUrl?: string;
  status: "ranked" | "excluded";
  rank?: number;
  exclusionReason?: string;
  composite: number | null;
  gradeProcess: number | null;
  gradeSolution: number | null;
  integrityFlag: boolean;
  integrityReason?: string;
  report: RunReport;
  lensesByName: Record<string, LensResult>;
  ideaScore: number | null;
  planScore: number | null;
  executionScore: number | null;
}

export type SortField =
  | "rank"
  | "composite"
  | "grade_process"
  | "grade_solution"
  | "authenticity"
  | "prompting_skill"
  | "effort_consistency"
  | "cli_awareness"
  | "integrity"
  | "idea_plan_execution"
  | "idea"
  | "plan"
  | "execution"
  | "sessions"
  | "time_on_task"
  | "commits"
  | "files_touched"
  | "tokens"
  | "project_name";

export type SortDirection = "asc" | "desc";

export type FilterStatus = "all" | "ranked" | "flagged" | "excluded";
