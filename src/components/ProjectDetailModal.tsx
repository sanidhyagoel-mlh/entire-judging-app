"use client";

import React, { useEffect, useState } from "react";
import { EnrichedSubmission } from "@/lib/types";
import {
  LENS_LABELS,
  Meter,
  RankPill,
  scoreTone,
  timelineBadge,
  toneText,
} from "./ProjectCard";
import {
  Check,
  Copy,
  ExternalLink,
  Globe,
  ShieldAlert,
  Terminal,
  X,
} from "lucide-react";

interface ProjectDetailModalProps {
  submission: EnrichedSubmission | null;
  onClose: () => void;
  watchCommand: string;
}

const fmt = (v: number | null | undefined, digits = 2) =>
  typeof v === "number" ? v.toFixed(digits) : "—";

export function ProjectDetailModal({
  submission,
  onClose,
  watchCommand,
}: ProjectDetailModalProps) {
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!submission) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [submission, onClose]);

  if (!submission) return null;

  const m = submission.report.deterministic;
  const tBadge = timelineBadge(m.timeline_category);
  const TimelineIcon = tBadge.icon;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 1600);
  };

  return (
    <div className="overlay" onClick={onClose}>
      <aside
        className="drawer"
        role="dialog"
        aria-label={submission.projectName}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="drawer-head">
          <div className="flex items-center gap-3 min-w-0">
            <RankPill submission={submission} />
            <div className="min-w-0">
              <h2 className="m-0 text-[16px] font-semibold truncate">
                {submission.projectName}
              </h2>
              <div className="flex items-center gap-3 text-[12px]" style={{ color: "var(--text-3)" }}>
                <span className="mono truncate">{submission.ownerRepo}</span>
                <a
                  href={submission.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-white"
                >
                  GitHub <ExternalLink style={{ width: 11, height: 11 }} />
                </a>
                {submission.demoUrl && (
                  <a
                    href={submission.demoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 hover:text-white"
                  >
                    <Globe style={{ width: 11, height: 11 }} /> Demo
                  </a>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="icon-btn" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="drawer-body">
          <div className="stats" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
            {[
              { label: "Combined", value: submission.composite, hint: "Mean of Grade A and B" },
              { label: "Grade A · Process", value: submission.gradeProcess },
              { label: "Grade B · Solution", value: submission.gradeSolution },
            ].map((s) => (
              <div className="stat" key={s.label}>
                <div className="stat-label">{s.label}</div>
                <div className={`stat-value ${toneText(scoreTone(s.value))}`}>
                  {fmt(s.value)}
                  <small>/ 5</small>
                </div>
                <div className="mt-3">
                  <Meter score={s.value} large />
                </div>
              </div>
            ))}
          </div>

          {submission.integrityFlag && (
            <div className="alert alert-bad">
              <ShieldAlert />
              <div>
                <div className="alert-title">Integrity red flag</div>
                <p>{submission.integrityReason}</p>
              </div>
            </div>
          )}

          {submission.status === "excluded" && submission.exclusionReason && (
            <div className="alert alert-warn">
              <ShieldAlert />
              <div>
                <div className="alert-title">
                  Excluded from ranking: {submission.exclusionReason}
                </div>
                <p>
                  {m.timeline_category} — {m.timeline_reason}
                </p>
              </div>
            </div>
          )}

          <section className="card">
            <div className="card-head">
              <h3 className="card-title">Summary</h3>
              <div className="flex flex-wrap items-center gap-1.5">
                {submission.teamName && <span className="badge">{submission.teamName}</span>}
                {submission.track && <span className="badge">{submission.track}</span>}
                <span className={`badge ${tBadge.className}`}>
                  <TimelineIcon /> {tBadge.label}
                </span>
              </div>
            </div>
            <div className="card-body">
              <p className="m-0 text-[13.5px] leading-relaxed" style={{ color: "var(--text-2)" }}>
                {submission.report.summary ||
                  submission.description ||
                  "No executive summary available."}
              </p>
              {submission.members && (
                <p className="mt-3 mb-0 text-[12.5px]" style={{ color: "var(--text-3)" }}>
                  Team: <span style={{ color: "var(--text-2)" }}>{submission.members}</span>
                </p>
              )}
            </div>
          </section>

          <section>
            <h3 className="eyebrow mb-3">Lenses and evidence</h3>
            <div className="flex flex-col gap-3">
              {LENS_LABELS.map((item) => {
                const lens = submission.lensesByName[item.key];
                if (!lens) return null;
                const isInteg = item.key === "integrity";
                return (
                  <div key={item.key} className="card">
                    <div className="card-body" style={{ padding: 16 }}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[13.5px]">{item.label}</span>
                          <span className="badge mono">Grade {item.group}</span>
                        </div>
                        <span
                          className={`num font-semibold text-[14px] ${toneText(
                            scoreTone(lens.score, isInteg)
                          )}`}
                        >
                          {typeof lens.score === "number"
                            ? `${lens.score.toFixed(2)} / 5`
                            : "Unscored"}
                        </span>
                      </div>
                      <div className="mt-2.5">
                        <Meter score={lens.score} isIntegrity={isInteg} large />
                      </div>

                      {lens.components && lens.components.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {lens.components.map((comp) => (
                            <span key={comp.name} className="badge mono">
                              {comp.name} · {comp.score.toFixed(1)}
                            </span>
                          ))}
                        </div>
                      )}

                      {lens.verdict && (
                        <p className="mt-3 mb-0 text-[13px] font-medium">{lens.verdict}</p>
                      )}

                      {lens.bullets && lens.bullets.length > 0 && (
                        <ul
                          className="mt-2 mb-0 pl-4 text-[12.5px] leading-relaxed flex flex-col gap-1"
                          style={{ color: "var(--text-2)", listStyle: "disc" }}
                        >
                          {lens.bullets.map((b, i) => (
                            <li key={i}>{b}</li>
                          ))}
                        </ul>
                      )}

                      {lens.evidence && lens.evidence.length > 0 && (
                        <div
                          className="flex flex-wrap items-center gap-1.5 mt-3 pt-3"
                          style={{ borderTop: "1px solid var(--border)" }}
                        >
                          <span className="eyebrow mr-1">Evidence</span>
                          {lens.evidence.map((anchor) => (
                            <button
                              key={anchor}
                              onClick={() => handleCopy(anchor)}
                              className="chip-btn"
                            >
                              {copied === anchor ? <Check /> : <Copy />}
                              {anchor}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <h3 className="card-title">Telemetry</h3>
            </div>
            <div className="card-body">
              <div className="kv-grid">
                <div className="kv">
                  <div className="k">Sessions / turns</div>
                  <div className="v">{m.sessions} / {m.turns}</div>
                  <div className="s">{m.exported_checkpoints} checkpoints</div>
                </div>
                <div className="kv">
                  <div className="k">Time on task</div>
                  <div className="v">{Math.round(m.time_on_task_minutes)}m</div>
                  <div className="s">{(m.time_on_task_minutes / 60).toFixed(1)} hours</div>
                </div>
                <div className="kv">
                  <div className="k">Commit coverage</div>
                  <div className="v">{m.covered_commits} / {m.total_commits}</div>
                  <div className="s">{m.pre_session_commits} pre-session · {m.merge_commits} merges</div>
                </div>
                <div className="kv">
                  <div className="k">Tokens</div>
                  <div className="v">{((m.input_tokens + m.output_tokens) / 1000).toFixed(1)}k</div>
                  <div className="s">
                    {m.input_tokens.toLocaleString()} in · {m.output_tokens.toLocaleString()} out
                  </div>
                </div>
              </div>
              {(m.semantic_symbols || m.semantic_files) && (
                <div className="kv-grid mt-2.5" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
                  <div className="kv">
                    <div className="k">Semantic files</div>
                    <div className="v">{m.semantic_files?.toLocaleString() ?? 0}</div>
                  </div>
                  <div className="kv">
                    <div className="k">Symbols</div>
                    <div className="v">{m.semantic_symbols?.toLocaleString() ?? 0}</div>
                  </div>
                  <div className="kv">
                    <div className="k">Relations</div>
                    <div className="v">{m.semantic_relations?.toLocaleString() ?? 0}</div>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <h3 className="card-title flex items-center gap-2">
                <Terminal size={15} style={{ color: "var(--text-3)" }} /> Open in terminal
              </h3>
              <button onClick={() => handleCopy(watchCommand)} className="btn btn-sm">
                {copied === watchCommand ? <Check /> : <Copy />}
                {copied === watchCommand ? "Copied" : "Copy"}
              </button>
            </div>
            <div className="card-body">
              <code className="code">{watchCommand}</code>
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}
