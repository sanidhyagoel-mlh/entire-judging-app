"use client";

import React from "react";
import { EnrichedSubmission, SortDirection, SortField } from "@/lib/types";
import { RankPill, scoreTone, timelineBadge, toneText } from "./ProjectCard";
import { ArrowDown, ArrowUp, ExternalLink, ShieldAlert } from "lucide-react";

interface LeaderboardTableProps {
  submissions: EnrichedSubmission[];
  sortField: SortField;
  sortDir: SortDirection;
  onSortChange: (field: SortField) => void;
  onSelect: (submission: EnrichedSubmission) => void;
}

const fmt = (v: number | null | undefined, digits = 2) =>
  typeof v === "number" ? v.toFixed(digits) : "—";

export function LeaderboardTable({
  submissions,
  sortField,
  sortDir,
  onSortChange,
  onSelect,
}: LeaderboardTableProps) {
  const th = (label: string, field: SortField, right = false) => {
    const on = sortField === field;
    return (
      <th className={right ? "r" : ""}>
        <button
          onClick={() => onSortChange(field)}
          className={`th-btn ${on ? "on" : ""}`}
        >
          {label}
          {on && (sortDir === "asc" ? <ArrowUp /> : <ArrowDown />)}
        </button>
      </th>
    );
  };

  const score = (
    v: number | null | undefined,
    digits = 1,
    isIntegrity = false
  ) => (
    <td className={`r num ${toneText(scoreTone(v, isIntegrity))}`}>
      {fmt(v, digits)}
    </td>
  );

  return (
    <div className="card table-wrap">
      <table className="table">
        <thead>
          <tr>
            {th("Rank", "rank")}
            {th("Project", "project_name")}
            {th("Combined", "composite", true)}
            {th("Process", "grade_process", true)}
            {th("Solution", "grade_solution", true)}
            {th("Auth", "authenticity", true)}
            {th("Prompt", "prompting_skill", true)}
            {th("Effort", "effort_consistency", true)}
            {th("CLI", "cli_awareness", true)}
            {th("Integrity", "integrity", true)}
            {th("Sessions", "sessions", true)}
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {submissions.map((sub) => {
            const m = sub.report.deterministic;
            const tBadge = timelineBadge(m.timeline_category);
            return (
              <tr
                key={sub.submissionId}
                onClick={() => onSelect(sub)}
                className="row-click"
              >
                <td>
                  <RankPill submission={sub} />
                </td>
                <td>
                  <div className="flex items-center gap-1.5">
                    <span style={{ color: "var(--text)", fontWeight: 500 }}>
                      {sub.projectName}
                    </span>
                    <a
                      href={sub.repoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{ color: "var(--text-3)" }}
                      title="Open on GitHub"
                    >
                      <ExternalLink style={{ width: 12, height: 12 }} />
                    </a>
                  </div>
                  <div className="mono" style={{ fontSize: 11.5, color: "var(--text-3)" }}>
                    {sub.ownerRepo}
                    {sub.teamName ? ` · ${sub.teamName}` : ""}
                  </div>
                </td>
                <td
                  className={`r num ${toneText(
                    sub.status === "excluded" ? "none" : scoreTone(sub.composite)
                  )}`}
                  style={{ fontWeight: 600, fontSize: 14 }}
                >
                  {fmt(sub.composite)}
                </td>
                {score(sub.gradeProcess, 2)}
                {score(sub.gradeSolution, 2)}
                {score(sub.lensesByName["authenticity"]?.score)}
                {score(sub.lensesByName["prompting_skill"]?.score)}
                {score(sub.lensesByName["effort_consistency"]?.score)}
                {score(sub.lensesByName["cli_awareness"]?.score)}
                {score(sub.lensesByName["integrity"]?.score, 1, true)}
                <td className="r num">{m.sessions}</td>
                <td>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {sub.integrityFlag && (
                      <span className="badge badge-bad">
                        <ShieldAlert /> Flag
                      </span>
                    )}
                    <span className={`badge ${tBadge.className}`}>{tBadge.label}</span>
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
