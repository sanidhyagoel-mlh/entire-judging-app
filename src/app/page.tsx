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
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
  Check,
  Copy,
  Download,
  LayoutGrid,
  List,
  Search,
  Settings2,
  ShieldAlert,
  Terminal,
} from "lucide-react";

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: "composite", label: "Combined score" },
  { value: "rank", label: "Rank" },
  { value: "grade_process", label: "Grade A · Process" },
  { value: "grade_solution", label: "Grade B · Solution" },
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
  const [runPhase, setRunPhase] = useState("");
  const [runStage, setRunStage] = useState("");
  const [runStatus, setRunStatus] = useState<"idle" | "running" | "complete" | "error">("idle");
  const [runProgress, setRunProgress] = useState({ checked: 0, total: 0 });

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
    setRunProgress({ checked: 0, total: 0 });
    setRunStage("github");
    setRunPhase("Checking repositories…");
    setRunStatus("running");
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
      if (!res.ok) {
        const data = await res.json();
        setRunStatus("error");
        setRunPhase(data.error || "Evaluation failed");
        setRunLogs((old) => [...old, data.error || "Evaluation failed"]);
        if (res.status === 401) window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      const reader = res.body?.getReader();
      if (!reader) throw new Error("Could not read evaluation progress.");
      const decoder = new TextDecoder();
      let pending = "";
      while (true) {
        const { value, done } = await reader.read();
        pending += decoder.decode(value, { stream: !done });
        const lines = pending.split("\n"); pending = lines.pop() || "";
        for (const line of lines) {
          if (!line) continue;
          const event = JSON.parse(line);
          if (event.phase) setRunStage(event.phase);
          if (event.message) {
            setRunPhase(event.message);
            setRunLogs((old) => [...old, event.message]);
          }
          if (typeof event.checked === "number") setRunProgress({ checked: event.checked, total: event.total || 0 });
          if (event.type === "error") throw new Error(event.error || "Evaluation failed");
          if (event.type === "complete") {
            setRunStage("complete");
            setRunStatus("complete");
            setRunPhase("Evaluation complete");
            setRunLogs((old) => [...old, "Evaluation complete. Assessments are ready."]);
            const data = event.data;
            if (data.board) setBoard(data.board);
            if (data.watchCommand) setWatchCommand(data.watchCommand);

          }
        }
        if (done) break;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to run evaluation";
      setRunStatus("error");
      setRunPhase(message);
      setRunLogs((old) => [...old, message]);
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


  const showSummary = activeTab === "gallery" && enrichedSubmissions.length > 0;

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">E</span>
          <div>
            <div className="brand-name">Entire Judge</div>
            <div className="brand-sub">Hackathon assessments</div>
          </div>
        </div>

        <div className="nav-label">Workspace</div>
        <nav className="nav">
          <button
            type="button"
            onClick={() => setActiveTab("setup")}
            className={`nav-item ${activeTab === "setup" ? "active" : ""}`}
          >
            <Settings2 /> Setup
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("gallery")}
            className={`nav-item ${activeTab === "gallery" ? "active" : ""}`}
          >
            <LayoutGrid /> Assessments
            <span className="nav-count">{enrichedSubmissions.length}</span>
          </button>
        </nav>

        <div className="sidebar-foot">
          <div className="status-row">
            <span className={`dot ${localCliAvailable ? "ok" : ""}`} />
            {localCliAvailable ? "Entire CLI ready" : "Entire CLI not installed"}
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="crumbs">
            <span>{hackathonName.trim() || "Untitled hackathon"}</span>
            <span className="sep">/</span>
            <strong>{activeTab === "setup" ? "Setup" : "Assessments"}</strong>
          </div>
          {activeTab === "gallery" && enrichedSubmissions.length > 0 && (
            <div className="topbar-actions">
              <button onClick={handleExportCSV} className="btn btn-sm">
                <Download /> Export CSV
              </button>
              <button onClick={handleExportBoardJSON} className="btn btn-sm">
                <Download /> board.json
              </button>
            </div>
          )}
        </header>

        <main className="content">
          <div className="page-head">
            <h1>{activeTab === "setup" ? "Setup" : hackathonName.trim() || "Assessments"}</h1>
            <p>
              {activeTab === "setup"
                ? "Configure the event, add repositories, and run the Entire judge."
                : board.disclaimer}
            </p>
          </div>

          {showSummary && (
            <section className="stats section" aria-label="Assessment summary">
              <div className="stat">
                <div className="stat-label">Projects</div>
                <div className="stat-value">{enrichedSubmissions.length}</div>
              </div>
              <div className="stat">
                <div className="stat-label">Ranked</div>
                <div className="stat-value">{rankedSubmissions.length}</div>
              </div>
              <div className="stat">
                <div className="stat-label">Average score</div>
                <div className="stat-value">
                  {avgComposite !== null ? avgComposite.toFixed(2) : "—"}
                  <small>/ 5</small>
                </div>
              </div>
              <div className="stat">
                <div className="stat-label">Flagged · Excluded</div>
                <div className="stat-value">
                  <span className={flaggedSubmissions.length ? "tone-bad" : ""}>{flaggedSubmissions.length}</span>
                  <span style={{ color: "var(--text-3)" }}> · </span>
                  <span className={excludedSubmissions.length ? "tone-low" : ""}>{excludedSubmissions.length}</span>
                </div>
              </div>
            </section>
          )}

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
              runPhase={runPhase}
              runStage={runStage}
              runStatus={runStatus}
              runLogs={runLogs}
              runProgress={runProgress}
              onRunEvaluation={handleRunEvaluation}
              onViewResults={() => setActiveTab("gallery")}
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
            <div className="flex flex-col gap-5">
              {flaggedSubmissions.length > 0 && (
                <div className="alert alert-bad" style={{ flexDirection: "column", gap: 10 }}>
                  <div className="flex items-center gap-2 alert-title">
                    <ShieldAlert style={{ marginTop: 0 }} />
                    {flaggedSubmissions.length} integrity {flaggedSubmissions.length === 1 ? "flag" : "flags"} need review
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {flaggedSubmissions.map((f) => (
                      <button
                        key={f.submissionId}
                        type="button"
                        onClick={() => setSelectedSubmission(f)}
                        className="flex items-center justify-between gap-3 text-left rounded-md px-3 py-2 hover:bg-black/20"
                        style={{ border: "1px solid rgba(236,106,98,.2)", background: "transparent" }}
                      >
                        <span className="min-w-0">
                          <b style={{ color: "var(--text)" }}>{f.projectName}</b>
                          <span className="clamp2 block text-[12px] opacity-80">{f.integrityReason}</span>
                        </span>
                        <span className="text-[12px] shrink-0">Review →</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="card">
                <div className="toolbar">
                  <div className="input-icon grow">
                    <Search />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search projects"
                      className="input"
                      style={{ minHeight: 32, fontSize: 12.5 }}
                    />
                  </div>

                  <div className="seg">
                    {(
                      [
                        { id: "all", label: "All", n: enrichedSubmissions.length },
                        { id: "ranked", label: "Ranked", n: rankedSubmissions.length },
                        { id: "flagged", label: "Flagged", n: flaggedSubmissions.length },
                        { id: "excluded", label: "Excluded", n: excludedSubmissions.length },
                      ] as { id: FilterStatus; label: string; n: number }[]
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setStatusFilter(tab.id)}
                        className={statusFilter === tab.id ? "active" : ""}
                      >
                        {tab.label} <span className="n">{tab.n}</span>
                      </button>
                    ))}
                  </div>

                  <div className="spacer">
                    {availableTracks.length > 0 && (
                      <select
                        value={trackFilter}
                        onChange={(e) => setTrackFilter(e.target.value)}
                        className="select"
                        aria-label="Track"
                      >
                        <option value="all">All tracks</option>
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
                      className="select"
                      aria-label="Timeline"
                    >
                      <option value="all">All timelines</option>
                      <option value="clean_start">Clean start</option>
                      <option value="mixed">Mixed</option>
                      <option value="predates_event">Predates event</option>
                      <option value="no_session_history">No session history</option>
                      <option value="insufficient_brain">Insufficient data</option>
                    </select>

                    <div className="flex items-center gap-1">
                      <select
                        value={sortField}
                        onChange={(e) => setSortField(e.target.value as SortField)}
                        className="select"
                        aria-label="Sort by"
                      >
                        {SORT_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                        className="icon-btn"
                        aria-label="Toggle sort direction"
                        title={sortDir === "desc" ? "Descending" : "Ascending"}
                      >
                        {sortDir === "desc" ? (
                          <ArrowDownWideNarrow size={16} />
                        ) : (
                          <ArrowUpWideNarrow size={16} />
                        )}
                      </button>
                    </div>

                    <div className="seg">
                      <button
                        onClick={() => setViewMode("gallery")}
                        className={viewMode === "gallery" ? "active" : ""}
                      >
                        <LayoutGrid /> Cards
                      </button>
                      <button
                        onClick={() => setViewMode("table")}
                        className={viewMode === "table" ? "active" : ""}
                      >
                        <List /> Table
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {filteredAndSortedSubmissions.length === 0 ? (
                <div className="card" style={{ padding: "56px 20px", textAlign: "center" }}>
                  <p className="m-0 text-[13.5px]" style={{ color: "var(--text-2)" }}>
                    {enrichedSubmissions.length === 0
                      ? "No assessments yet. Upload a CSV and run the judge."
                      : "No submissions match your current filters."}
                  </p>
                  {enrichedSubmissions.length === 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveTab("setup")}
                      className="btn btn-sm mt-4"
                    >
                      <Settings2 /> Go to setup
                    </button>
                  )}
                </div>
              ) : viewMode === "gallery" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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

              <div className="card">
                <div className="card-head">
                  <div className="flex items-center gap-3 min-w-0">
                    <Terminal size={15} style={{ color: "var(--text-3)", flex: "none" }} />
                    <div className="min-w-0">
                      <div className="text-[12.5px]" style={{ color: "var(--text-2)" }}>
                        Open this board in the terminal UI
                      </div>
                      <code className="mono text-[12px] block truncate" style={{ color: "var(--text-3)" }}>
                        {watchCommand}
                      </code>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(watchCommand);
                      setCopiedCmd(true);
                      setTimeout(() => setCopiedCmd(false), 1800);
                    }}
                    className="btn btn-sm"
                  >
                    {copiedCmd ? <Check /> : <Copy />}
                    {copiedCmd ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      <ProjectDetailModal
        submission={selectedSubmission}
        onClose={() => setSelectedSubmission(null)}
        watchCommand={watchCommand}
      />
    </div>
  );
}
