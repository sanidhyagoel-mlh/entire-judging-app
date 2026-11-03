"use client";

import React from "react";
import { EnrichedSubmission, SortDirection, SortField } from "@/lib/types";
import { scoreColorClass, timelineBadge } from "./ProjectCard";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ExternalLink,
  ShieldAlert,
  XCircle,
} from "lucide-react";

interface LeaderboardTableProps {
  submissions: EnrichedSubmission[];
  sortField: SortField;
  sortDir: SortDirection;
  onSortChange: (field: SortField) => void;
  onSelect: (submission: EnrichedSubmission) => void;
}

export function LeaderboardTable({
  submissions,
  sortField,
  sortDir,
  onSortChange,
  onSelect,
}: LeaderboardTableProps) {
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-zinc-600" />;
    }
    return sortDir === "asc" ? (
      <ArrowUp className="h-3.5 w-3.5 text-indigo-400" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-indigo-400" />
    );
  };

  const thButton = (label: string, field: SortField, align = "left") => (
    <button
      onClick={() => onSortChange(field)}
      className={`inline-flex items-center gap-1 font-semibold text-xs uppercase tracking-wider text-zinc-400 hover:text-white ${
        align === "right" ? "justify-end w-full" : ""
      }`}
    >
      <span>{label}</span>
      {renderSortIcon(field)}
    </button>
  );

  const fmt = (v: number | null | undefined, digits = 2) =>
    typeof v === "number" ? v.toFixed(digits) : "—";

  return (
    <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-900/80 shadow-xl">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-950/80">
            <th className="py-3.5 px-4">{thButton("Rank", "rank")}</th>
            <th className="py-3.5 px-4">
              {thButton("Project / Repo", "project_name")}
            </th>
            <th className="py-3.5 px-3 text-right">
              {thButton("Combined", "composite", "right")}
            </th>
            <th className="py-3.5 px-3 text-right">
              {thButton("Grade A (Proc)", "grade_process", "right")}
            </th>
            <th className="py-3.5 px-3 text-right">
              {thButton("Grade B (Sol)", "grade_solution", "right")}
            </th>
            <th className="py-3.5 px-2.5 text-right">
              {thButton("Auth", "authenticity", "right")}
            </th>
            <th className="py-3.5 px-2.5 text-right">
              {thButton("Prompt", "prompting_skill", "right")}
            </th>
            <th className="py-3.5 px-2.5 text-right">
              {thButton("Effort", "effort_consistency", "right")}
            </th>
            <th className="py-3.5 px-2.5 text-right">
              {thButton("CLI", "cli_awareness", "right")}
            </th>
            <th className="py-3.5 px-2.5 text-right">
              {thButton("Integ", "integrity", "right")}
            </th>
            <th className="py-3.5 px-2.5 text-right">
              {thButton("Outcome", "idea_plan_execution", "right")}
            </th>
            <th className="py-3.5 px-3 text-right">
              {thButton("Sessions", "sessions", "right")}
            </th>
            <th className="py-3.5 px-4 text-center">Flags / Timeline</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/70">
          {submissions.map((sub) => {
            const m = sub.report.deterministic;
            const tBadge = timelineBadge(m.timeline_category);
            return (
              <tr
                key={sub.submissionId}
                onClick={() => onSelect(sub)}
                className={`cursor-pointer transition-colors ${
                  sub.integrityFlag
                    ? "bg-red-950/15 hover:bg-red-950/30"
                    : "hover:bg-zinc-800/60"
                }`}
              >
                <td className="py-3.5 px-4 font-mono">
                  {sub.status === "ranked" ? (
                    <span
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-lg font-bold border ${
                        sub.rank === 1
                          ? "bg-amber-500/20 border-amber-400/50 text-amber-300"
                          : sub.rank === 2
                          ? "bg-slate-400/20 border-slate-300/40 text-slate-200"
                          : sub.rank === 3
                          ? "bg-orange-500/20 border-orange-400/40 text-orange-300"
                          : "bg-zinc-800 border-zinc-700 text-zinc-300"
                      }`}
                    >
                      #{sub.rank}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-rose-400 font-semibold">
                      EXCL
                    </span>
                  )}
                </td>

                <td className="py-3.5 px-4">
                  <div className="font-semibold text-sm text-zinc-100 flex items-center gap-1.5">
                    <span>{sub.projectName}</span>
                    <a
                      href={sub.repoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-zinc-500 hover:text-indigo-400"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <div className="text-[11px] font-mono text-zinc-400">
                    {sub.submissionId}
                    {sub.teamName ? ` · ${sub.teamName}` : ""}
                  </div>
                </td>

                <td className="py-3.5 px-3 text-right font-mono">
                  <span
                    className={`inline-block rounded-lg border px-2.5 py-1 font-bold ${scoreColorClass(
                      sub.composite
                    )}`}
                  >
                    {fmt(sub.composite)}
                  </span>
                </td>

                <td className="py-3.5 px-3 text-right font-mono font-semibold text-zinc-200">
                  {fmt(sub.gradeProcess)}
                </td>

                <td className="py-3.5 px-3 text-right font-mono font-semibold text-zinc-200">
                  {fmt(sub.gradeSolution)}
                </td>

                <td className="py-3.5 px-2.5 text-right font-mono text-zinc-300">
                  {fmt(sub.lensesByName["authenticity"]?.score, 1)}
                </td>
                <td className="py-3.5 px-2.5 text-right font-mono text-zinc-300">
                  {fmt(sub.lensesByName["prompting_skill"]?.score, 1)}
                </td>
                <td className="py-3.5 px-2.5 text-right font-mono text-zinc-300">
                  {fmt(sub.lensesByName["effort_consistency"]?.score, 1)}
                </td>
                <td className="py-3.5 px-2.5 text-right font-mono text-zinc-300">
                  {fmt(sub.lensesByName["cli_awareness"]?.score, 1)}
                </td>
                <td
                  className={`py-3.5 px-2.5 text-right font-mono font-semibold ${
                    sub.integrityFlag ? "text-red-400" : "text-zinc-300"
                  }`}
                >
                  {fmt(sub.lensesByName["integrity"]?.score, 1)}
                </td>
                <td className="py-3.5 px-2.5 text-right font-mono text-zinc-300">
                  {fmt(sub.lensesByName["idea_plan_execution"]?.score, 1)}
                </td>

                <td className="py-3.5 px-3 text-right font-mono text-zinc-300">
                  {m.sessions}
                </td>

                <td className="py-3.5 px-4">
                  <div className="flex flex-wrap items-center justify-center gap-1.5">
                    {sub.integrityFlag && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-red-950/80 border border-red-500/50 px-2 py-0.5 text-[10px] font-semibold text-red-300">
                        <ShieldAlert className="h-3 w-3" /> RED FLAG
                      </span>
                    )}
                    {sub.status === "excluded" && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-950/60 border border-amber-500/40 px-2 py-0.5 text-[10px] text-amber-300">
                        <XCircle className="h-3 w-3" /> {sub.exclusionReason}
                      </span>
                    )}
                    <span
                      className={`rounded-md border px-2 py-0.5 font-mono text-[10px] ${tBadge.className}`}
                    >
                      {tBadge.label}
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
