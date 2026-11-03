"use client";

import React, { useRef, useState } from "react";
import { CSVProjectRow, RankReport } from "@/lib/types";
import { parseProjectsCSV } from "@/lib/csv";
import {
  Calendar,
  Download,
  FileSpreadsheet,
  FileUp,
  FolderGit2,
  Loader2,
  Play,
  Terminal,
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
  onRunEvaluation: () => void;
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
  onRunEvaluation,
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

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/80 p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300 mb-1">
              <Terminal className="h-3 w-3" /> Step 1 · Install
            </span>
            <h2 className="text-lg font-bold text-white">Entire judge</h2>
            <p className="text-xs text-zinc-400 mt-1">
              {localCliAvailable
                ? "Entire judge is ready."
                : "Installs the Entire CLI and the judge plugin on this computer."}
            </p>
          </div>
          <button
            type="button"
            onClick={handleInstall}
            disabled={installing || localCliAvailable}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {installing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Installing...
              </>
            ) : localCliAvailable ? (
              "Installed"
            ) : (
              "Install"
            )}
          </button>
        </div>
        {installError && (
          <p className="mt-3 text-xs text-rose-300 whitespace-pre-wrap">
            {installError}
          </p>
        )}
        {installLogs.length > 0 && (
          <pre className="mt-3 max-h-40 overflow-auto rounded-xl bg-zinc-950 border border-zinc-800 p-3 text-[11px] text-zinc-400 whitespace-pre-wrap">
            {installLogs.join("\n")}
          </pre>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 rounded-2xl border border-zinc-800/90 bg-zinc-900/80 p-6 shadow-xl">
          <div className="mb-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 px-2.5 py-0.5 text-[11px] font-medium text-indigo-300 mb-1">
              <Calendar className="h-3 w-3" /> Step 2 · Hackathon
            </span>
            <h2 className="text-lg font-bold text-white">Hackathon details</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="hackathon-name"
                className="block text-xs font-medium text-zinc-300 mb-1.5"
              >
                Hackathon name
              </label>
              <input
                id="hackathon-name"
                type="text"
                value={hackathonName}
                onChange={(e) => setHackathonName(e.target.value)}
                placeholder="Hackathon name"
                className="w-full rounded-xl border border-zinc-700/80 bg-zinc-950 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="hackathon-start"
                className="block text-xs font-medium text-zinc-300 mb-1.5"
              >
                Start date and time (UTC)
              </label>
              <input
                id="hackathon-start"
                type="datetime-local"
                value={toDatetimeLocal(hackathonStart)}
                onChange={(e) => handleDatetimeChange(e.target.value)}
                className="w-full rounded-xl border border-zinc-700/80 bg-zinc-950 px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 rounded-2xl border border-zinc-800/90 bg-zinc-900/80 p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300 mb-1">
                  <FileSpreadsheet className="h-3 w-3" /> Step 3 · Projects
                </span>
                <h2 className="text-lg font-bold text-white">
                  Upload projects CSV
                </h2>
              </div>

              <button
                type="button"
                onClick={handleDownloadTemplateCSV}
                className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800/80 px-2.5 py-1 text-xs text-zinc-300 hover:bg-zinc-700"
              >
                <Download className="h-3.5 w-3.5" /> Blank template
              </button>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                if (e.dataTransfer.files?.[0]) {
                  handleFileUpload(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => csvInputRef.current?.click()}
              className={`cursor-pointer rounded-2xl border-2 border-dashed p-5 text-center transition-all ${
                dragActive
                  ? "border-indigo-400 bg-indigo-950/30"
                  : "border-zinc-700/80 bg-zinc-950/60 hover:border-indigo-500/60"
              }`}
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
              <Upload className="mx-auto h-7 w-7 text-indigo-400 mb-2" />
              <div className="text-sm font-medium text-zinc-200">
                Drop a CSV here or click to browse
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                One column, repo_url. Each row is a public GitHub link. Private
                repositories are not judged.
              </p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-zinc-800/80 flex justify-end">
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
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700"
            >
              <FileUp className="h-3.5 w-3.5 text-cyan-400" />
              Import `board.json`
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/80 p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 px-2.5 py-0.5 text-[11px] font-medium text-cyan-300 mb-1">
              <FolderGit2 className="h-3 w-3" /> Projects ({projects.length})
            </span>
            <h3 className="text-base font-bold text-white">Repositories</h3>
          </div>

          <button
            type="button"
            disabled={!canRun}
            onClick={onRunEvaluation}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-950/50 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 transition-all"
          >
            {isEvaluating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Running Entire judge...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-current" />
                Run evaluation ({projects.length})
              </>
            )}
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/80 text-zinc-400">
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">GitHub repository</th>
                <th className="py-2.5 px-3 text-right">Remove</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {projects.map((p, idx) => (
                <tr key={p.id} className="hover:bg-zinc-800/40">
                  <td className="py-2 px-3 font-mono text-zinc-500">
                    {idx + 1}
                  </td>
                  <td className="py-2 px-3 font-mono text-zinc-300">
                    {p.repoUrl}
                  </td>
                  <td className="py-2 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemoveProject(p.id)}
                      className="text-zinc-500 hover:text-rose-400 p-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {projects.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-zinc-500 text-xs">
                    Upload a CSV of GitHub repository links.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
