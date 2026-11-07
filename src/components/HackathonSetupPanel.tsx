"use client";

import React, { useEffect, useRef, useState } from "react";
import { CSVProjectRow, RankReport } from "@/lib/types";
import { parseProjectsCSV } from "@/lib/csv";
import {
  CheckCircle2,
  Download,
  FileUp,
  Loader2,
  Play,
  Trash2,
  Upload,
} from "lucide-react";

interface HackathonSetupPanelProps {
  hackathonName: string;
  setHackathonName: (val: string) => void;
  hackathonStart: string;
  setHackathonStart: (val: string) => void;
  projects: CSVProjectRow[];
  setProjects: (rows: CSVProjectRow[]) => void;
  localCliAvailable: boolean;
  isEvaluating: boolean;
  runPhase: string;
  runStage: string;
  runStatus: "idle" | "running" | "complete" | "error";
  runLogs: string[];
  runProgress: { checked: number; total: number };
  onRunEvaluation: () => void;
  onViewResults: () => void;
  onInstalled: () => void;
  onImportBoardJson: (board: RankReport) => void;
}

export function HackathonSetupPanel({
  hackathonName,
  setHackathonName,
  hackathonStart,
  setHackathonStart,
  projects,
  setProjects,
  localCliAvailable,
  isEvaluating,
  runPhase,
  runStage,
  runStatus,
  runLogs,
  runProgress,
  onRunEvaluation,
  onViewResults,
  onInstalled,
  onImportBoardJson,
}: HackathonSetupPanelProps) {
  const csvInputRef = useRef<HTMLInputElement>(null);
  const boardInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installError, setInstallError] = useState("");
  const [installLogs, setInstallLogs] = useState<string[]>([]);

  const handleCSVText = (text: string) => {
    const parsed = parseProjectsCSV(text);
    setProjects(parsed.projects);
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (file.name.endsWith(".json")) {
        try {
          const parsedBoard = JSON.parse(content) as RankReport;
          onImportBoardJson(parsedBoard);
        } catch {
          alert("Invalid board.json file format.");
        }
      } else {
        handleCSVText(content);
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadTemplateCSV = () => {
    const blob = new Blob(["repo_url\n"], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "projects-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRemoveProject = (id: string) => {
    setProjects(projects.filter((p) => p.id !== id));
  };

  const handleInstall = async () => {
    setInstalling(true);
    setInstallError("");
    setInstallLogs([]);
    try {
      const res = await fetch("/api/setup", { method: "POST" });
      const data = await res.json();
      setInstallLogs(Array.isArray(data.logs) ? data.logs : []);
      if (!res.ok) {
        setInstallError(data.error || "Install failed");
        return;
      }
      onInstalled();
    } catch (err) {
      setInstallError(err instanceof Error ? err.message : "Install failed");
    } finally {
      setInstalling(false);
    }
  };


  const toDatetimeLocal = (rfc3339: string): string => {
    const d = new Date(rfc3339);
    if (!rfc3339 || isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 16);
  };

  const handleDatetimeChange = (val: string) => {
    if (!val) {
      setHackathonStart("");
      return;
    }
    const d = new Date(`${val}:00Z`);
    if (!isNaN(d.getTime())) {
      setHackathonStart(d.toISOString().replace(".000Z", "Z"));
    }
  };

  const canRun =
    localCliAvailable &&
    !isEvaluating &&
    projects.length > 0 &&
    hackathonName.trim().length > 0 &&
    hackathonStart.trim().length > 0;

  // Keep every log line. Follow the newest line only while the user is already
  // at the bottom, so scrolling up to read earlier steps is never interrupted.
  const logRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const handleLogScroll = () => {
    const el = logRef.current;
    if (el) stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
  };
  useEffect(() => {
    const el = logRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [runLogs]);
  const visibleLogs = runLogs;
  const progressPct =
    runStatus === "complete"
      ? 100
      : runStage === "ranking"
        ? 35
        : runProgress.total
          ? Math.max(5, Math.min(100, (runProgress.checked / runProgress.total) * 100))
          : 5;

  return (
    <div className="flex flex-col gap-5">
      <section className="card">
        <div className="card-head">
          <div className="flex items-center gap-3">
            <span className={`dot ${localCliAvailable ? "ok" : ""}`} />
            <div>
              <h2 className="card-title">Entire judge</h2>
              <p className="card-sub">
                {localCliAvailable
                  ? "Installed and ready on this computer."
                  : "Installs the Entire CLI and the judge plugin on this computer."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleInstall}
            disabled={installing || localCliAvailable}
            className="btn"
          >
            {installing ? (
              <>
                <Loader2 className="animate-spin" /> Installing…
              </>
            ) : localCliAvailable ? (
              <>
                <CheckCircle2 style={{ color: "var(--good)" }} /> Installed
              </>
            ) : (
              "Install"
            )}
          </button>
        </div>
        {(installError || installLogs.length > 0) && (
          <div className="card-body flex flex-col gap-3">
            {installError && (
              <div className="alert alert-bad">
                <div className="whitespace-pre-wrap text-[12.5px]">{installError}</div>
              </div>
            )}
            {installLogs.length > 0 && (
              <code className="code" style={{ maxHeight: 160 }}>
                {installLogs.join("\n")}
              </code>
            )}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <section className="card lg:col-span-3">
          <div className="card-head">
            <div>
              <h2 className="card-title">Hackathon details</h2>
              <p className="card-sub">Used to place each project on the event timeline.</p>
            </div>
          </div>
          <div className="card-body grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="hackathon-name" className="field-label">
                Hackathon name
              </label>
              <input
                id="hackathon-name"
                type="text"
                value={hackathonName}
                onChange={(e) => setHackathonName(e.target.value)}
                placeholder="e.g. hackCBS 9.0"
                className="input"
              />
            </div>
            <div>
              <label htmlFor="hackathon-start" className="field-label">
                Start date and time (UTC)
              </label>
              <input
                id="hackathon-start"
                type="datetime-local"
                value={toDatetimeLocal(hackathonStart)}
                onChange={(e) => handleDatetimeChange(e.target.value)}
                className="input"
              />
            </div>
          </div>
        </section>

        <section className="card lg:col-span-2">
          <div className="card-head">
            <div>
              <h2 className="card-title">Projects</h2>
              <p className="card-sub">One public GitHub link per row.</p>
            </div>
            <button type="button" onClick={handleDownloadTemplateCSV} className="btn btn-sm">
              <Download /> Template
            </button>
          </div>
          <div className="card-body flex flex-col gap-3">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]);
              }}
              onClick={() => csvInputRef.current?.click()}
              className={`dropzone ${dragActive ? "drag" : ""}`}
            >
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
                }}
              />
              <Upload />
              <strong>Drop a CSV or click to browse</strong>
              <span>Column: repo_url · private repositories are skipped</span>
            </div>
            <input
              ref={boardInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
              }}
            />
            <button
              type="button"
              onClick={() => boardInputRef.current?.click()}
              className="btn btn-ghost btn-sm self-start"
            >
              <FileUp /> Import existing board.json
            </button>
          </div>
        </section>
      </div>

      <section className="card">
        <div className="card-head">
          <div>
            <h2 className="card-title">Repositories</h2>
            <p className="card-sub">
              {projects.length === 0
                ? "No repositories added yet."
                : `${projects.length} ${projects.length === 1 ? "repository" : "repositories"} queued for this run.`}
            </p>
          </div>
          <button
            type="button"
            disabled={!canRun}
            onClick={onRunEvaluation}
            className={`btn btn-primary ${isEvaluating ? "is-running" : ""}`}
          >
            {isEvaluating ? (
              <>
                <Loader2 className="animate-spin" /> Running…
              </>
            ) : (
              <>
                <Play /> Run evaluation
              </>
            )}
          </button>
        </div>

        {runStatus !== "idle" && (
          <div className="run-panel" role="status" aria-live="polite">
            <div className="run-top">
              <span
                className={`dot ${
                  isEvaluating ? "live" : runStatus === "error" ? "bad" : "ok"
                }`}
              />
              {runStatus === "complete"
                ? "Evaluation complete"
                : runStatus === "error"
                  ? "Evaluation stopped"
                  : "Evaluating"}
              {runProgress.total > 0 && runStage !== "ranking" && (
                <span className="run-count">
                  {runProgress.checked}/{runProgress.total}
                </span>
              )}
            </div>
            <p className="run-current">{runPhase}</p>
            <div
              className={`run-track ${
                isEvaluating && runStage === "ranking" ? "indeterminate" : ""
              }`}
            >
              <div className="run-fill" style={{ width: `${progressPct}%` }} />
            </div>
            <div className="run-log" ref={logRef} onScroll={handleLogScroll}>
              {visibleLogs.map((log, index) => (
                <div className="run-line" key={`${index}-${log}`}>
                  <i className={index === visibleLogs.length - 1 && isEvaluating ? "active" : ""}>
                    {index === visibleLogs.length - 1 && isEvaluating ? "›" : "✓"}
                  </i>
                  <span>{log}</span>
                </div>
              ))}
            </div>
            {runStatus === "complete" && (
              <button type="button" className="btn btn-sm mt-4" onClick={onViewResults}>
                View assessments
              </button>
            )}
          </div>
        )}

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 56 }}>#</th>
                <th>GitHub repository</th>
                <th className="r" style={{ width: 80 }}>
                  <span className="sr-only">Remove</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p, idx) => (
                <tr key={p.id}>
                  <td className="num" style={{ color: "var(--text-3)" }}>
                    {idx + 1}
                  </td>
                  <td className="num" style={{ color: "var(--text)" }}>
                    {p.repoUrl}
                  </td>
                  <td className="r">
                    <button
                      type="button"
                      onClick={() => handleRemoveProject(p.id)}
                      className="icon-btn"
                      aria-label={`Remove ${p.repoUrl}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {projects.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    style={{ padding: "36px 14px", textAlign: "center", color: "var(--text-3)" }}
                  >
                    Upload a CSV of GitHub repository links to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
