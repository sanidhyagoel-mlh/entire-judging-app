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
  { key: "authenticity", label: "Authenticity", short: "Authenticity", group: "A" },
  { key: "prompting_skill", label: "Prompting Skill", short: "Prompting", group: "A" },
  { key: "effort_consistency", label: "Effort Consistency", short: "Effort", group: "A" },
  { key: "cli_awareness", label: "CLI Awareness", short: "CLI", group: "A" },
  { key: "integrity", label: "Integrity", short: "Integrity", group: "A" },
  { key: "idea_plan_execution", label: "Idea / Plan / Execution", short: "Solution", group: "B" },
];

export type ScoreTone = "high" | "mid" | "low" | "bad" | "none";

export function scoreTone(
  score: number | null | undefined,
  isIntegrity = false
): ScoreTone {
  if (score === null || score === undefined) return "none";
  if (isIntegrity && score <= 2) return "bad";
  if (score >= 4.2) return "high";
  if (score >= 3.2) return "mid";
  if (score >= 2) return "low";
  return "bad";
}

export const toneText = (tone: ScoreTone) => `tone-${tone}`;

const FILL: Record<ScoreTone, string> = {
  high: "fill-high",
  mid: "",
  low: "fill-low",
  bad: "fill-bad",
  none: "fill-none",
};

export function Meter({
  score,
  isIntegrity = false,
  large = false,
}: {
  score: number | null | undefined;
  isIntegrity?: boolean;
  large?: boolean;
}) {
  const pct = Math.min(100, Math.max(0, ((score ?? 0) / 5) * 100));
  return (
    <div className={`meter ${large ? "lg" : ""}`}>
      <span
        className={FILL[scoreTone(score, isIntegrity)]}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function timelineBadge(category: string) {
  switch (category) {
    case "clean_start":
      return { label: "Clean start", className: "badge-good", icon: CheckCircle2 };
    case "mixed":
      return { label: "Mixed timeline", className: "badge-warn", icon: Clock };
    case "predates_event":
      return { label: "Predates event", className: "badge-bad", icon: XCircle };
    case "no_session_history":
      return { label: "No session history", className: "badge-bad", icon: XCircle };
    default:
      return {
        label: category ? category.replace(/_/g, " ") : "Insufficient data",
        className: "",
        icon: AlertTriangle,
      };
  }
}

export function RankPill({ submission }: { submission: EnrichedSubmission }) {
  if (submission.status !== "ranked") {
    return <span className="rank excl">EXCL</span>;
  }
  return (
    <span className={`rank ${(submission.rank ?? 99) <= 3 ? "top" : ""}`}>
      {submission.rank}
    </span>
  );
}

const fmt = (v: number | null | undefined, digits = 2) =>
  typeof v === "number" ? v.toFixed(digits) : "—";

export function ProjectCard({ submission, onSelect }: ProjectCardProps) {
  const m = submission.report.deterministic;
  const tBadge = timelineBadge(m.timeline_category);
  const TimelineIcon = tBadge.icon;
  const compositeTone: ScoreTone =
    submission.status === "excluded" ? "none" : scoreTone(submission.composite);

  return (
    <article
      onClick={() => onSelect(submission)}
      className={`pcard ${submission.integrityFlag ? "flagged" : ""} ${
        submission.status === "excluded" ? "excluded" : ""
      }`}
    >
      <div className="pcard-body">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <RankPill submission={submission} />
            <div className="min-w-0">
              <h3 className="m-0 text-[14.5px] font-semibold truncate">
                {submission.projectName}
              </h3>
              <div className="mono text-[11.5px] truncate" style={{ color: "var(--text-3)" }}>
                {submission.ownerRepo}
              </div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className={`score-big ${toneText(compositeTone)}`}>
              {fmt(submission.composite)}
              <small>/5</small>
            </div>
            <div className="eyebrow mt-1">Combined</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 mt-3.5">
          <span className={`badge ${tBadge.className}`}>
            <TimelineIcon /> {tBadge.label}
          </span>
          {submission.track && <span className="badge">{submission.track}</span>}
          {m.primary_agent && <span className="badge mono">{m.primary_agent}</span>}
          {submission.integrityFlag && (
            <span className="badge badge-bad">
              <ShieldAlert /> Integrity flag
            </span>
          )}
        </div>

        {submission.status === "excluded" && submission.exclusionReason && (
          <p className="mt-3 mb-0 text-[12px]" style={{ color: "var(--text-2)" }}>
            <span style={{ color: "var(--warn)" }}>Excluded · </span>
            {submission.exclusionReason}
          </p>
        )}

        <div className="grid grid-cols-2 gap-4 mt-4">
          {[
            { label: "Process", value: submission.gradeProcess },
            { label: "Solution", value: submission.gradeSolution },
          ].map((g) => (
            <div key={g.label}>
              <div className="grade-row">
                <span>{g.label}</span>
                <b className={`num ${toneText(scoreTone(g.value))}`}>{fmt(g.value)}</b>
              </div>
              <Meter score={g.value} large />
            </div>
          ))}
        </div>

        <div className="lens-grid mt-4 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
          {LENS_LABELS.map((item) => {
            const val = submission.lensesByName[item.key]?.score;
            const isInteg = item.key === "integrity";
            return (
              <div key={item.key} className="lens-cell">
                <div className="lens-top">
                  <span className="truncate">{item.short}</span>
                  <b>{fmt(val, 1)}</b>
                </div>
                <Meter score={val} isIntegrity={isInteg} />
              </div>
            );
          })}
        </div>

        <p
          className="clamp3 mt-4 mb-0 text-[12.5px] leading-relaxed"
          style={{ color: "var(--text-2)" }}
        >
          {submission.report.summary ||
            submission.description ||
            "No executive summary available."}
        </p>
      </div>

      <div className="pcard-foot">
        <div className="flex items-center gap-4">
          <span className="item" title="Exported sessions">
            <MessageSquare /> {m.sessions}
          </span>
          <span className="item" title="Covered / total commits">
            <GitCommit /> {m.covered_commits}/{m.total_commits}
          </span>
          <span className="item" title="Files touched">
            <FileCode /> {m.files_touched}
          </span>
        </div>
        <a
          href={submission.repoUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 hover:text-white"
          title="Open on GitHub"
        >
          GitHub <ExternalLink style={{ width: 12, height: 12 }} />
        </a>
      </div>
    </article>
  );
}
