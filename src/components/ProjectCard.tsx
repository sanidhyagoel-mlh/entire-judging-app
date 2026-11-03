"use client";

import React from "react";
import { EnrichedSubmission } from "@/lib/types";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCode,
  GitCommit,
  MessageSquare,
  ShieldAlert,
  Sparkles,
  Users,
  XCircle,
} from "lucide-react";

interface ProjectCardProps {
  submission: EnrichedSubmission;
  onSelect: (submission: EnrichedSubmission) => void;
}

export const LENS_LABELS: {
  key: string;
  label: string;
  short: string;
  group: "A" | "B";
}[] = [
  { key: "authenticity", label: "Authenticity", short: "Auth", group: "A" },
  {
    key: "prompting_skill",
    label: "Prompting Skill",
    short: "Prompt",
    group: "A",
  },
  {
    key: "effort_consistency",
    label: "Effort Consistency",
    short: "Effort",
    group: "A",
  },
  { key: "cli_awareness", label: "CLI Awareness", short: "CLI", group: "A" },
  { key: "integrity", label: "Integrity", short: "Integ", group: "A" },
  {
    key: "idea_plan_execution",
    label: "Idea / Plan / Exec",
    short: "Solution",
    group: "B",
  },
];

export function scoreColorClass(
  score: number | null | undefined,
  isIntegrity = false
): string {
  if (score === null || score === undefined)
    return "text-zinc-500 bg-zinc-800/60 border-zinc-700/50";
  if (isIntegrity && score <= 2.0) {
    return "text-red-300 bg-red-950/70 border-red-500/50";
  }
  if (score >= 4.2)
    return "text-emerald-300 bg-emerald-950/60 border-emerald-500/40";
  if (score >= 3.2) return "text-cyan-300 bg-cyan-950/60 border-cyan-500/40";
  if (score >= 2.0) return "text-amber-300 bg-amber-950/60 border-amber-500/40";
  return "text-rose-300 bg-rose-950/60 border-rose-500/40";
}

export function barColorClass(
  score: number | null | undefined,
  isIntegrity = false
): string {
  if (score === null || score === undefined) return "bg-zinc-700";
  if (isIntegrity && score <= 2.0) return "bg-red-500";
  if (score >= 4.2) return "bg-emerald-400";
  if (score >= 3.2) return "bg-cyan-400";
  if (score >= 2.0) return "bg-amber-400";
  return "bg-rose-500";
}

export function timelineBadge(category: string) {
  switch (category) {
    case "clean_start":
      return {
        label: "clean_start",
        className: "text-emerald-300 bg-emerald-950/60 border-emerald-500/30",
        icon: CheckCircle2,
      };
    case "mixed":
      return {
        label: "mixed timeline",
        className: "text-amber-300 bg-amber-950/60 border-amber-500/30",
        icon: Clock,
      };
    case "predates_event":
      return {
        label: "predates_event",
        className: "text-rose-300 bg-rose-950/60 border-rose-500/30",
        icon: XCircle,
      };
    case "no_session_history":
      return {
        label: "no_session_history",
        className: "text-rose-300 bg-rose-950/60 border-rose-500/30",
        icon: XCircle,
      };
    default:
      return {
        label: category || "insufficient_brain",
        className: "text-zinc-400 bg-zinc-900 border-zinc-700",
        icon: AlertTriangle,
      };
  }
}

export function ProjectCard({ submission, onSelect }: ProjectCardProps) {
  const m = submission.report.deterministic;
  const tBadge = timelineBadge(m.timeline_category);
  const TimelineIcon = tBadge.icon;

  return (
    <div
      onClick={() => onSelect(submission)}
      className={`group relative flex flex-col justify-between rounded-2xl border p-5 transition-all duration-200 cursor-pointer ${
        submission.integrityFlag
          ? "border-red-500/50 bg-gradient-to-b from-red-950/20 via-zinc-900/95 to-zinc-900/95 hover:border-red-400"
          : submission.status === "excluded"
          ? "border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 opacity-90"
          : "border-zinc-800/90 bg-zinc-900/90 hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-950/20"
      }`}
    >
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {submission.status === "ranked" ? (
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold text-sm border ${
                  submission.rank === 1
                    ? "bg-amber-500/20 border-amber-400/50 text-amber-300"
                    : submission.rank === 2
                    ? "bg-slate-400/20 border-slate-300/40 text-slate-200"
                    : submission.rank === 3
                    ? "bg-orange-500/20 border-orange-400/40 text-orange-300"
                    : "bg-zinc-800 border-zinc-700 text-zinc-300"
                }`}
              >
                #{submission.rank}
              </div>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-lg bg-zinc-800/90 border border-zinc-700 px-2.5 py-1 text-xs font-medium text-zinc-400">
                <XCircle className="h-3.5 w-3.5 text-rose-400" />
                EXCLUDED
              </span>
            )}

            <div className="min-w-0">
              <h3 className="font-semibold text-base text-zinc-100 truncate group-hover:text-indigo-300 transition-colors">
                {submission.projectName}
              </h3>
              <div className="flex items-center gap-2 text-xs text-zinc-400 truncate">
                <span className="font-mono truncate">{submission.ownerRepo}</span>
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div
              className={`inline-flex items-baseline gap-1 rounded-xl border px-3 py-1.5 font-mono ${scoreColorClass(
                submission.composite
              )}`}
            >
              <span className="text-lg font-bold">
                {submission.composite !== null
                  ? submission.composite.toFixed(2)
                  : "—"}
              </span>
              <span className="text-[10px] opacity-75">/5.0</span>
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5 uppercase tracking-wider">
              Combined
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          {submission.track && (
            <span className="inline-flex items-center rounded-md bg-indigo-950/60 border border-indigo-500/30 px-2 py-0.5 text-[11px] font-medium text-indigo-300">
              {submission.track}
            </span>
          )}
          {submission.teamName && (
            <span className="inline-flex items-center gap-1 rounded-md bg-zinc-800/80 border border-zinc-700/60 px-2 py-0.5 text-[11px] text-zinc-300">
              <Users className="h-3 w-3 text-zinc-400" />
              {submission.teamName}
            </span>
          )}
          <span
            className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-mono ${tBadge.className}`}
          >
            <TimelineIcon className="h-3 w-3" />
            {tBadge.label}
          </span>
          {m.primary_agent && (
            <span className="inline-flex items-center gap-1 rounded-md bg-violet-950/50 border border-violet-500/30 px-2 py-0.5 text-[11px] text-violet-300">
              <Sparkles className="h-3 w-3" />
              {m.primary_agent}
            </span>
          )}
        </div>

        {submission.integrityFlag && (
          <div className="mb-3 rounded-xl border border-red-500/40 bg-red-950/40 p-2.5 text-xs text-red-200">
            <div className="flex items-center gap-1.5 font-semibold text-red-300 mb-0.5">
              <ShieldAlert className="h-4 w-4 text-red-400 shrink-0" />
              Integrity Red Flag Raised
            </div>
            <p className="line-clamp-2 text-[11px] text-red-200/90 leading-relaxed">
              {submission.integrityReason}
            </p>
          </div>
        )}

        {submission.status === "excluded" && submission.exclusionReason && (
          <div className="mb-3 rounded-xl border border-amber-500/30 bg-amber-950/25 p-2.5 text-xs text-amber-200">
            <span className="font-semibold text-amber-300">Hard-Gated: </span>
            {submission.exclusionReason} ({m.timeline_reason})
          </div>
        )}


        <div className="grid grid-cols-2 gap-2.5 mb-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 p-2.5">
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-zinc-400 font-medium">Grade A · Process</span>
              <span className="font-mono font-semibold text-zinc-200">
                {submission.gradeProcess !== null
                  ? submission.gradeProcess.toFixed(2)
                  : "—"}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
              <div
                className={`h-full rounded-full ${barColorClass(
                  submission.gradeProcess
                )}`}
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(0, ((submission.gradeProcess ?? 0) / 5) * 100)
                  )}%`,
                }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-zinc-400 font-medium">Grade B · Solution</span>
              <span className="font-mono font-semibold text-zinc-200">
                {submission.gradeSolution !== null
                  ? submission.gradeSolution.toFixed(2)
                  : "—"}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
              <div
                className={`h-full rounded-full ${barColorClass(
                  submission.gradeSolution
                )}`}
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(0, ((submission.gradeSolution ?? 0) / 5) * 100)
                  )}%`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1.5 mb-3">
          {LENS_LABELS.map((item) => {
            const lens = submission.lensesByName[item.key];
            const val = lens?.score;
            const isInteg = item.key === "integrity";
            return (
              <div
                key={item.key}
                className="rounded-lg bg-zinc-950/40 border border-zinc-800/70 px-2.5 py-1.5"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-400 truncate">{item.short}</span>
                  <span
                    className={`font-mono font-semibold ${
                      isInteg && typeof val === "number" && val <= 2
                        ? "text-red-400"
                        : "text-zinc-200"
                    }`}
                  >
                    {typeof val === "number" ? val.toFixed(1) : "—"}
                  </span>
                </div>
                <div className="mt-1 h-1 w-full rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${barColorClass(
                      val,
                      isInteg
                    )}`}
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(0, ((val ?? 0) / 5) * 100)
                      )}%`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>


        {(submission.ideaScore !== null ||
          submission.planScore !== null ||
          submission.executionScore !== null) && (
          <div className="flex items-center justify-between rounded-lg bg-indigo-950/20 border border-indigo-500/20 px-3 py-1.5 mb-3 text-[11px]">
            <span className="text-indigo-300 font-medium">
              Solution Breakdown
            </span>
            <div className="flex items-center gap-3 font-mono text-zinc-300">
              <span>
                Idea{" "}
                <strong className="text-white">
                  {submission.ideaScore?.toFixed(1) ?? "—"}
                </strong>
              </span>
              <span>
                Plan{" "}
                <strong className="text-white">
                  {submission.planScore?.toFixed(1) ?? "—"}
                </strong>
              </span>
              <span>
                Exec{" "}
                <strong className="text-white">
                  {submission.executionScore?.toFixed(1) ?? "—"}
                </strong>
              </span>
            </div>
          </div>
        )}

        <p className="text-xs text-zinc-300/90 line-clamp-3 leading-relaxed mb-4">
          {submission.report.summary ||
            submission.description ||
            "No executive summary available."}
        </p>
      </div>

      <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
        <div className="flex items-center gap-3">
          <span
            className="inline-flex items-center gap-1"
            title="Exported Sessions"
          >
            <MessageSquare className="h-3.5 w-3.5 text-zinc-500" />
            {m.sessions} sess
          </span>
          <span
            className="inline-flex items-center gap-1"
            title="Covered / Total Commits"
          >
            <GitCommit className="h-3.5 w-3.5 text-zinc-500" />
            {m.covered_commits}/{m.total_commits} commits
          </span>
          <span
            className="inline-flex items-center gap-1"
            title="Files Touched"
          >
            <FileCode className="h-3.5 w-3.5 text-zinc-500" />
            {m.files_touched} files
          </span>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={submission.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-zinc-400 hover:text-white transition-colors"
            title="Open GitHub Repo"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <span className="text-indigo-400 font-medium group-hover:translate-x-0.5 transition-transform">
            Inspect →
          </span>
        </div>
      </div>
    </div>
  );
}
