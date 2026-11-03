"use client";

import React, { useState } from "react";
import { EnrichedSubmission } from "@/lib/types";
import {
  barColorClass,
  LENS_LABELS,
  scoreColorClass,
  timelineBadge,
} from "./ProjectCard";
import {
  Check,
  Copy,
  Cpu,
  ExternalLink,
  FileCode,
  GitCommit,
  Globe,
  Layers,
  MessageSquare,
  ShieldAlert,
  Sparkles,
  Terminal,
  Users,
  X,
  XCircle,
} from "lucide-react";

interface ProjectDetailModalProps {
  submission: EnrichedSubmission | null;
  onClose: () => void;
  watchCommand: string;
}

export function ProjectDetailModal({
  submission,
  onClose,
  watchCommand,
}: ProjectDetailModalProps) {
  const [copiedAnchor, setCopiedAnchor] = useState<string | null>(null);

  if (!submission) return null;

  const m = submission.report.deterministic;
  const tBadge = timelineBadge(m.timeline_category);
  const TimelineIcon = tBadge.icon;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAnchor(text);
    setTimeout(() => setCopiedAnchor(null), 1800);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative h-full w-full max-w-3xl overflow-y-auto border-l border-zinc-800 bg-zinc-950 p-6 text-zinc-100 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 -mx-6 -mt-6 mb-6 flex items-center justify-between border-b border-zinc-800/90 bg-zinc-950/95 px-6 py-4 backdrop-blur">
          <div className="flex items-center gap-3 min-w-0">
            {submission.status === "ranked" ? (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 border border-indigo-500/40 font-mono text-base font-bold text-indigo-300">
                #{submission.rank}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-xl bg-rose-950/60 border border-rose-500/40 px-3 py-1.5 text-xs font-semibold text-rose-300">
                <XCircle className="h-4 w-4" />
                EXCLUDED
              </span>
            )}
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-white truncate">
                {submission.projectName}
              </h2>
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <span className="font-mono">{submission.submissionId}</span>
                <a
                  href={submission.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300"
                >
                  GitHub <ExternalLink className="h-3 w-3" />
                </a>
                {submission.demoUrl && (
                  <a
                    href={submission.demoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300"
                  >
                    <Globe className="h-3 w-3" /> Live Demo
                  </a>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-zinc-400 hover:border-zinc-700 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div
            className={`rounded-2xl border p-4 ${scoreColorClass(
              submission.composite
            )}`}
          >
            <div className="text-xs uppercase tracking-wider opacity-80">
              Combined Score
            </div>
            <div className="mt-1 flex items-baseline gap-1 font-mono">
              <span className="text-3xl font-bold">
                {submission.composite !== null
                  ? submission.composite.toFixed(2)
                  : "—"}
              </span>
              <span className="text-xs opacity-70">/ 5.00</span>
            </div>
            <div className="mt-1 text-[11px] opacity-80">
              Equal-weighted mean of Grade A & B
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
            <div className="text-xs uppercase tracking-wider text-zinc-400">
              Grade A · Process
            </div>
            <div className="mt-1 flex items-baseline gap-1 font-mono text-white">
              <span className="text-2xl font-bold">
                {submission.gradeProcess !== null
                  ? submission.gradeProcess.toFixed(2)
                  : "—"}
              </span>
              <span className="text-xs text-zinc-500">/ 5.00</span>
            </div>
            <div className="mt-2 h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
              <div
                className={`h-full rounded-full ${barColorClass(
                  submission.gradeProcess
                )}`}
                style={{
                  width: `${Math.min(
                    100,
                    ((submission.gradeProcess ?? 0) / 5) * 100
                  )}%`,
                }}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
            <div className="text-xs uppercase tracking-wider text-zinc-400">
              Grade B · Solution
            </div>
            <div className="mt-1 flex items-baseline gap-1 font-mono text-white">
              <span className="text-2xl font-bold">
                {submission.gradeSolution !== null
                  ? submission.gradeSolution.toFixed(2)
                  : "—"}
              </span>
              <span className="text-xs text-zinc-500">/ 5.00</span>
            </div>
            <div className="mt-2 h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
              <div
                className={`h-full rounded-full ${barColorClass(
                  submission.gradeSolution
                )}`}
                style={{
                  width: `${Math.min(
                    100,
                    ((submission.gradeSolution ?? 0) / 5) * 100
                  )}%`,
                }}
              />
            </div>
          </div>
        </div>

        {submission.integrityFlag && (
          <div className="mb-6 rounded-2xl border border-red-500/50 bg-red-950/35 p-4 text-sm text-red-100">
            <div className="flex items-center gap-2 font-semibold text-red-300 mb-1">
              <ShieldAlert className="h-5 w-5 text-red-400" />
              Integrity Red Flag — Assistant Warning Unaddressed
            </div>
            <p className="text-xs text-red-200/90 leading-relaxed">
              {submission.integrityReason}
            </p>
          </div>
        )}

        {submission.status === "excluded" && submission.exclusionReason && (
          <div className="mb-6 rounded-2xl border border-amber-500/40 bg-amber-950/30 p-4 text-sm text-amber-100">
            <div className="font-semibold text-amber-300 mb-1">
              Excluded from Ordered Ranking: {submission.exclusionReason}
            </div>
            <p className="text-xs text-amber-200/90">
              Timeline Category:{" "}
              <code className="font-mono">{m.timeline_category}</code> —{" "}
              {m.timeline_reason}
            </p>
          </div>
        )}


        <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-400" />
              AI Judge Executive Summary
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              {submission.teamName && (
                <span className="inline-flex items-center gap-1 rounded-md bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-300">
                  <Users className="h-3.5 w-3.5 text-zinc-400" />
                  {submission.teamName}
                </span>
              )}
              {submission.track && (
                <span className="rounded-md bg-indigo-950/80 border border-indigo-500/30 px-2.5 py-0.5 text-xs text-indigo-300">
                  {submission.track}
                </span>
              )}
              <span
                className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-0.5 text-xs font-mono ${tBadge.className}`}
              >
                <TimelineIcon className="h-3.5 w-3.5" />
                {tBadge.label}
              </span>
            </div>
          </div>

          <p className="text-sm text-zinc-200 leading-relaxed">
            {submission.report.summary ||
              submission.description ||
              "No executive summary available."}
          </p>

          {submission.members && (
            <div className="mt-3 pt-3 border-t border-zinc-800/80 text-xs text-zinc-400">
              <span className="font-medium text-zinc-300">Team Members: </span>
              {submission.members}
            </div>
          )}
        </div>

        </div>


        <div className="mb-6">
          <h3 className="text-sm font-semibold text-zinc-200 mb-3 flex items-center gap-2">
            <Layers className="h-4 w-4 text-indigo-400" />
            Judge Lenses & Evidence Anchors
          </h3>

          <div className="space-y-3">
            {LENS_LABELS.map((item) => {
              const lens = submission.lensesByName[item.key];
              if (!lens) return null;
              const isInteg = item.key === "integrity";
              return (
                <div
                  key={item.key}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-[10px] font-mono text-zinc-400">
                        Grade {item.group}
                      </span>
                      <span className="font-semibold text-sm text-white">
                        {item.label}
                      </span>
                      <span className="font-mono text-xs text-zinc-500">
                        ({item.key})
                      </span>
                    </div>

                    <div
                      className={`rounded-lg border px-2.5 py-0.5 font-mono text-xs font-bold ${scoreColorClass(
                        lens.score,
                        isInteg
                      )}`}
                    >
                      {typeof lens.score === "number"
                        ? `${lens.score.toFixed(2)} / 5.0`
                        : "Unscored"}
                    </div>
                  </div>

                  {lens.components && lens.components.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2.5">
                      {lens.components.map((comp) => (
                        <div
                          key={comp.name}
                          className="rounded-lg bg-indigo-950/40 border border-indigo-500/30 px-2.5 py-1 text-xs font-mono text-indigo-200"
                        >
                          {comp.name}:{" "}
                          <strong className="text-white">
                            {comp.score.toFixed(1)}
                          </strong>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="text-xs font-medium text-zinc-200 mb-2">
                    {lens.verdict}
                  </p>

                  {lens.bullets && lens.bullets.length > 0 && (
                    <ul className="space-y-1.5 text-xs text-zinc-300/90 list-disc list-inside mb-3">
                      {lens.bullets.map((b, i) => (
                        <li key={i} className="leading-relaxed">
                          {b}
                        </li>
                      ))}
                    </ul>
                  )}

                  {lens.evidence && lens.evidence.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-zinc-800/70">
                      <span className="text-[10px] uppercase tracking-wider text-zinc-500 mr-1">
                        Evidence:
                      </span>
                      {lens.evidence.map((anchor) => (
                        <button
                          key={anchor}
                          onClick={() => handleCopy(anchor)}
                          className="inline-flex items-center gap-1 rounded-md bg-zinc-950 border border-zinc-800 px-2 py-0.5 font-mono text-[11px] text-zinc-300 hover:border-indigo-500/40 hover:text-indigo-300"
                        >
                          {copiedAnchor === anchor ? (
                            <Check className="h-3 w-3 text-emerald-400" />
                          ) : (
                            <Copy className="h-3 w-3 text-zinc-500" />
                          )}
                          {anchor}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>


        {/* Deterministic Telemetry & Semantic Graph */}
        <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
          <h3 className="text-sm font-semibold text-zinc-200 mb-3 flex items-center gap-2">
            <Cpu className="h-4 w-4 text-cyan-400" />
            Deterministic Brain & Semantic Graph Telemetry
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="rounded-xl bg-zinc-950/60 border border-zinc-800/80 p-3">
              <div className="text-zinc-500">Sessions / Turns</div>
              <div className="mt-1 font-mono text-base font-bold text-white">
                {m.sessions} / {m.turns}
              </div>
              <div className="text-[11px] text-zinc-400">
                {m.exported_checkpoints} checkpoints
              </div>
            </div>

            <div className="rounded-xl bg-zinc-950/60 border border-zinc-800/80 p-3">
              <div className="text-zinc-500">Time on Task</div>
              <div className="mt-1 font-mono text-base font-bold text-white">
                {Math.round(m.time_on_task_minutes)}m
              </div>
              <div className="text-[11px] text-zinc-400">
                {(m.time_on_task_minutes / 60).toFixed(1)} hrs span
              </div>
            </div>

            <div className="rounded-xl bg-zinc-950/60 border border-zinc-800/80 p-3">
              <div className="text-zinc-500">Commit Coverage</div>
              <div className="mt-1 font-mono text-base font-bold text-white">
                {m.covered_commits} / {m.total_commits}
              </div>
              <div className="text-[11px] text-zinc-400">
                {m.pre_session_commits} pre-session · {m.merge_commits} merges
              </div>
            </div>

            <div className="rounded-xl bg-zinc-950/60 border border-zinc-800/80 p-3">
              <div className="text-zinc-500">Token Volume</div>
              <div className="mt-1 font-mono text-base font-bold text-white">
                {((m.input_tokens + m.output_tokens) / 1000).toFixed(1)}k
              </div>
              <div className="text-[11px] text-zinc-400">
                {m.input_tokens} in · {m.output_tokens.toLocaleString()} out
              </div>
            </div>
          </div>

          {(m.semantic_symbols || m.semantic_files) && (
            <div className="mt-3 grid grid-cols-3 gap-3 rounded-xl bg-indigo-950/20 border border-indigo-500/20 p-3 text-xs">
              <div>
                <span className="text-zinc-400">Semantic Files: </span>
                <strong className="font-mono text-white">
                  {m.semantic_files?.toLocaleString() ?? 0}
                </strong>
              </div>
              <div>
                <span className="text-zinc-400">Semantic Symbols: </span>
                <strong className="font-mono text-white">
                  {m.semantic_symbols?.toLocaleString() ?? 0}
                </strong>
              </div>
              <div>
                <span className="text-zinc-400">Relations: </span>
                <strong className="font-mono text-white">
                  {m.semantic_relations?.toLocaleString() ?? 0}
                </strong>
              </div>
            </div>
          )}
        </div>

        {/* Interactive TUI Command */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <Terminal className="h-4 w-4 text-emerald-400" />
              Interactive Terminal TUI Command
            </span>
            <button
              onClick={() => handleCopy(watchCommand)}
              className="inline-flex items-center gap-1 rounded-lg bg-zinc-800 px-2.5 py-1 text-xs text-zinc-200 hover:bg-zinc-700"
            >
              {copiedAnchor === watchCommand ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" /> Copy Command
                </>
              )}
            </button>
          </div>
          <code className="block rounded-xl bg-zinc-950 border border-zinc-800 p-3 font-mono text-xs text-emerald-300 overflow-x-auto">
            {watchCommand}
          </code>
        </div>
      </div>
    </div>
  );
}
