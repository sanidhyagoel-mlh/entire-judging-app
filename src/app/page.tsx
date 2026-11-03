"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  CSVProjectRow,
  EnrichedSubmission,
  FilterStatus,
  RankReport,
  SortDirection,
  SortField,
} from "@/lib/types";
import {
  exportSubmissionsToCSV,
  mergeReportWithCSV,
} from "@/lib/csv";
import { HackathonSetupPanel } from "@/components/HackathonSetupPanel";
import { ProjectCard } from "@/components/ProjectCard";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { ProjectDetailModal } from "@/components/ProjectDetailModal";
import {
  AlertTriangle,
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
  Award,
  Check,
  Copy,
  Download,
  Filter,
  LayoutGrid,
  List,
  Search,
  Settings2,
  ShieldAlert,
  Sparkles,
  Terminal,
  XCircle,
} from "lucide-react";

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: "composite", label: "Combined Score (Composite)" },
  { value: "rank", label: "Leaderboard Rank" },
  { value: "grade_process", label: "Grade A · Process Score" },
  { value: "grade_solution", label: "Grade B · Solution Score" },
  { value: "idea_plan_execution", label: "Lens: Idea / Plan / Execution" },
  { value: "prompting_skill", label: "Lens: Prompting Skill" },
  { value: "authenticity", label: "Lens: Authenticity" },
  { value: "effort_consistency", label: "Lens: Effort Consistency" },
  { value: "cli_awareness", label: "Lens: CLI Awareness" },
  { value: "integrity", label: "Lens: Integrity" },
  { value: "idea", label: "Sub-score: Idea" },
  { value: "plan", label: "Sub-score: Plan" },
  { value: "execution", label: "Sub-score: Execution" },
  { value: "sessions", label: "Telemetry: Exported Sessions" },
  { value: "time_on_task", label: "Telemetry: Time on Task" },
  { value: "commits", label: "Telemetry: Total Commits" },
  { value: "files_touched", label: "Telemetry: Files Touched" },
  { value: "project_name", label: "Project Name (A–Z)" },
];

const EMPTY_BOARD: RankReport = {
  schema_version: 1,
  kind: "entire_judge_ranking",
  advisory: true,
  disclaimer:
    "Advisory only: these scores inform the jury's judgment, they do not replace it.",
  generated_at: "",
  run: {
    agent: "",
    prompt_fingerprint: "",
    llm_status: "pending",
  },
  submissions: [],
  excluded: [],
};

export default function HomePage() {
  const [hackathonName, setHackathonName] = useState("");
  const [hackathonStart, setHackathonStart] = useState("");

  const [projects, setProjects] = useState<CSVProjectRow[]>([]);

  const [board, setBoard] = useState<RankReport>(EMPTY_BOARD);
  const [watchCommand, setWatchCommand] = useState(
    "entire judge watch ./jury-run/reports/board.json"
  );
  const [localCliAvailable, setLocalCliAvailable] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [runLogs, setRunLogs] = useState<string[]>([]);

  // Active tab: "gallery" | "setup"
  const [activeTab, setActiveTab] = useState<"gallery" | "setup">("setup");
  const [viewMode, setViewMode] = useState<"gallery" | "table">("gallery");

  // Gallery Filter & Sort state
  const [sortField, setSortField] = useState<SortField>("composite");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [timelineFilter, setTimelineFilter] = useState<string>("all");
  const [trackFilter, setTrackFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubmission, setSelectedSubmission] =
    useState<EnrichedSubmission | null>(null);
  const [copiedCmd, setCopiedCmd] = useState(false);

  const refreshEnv = () => {
    fetch("/api/env")
      .then((r) => r.json())
      .then((data) => {
        setLocalCliAvailable(Boolean(data?.localCliAvailable));
      })
      .catch(() => {});
  };

  useEffect(() => {
    refreshEnv();
  }, []);

  const enrichedSubmissions = useMemo(
    () => mergeReportWithCSV(board, projects),
    [board, projects]
  );

  const availableTracks = useMemo(() => {
    const s = new Set<string>();
    enrichedSubmissions.forEach((sub) => {
      if (sub.track) s.add(sub.track);
    });
    return Array.from(s);
  }, [enrichedSubmissions]);

  const getSortValue = (
    sub: EnrichedSubmission,
    field: SortField
  ): number | string => {
    const m = sub.report.deterministic;
    switch (field) {
      case "rank":
        return sub.rank ?? 9999;
      case "composite":
        return sub.composite ?? -1;
      case "grade_process":
        return sub.gradeProcess ?? -1;
      case "grade_solution":
        return sub.gradeSolution ?? -1;
      case "authenticity":
      case "prompting_skill":
      case "effort_consistency":
      case "cli_awareness":
      case "integrity":
      case "idea_plan_execution":
        return sub.lensesByName[field]?.score ?? -1;
      case "idea":
        return sub.ideaScore ?? -1;
      case "plan":
        return sub.planScore ?? -1;
      case "execution":
        return sub.executionScore ?? -1;
      case "sessions":
        return m.sessions;
      case "time_on_task":
        return m.time_on_task_minutes;
      case "commits":
        return m.total_commits;
      case "files_touched":
        return m.files_touched;
      case "tokens":
        return m.input_tokens + m.output_tokens;
      case "project_name":
        return sub.projectName.toLowerCase();
      default:
        return sub.composite ?? -1;
    }
  };

  const filteredAndSortedSubmissions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const filtered = enrichedSubmissions.filter((sub) => {
      if (statusFilter === "ranked" && sub.status !== "ranked") return false;
      if (statusFilter === "excluded" && sub.status !== "excluded")
        return false;
      if (statusFilter === "flagged" && !sub.integrityFlag) return false;

      if (
        timelineFilter !== "all" &&
        sub.report.deterministic.timeline_category !== timelineFilter
      ) {
        return false;
      }

      if (trackFilter !== "all" && sub.track !== trackFilter) {
        return false;
      }

      if (q) {
        const haystack = [
          sub.projectName,
          sub.teamName,
          sub.track,
          sub.submissionId,
          sub.ownerRepo,
          sub.report.summary,
          sub.description,
          sub.members,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });

    return filtered.sort((a, b) => {
      const va = getSortValue(a, sortField);
      const vb = getSortValue(b, sortField);

      if (typeof va === "string" && typeof vb === "string") {
        return sortDir === "asc"
          ? va.localeCompare(vb)
          : vb.localeCompare(va);
      }

      const na = Number(va);
      const nb = Number(vb);
      return sortDir === "asc" ? na - nb : nb - na;
    });
  }, [
    enrichedSubmissions,
    statusFilter,
    timelineFilter,
    trackFilter,
    searchQuery,
    sortField,
    sortDir,
  ]);

  const handleSortFieldClick = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "rank" || field === "project_name" ? "asc" : "desc");
    }
  };

  const handleRunEvaluation = async () => {
    setIsEvaluating(true);
    setRunLogs([]);
    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projects,
          hackathonName,
          hackathonStart,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Evaluation failed");
        return;
      }
      if (data.board) {
        setBoard(data.board);
      }
      if (data.watchCommand) {
        setWatchCommand(data.watchCommand);
      }
      if (data.logs) {
        setRunLogs(data.logs);
      }
      setActiveTab("gallery");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to run evaluation");
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleExportCSV = () => {
    const csvContent = exportSubmissionsToCSV(
      filteredAndSortedSubmissions,
      hackathonName
    );
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${hackathonName
      .toLowerCase()
      .replace(/\s+/g, "-")}-assessments.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportBoardJSON = () => {
    const blob = new Blob([JSON.stringify(board, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "board.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const flaggedSubmissions = useMemo(
    () => enrichedSubmissions.filter((s) => s.integrityFlag),
    [enrichedSubmissions]
  );
  const excludedSubmissions = useMemo(
    () => enrichedSubmissions.filter((s) => s.status === "excluded"),
    [enrichedSubmissions]
  );
  const rankedSubmissions = useMemo(
    () => enrichedSubmissions.filter((s) => s.status === "ranked"),
    [enrichedSubmissions]
  );
  const avgComposite = useMemo(() => {
    const valid = rankedSubmissions.filter((s) => s.composite !== null);
    if (valid.length === 0) return null;
    return (
      valid.reduce((acc, s) => acc + (s.composite ?? 0), 0) / valid.length
    );
  }, [rankedSubmissions]);


  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-30 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 p-1.5 shadow-md shadow-indigo-950/50">
              <svg
                viewBox="0 0 32 32"
                fill="#ffffff"
                className="h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M17.6.22c1.61-.43,3.33-.21,4.77.61l7.47,4.25c.31.18.25.64-.09.73l-16.75,4.49c-1.69.45-2.69,2.19-2.24,3.88l.82,3.06c.45,1.69,2.19,2.69,3.88,2.24l9.57-2.5,4.61,4.74c.89.89,1.39,2.1,1.39,3.36v2.54c0,1.65-1.27,3.03-2.92,3.16l-15.61,1.2c-1.85.14-3.67-.53-4.98-1.85l-5.11-5.14c-.88-.89-1.38-2.09-1.38-3.35v-2.55c0-1.65,1.5-3.08,3-3.08h2l-3.85-3.04c-.6-.43-1.04-1.05-1.23-1.76l-.81-3.03c-.45-1.69.55-3.43,2.24-3.88L17.6.22Z" />
                <path d="M20.02,13.94c0,1.38-1.12,2.5-2.5,2.5s-2.5-1.12-2.5-2.5,1.12-2.5,2.5-2.5,2.5,1.12,2.5,2.5Z" />
                <path d="M28.02,11.94c0,1.38-1.12,2.5-2.5,2.5s-2.5-1.12-2.5-2.5,1.12-2.5,2.5-2.5,2.5,1.12,2.5,2.5Z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-white">
                  Entire Judge
                </span>
                <span className="rounded-md bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 text-[11px] font-medium text-indigo-300">
                  Jury Service
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 hidden sm:block">
                Scores come from the Entire judge plugin
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-xl bg-zinc-900 border border-zinc-800 p-1">
              <button
                onClick={() => setActiveTab("gallery")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all ${
                  activeTab === "gallery"
                    ? "bg-indigo-600 text-white shadow"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Assessment Gallery ({enrichedSubmissions.length})
              </button>
              <button
                onClick={() => setActiveTab("setup")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all ${
                  activeTab === "setup"
                    ? "bg-indigo-600 text-white shadow"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Settings2 className="h-3.5 w-3.5" />
                CSV Intake & Setup
              </button>
            </div>

            <button
              onClick={handleExportCSV}
              className="hidden md:inline-flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-200 hover:border-zinc-700 hover:bg-zinc-800"
            >
              <Download className="h-3.5 w-3.5 text-indigo-400" />
              Export CSV
            </button>
            <button
              onClick={handleExportBoardJSON}
              className="hidden md:inline-flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-200 hover:border-zinc-700 hover:bg-zinc-800"
            >
              <Download className="h-3.5 w-3.5 text-emerald-400" />
              board.json
            </button>
          </div>
        </div>
      </header>


      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 rounded-2xl border border-zinc-800/90 bg-gradient-to-br from-zinc-900 via-zinc-900/95 to-indigo-950/30 p-6 shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-indigo-300 mb-1">
                <span className="inline-flex items-center gap-1 font-medium">
                  <Sparkles className="h-3.5 w-3.5" /> Hackathon Assessment Briefing
                </span>
                <span className="text-zinc-600">•</span>
                <span className="font-mono text-zinc-300">
                  Start: {hackathonStart || "—"}
                </span>
                {board.run?.agent ? (
                  <>
                    <span className="text-zinc-600">•</span>
                    <span className="font-mono text-zinc-400">
                      Judge: {board.run.agent}
                      {board.run.model ? ` (${board.run.model})` : ""}
                    </span>
                  </>
                ) : null}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {hackathonName || "Hackathon Evaluation"}
              </h1>
              <p className="text-xs text-zinc-400 mt-1">{board.disclaimer}</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
              <div className="rounded-xl bg-zinc-950/70 border border-zinc-800/80 px-4 py-2.5">
                <div className="text-[11px] text-zinc-400">Total Projects</div>
                <div className="text-xl font-bold font-mono text-white">
                  {enrichedSubmissions.length}
                </div>
              </div>
              <div className="rounded-xl bg-zinc-950/70 border border-zinc-800/80 px-4 py-2.5">
                <div className="text-[11px] text-emerald-400">Ranked</div>
                <div className="text-xl font-bold font-mono text-emerald-300">
                  {rankedSubmissions.length}
                </div>
              </div>
              <div className="rounded-xl bg-zinc-950/70 border border-zinc-800/80 px-4 py-2.5">
                <div className="text-[11px] text-indigo-300">Avg Score</div>
                <div className="text-xl font-bold font-mono text-indigo-200">
                  {avgComposite !== null ? avgComposite.toFixed(2) : "—"}
                </div>
              </div>
              <div className="rounded-xl bg-zinc-950/70 border border-zinc-800/80 px-4 py-2.5">
                <div className="text-[11px] text-rose-400">Red Flags / Excl</div>
                <div className="text-xl font-bold font-mono text-rose-300">
                  {flaggedSubmissions.length} / {excludedSubmissions.length}
                </div>
              </div>
            </div>
          </div>
        </div>

        {activeTab === "setup" ? (
          <HackathonSetupPanel
            hackathonName={hackathonName}
            setHackathonName={setHackathonName}
            hackathonStart={hackathonStart}
            setHackathonStart={setHackathonStart}
            projects={projects}
            setProjects={setProjects}
            localCliAvailable={localCliAvailable}
            isEvaluating={isEvaluating}
            onRunEvaluation={handleRunEvaluation}
            onInstalled={refreshEnv}
            onImportBoardJson={(imported) => {
              setBoard(imported);
              if (imported.run?.hackathon_started_at) {
                setHackathonStart(imported.run.hackathon_started_at);
              }
              setActiveTab("gallery");
            }}
          />
        ) : (
          <div className="space-y-6">
            {flaggedSubmissions.length > 0 && (
              <div className="rounded-2xl border border-red-500/40 bg-red-950/25 p-4">
                <div className="flex items-center gap-2 text-sm font-bold text-red-300 mb-2">
                  <ShieldAlert className="h-4 w-4 text-red-400" />
                  Integrity Red Flags Detected ({flaggedSubmissions.length})
                </div>
                <div className="space-y-2">
                  {flaggedSubmissions.map((f) => (
                    <div
                      key={f.submissionId}
                      onClick={() => setSelectedSubmission(f)}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl bg-red-950/40 border border-red-500/30 px-3.5 py-2 text-xs cursor-pointer hover:border-red-400"
                    >
                      <div>
                        <span className="font-semibold text-white">
                          {f.projectName}
                        </span>{" "}
                        <span className="font-mono text-red-300">
                          ({f.submissionId})
                        </span>
                        <p className="text-red-200/90 mt-0.5">
                          {f.integrityReason}
                        </p>
                      </div>
                      <span className="text-[11px] font-medium text-red-300 shrink-0">
                        View Evidence →
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/80 p-4 shadow-lg">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 flex-1">
                  <div className="relative flex-1 min-w-[220px] max-w-sm">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search project, team, repo, summary..."
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="inline-flex rounded-xl bg-zinc-950 border border-zinc-800 p-1 text-xs">
                    {(
                      [
                        { id: "all", label: `All (${enrichedSubmissions.length})` },
                        {
                          id: "ranked",
                          label: `Ranked (${rankedSubmissions.length})`,
                        },
                        {
                          id: "flagged",
                          label: `Red Flagged (${flaggedSubmissions.length})`,
                        },
                        {
                          id: "excluded",
                          label: `Excluded (${excludedSubmissions.length})`,
                        },
                      ] as { id: FilterStatus; label: string }[]
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setStatusFilter(tab.id)}
                        className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
                          statusFilter === tab.id
                            ? "bg-zinc-800 text-white"
                            : "text-zinc-400 hover:text-zinc-200"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {availableTracks.length > 0 && (
                    <select
                      value={trackFilter}
                      onChange={(e) => setTrackFilter(e.target.value)}
                      className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-300 focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="all">All Tracks</option>
                      {availableTracks.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  )}

                  <select
                    value={timelineFilter}
                    onChange={(e) => setTimelineFilter(e.target.value)}
                    className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-300 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="all">All Timelines</option>
                    <option value="clean_start">clean_start</option>
                    <option value="mixed">mixed</option>
                    <option value="predates_event">predates_event</option>
                    <option value="no_session_history">no_session_history</option>
                    <option value="insufficient_brain">insufficient_brain</option>
                  </select>

                  <div className="flex items-center rounded-xl border border-zinc-800 bg-zinc-950 px-2.5 py-1">
                    <Filter className="h-3.5 w-3.5 text-indigo-400 mr-1.5" />
                    <select
                      value={sortField}
                      onChange={(e) =>
                        setSortField(e.target.value as SortField)
                      }
                      className="bg-transparent text-xs font-medium text-white focus:outline-none pr-1"
                    >
                      {SORT_OPTIONS.map((opt) => (
                        <option
                          key={opt.value}
                          value={opt.value}
                          className="bg-zinc-900 text-white"
                        >
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() =>
                        setSortDir((d) => (d === "asc" ? "desc" : "asc"))
                      }
                      className="ml-1 rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                    >
                      {sortDir === "desc" ? (
                        <ArrowDownWideNarrow className="h-4 w-4 text-indigo-400" />
                      ) : (
                        <ArrowUpWideNarrow className="h-4 w-4 text-indigo-400" />
                      )}
                    </button>
                  </div>

                  <div className="inline-flex rounded-xl bg-zinc-950 border border-zinc-800 p-1">
                    <button
                      onClick={() => setViewMode("gallery")}
                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium ${
                        viewMode === "gallery"
                          ? "bg-indigo-600 text-white"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      <LayoutGrid className="h-3.5 w-3.5" /> Gallery
                    </button>
                    <button
                      onClick={() => setViewMode("table")}
                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium ${
                        viewMode === "table"
                          ? "bg-indigo-600 text-white"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      <List className="h-3.5 w-3.5" /> Table
                    </button>
                  </div>
                </div>
              </div>
            </div>


            {/* Sortable Gallery View or Compact Leaderboard Table */}
            {filteredAndSortedSubmissions.length === 0 ? (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
                <p className="text-sm text-zinc-400">
                  {enrichedSubmissions.length === 0
                    ? "Upload a CSV of GitHub repositories, then run judging."
                    : "No submissions match your current filters."}
                </p>
                {enrichedSubmissions.length === 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("setup")}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-500"
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                    Upload CSV
                  </button>
                )}
              </div>
            ) : viewMode === "gallery" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredAndSortedSubmissions.map((sub) => (
                  <ProjectCard
                    key={sub.submissionId}
                    submission={sub}
                    onSelect={setSelectedSubmission}
                  />
                ))}
              </div>
            ) : (
              <LeaderboardTable
                submissions={filteredAndSortedSubmissions}
                sortField={sortField}
                sortDir={sortDir}
                onSortChange={handleSortFieldClick}
                onSelect={setSelectedSubmission}
              />
            )}

            {/* Terminal TUI Command Footer & Execution Logs */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs">
                <Terminal className="h-4 w-4 text-emerald-400 shrink-0" />
                <span className="text-zinc-400">Interactive Terminal TUI:</span>
                <code className="rounded-lg bg-zinc-950 border border-zinc-800 px-2.5 py-1 font-mono text-emerald-300">
                  {watchCommand}
                </code>
              </div>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(watchCommand);
                  setCopiedCmd(true);
                  setTimeout(() => setCopiedCmd(false), 1800);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-200 shrink-0"
              >
                {copiedCmd ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" /> Copy TUI Command
                  </>
                )}
              </button>
            </div>

            {runLogs.length > 0 && (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs text-zinc-400 space-y-1">
                <div className="text-zinc-300 font-semibold mb-1">
                  Latest Pipeline Execution Log:
                </div>
                {runLogs.map((log, i) => (
                  <div key={i}>{log}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <ProjectDetailModal
        submission={selectedSubmission}
        onClose={() => setSelectedSubmission(null)}
        watchCommand={watchCommand}
      />
    </div>
  );
}
