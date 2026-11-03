import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { CSVProjectRow, RankReport } from "@/lib/types";
import { partitionPublicProjects } from "@/lib/public-repos";
import { commandEnv, resolveEntireBinary } from "@/lib/entire-bin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const execFileAsync = promisify(execFile);
const workspaceDir = "./jury-run";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projects = [], hackathonName = "", hackathonStart = "" } =
      body as {
        projects: CSVProjectRow[];
        hackathonName: string;
        hackathonStart: string;
      };

    if (!hackathonName.trim()) {
      return NextResponse.json(
        { error: "Enter a hackathon name." },
        { status: 400 }
      );
    }
    if (!hackathonStart || Number.isNaN(Date.parse(hackathonStart))) {
      return NextResponse.json(
        { error: "Enter the hackathon start date and time." },
        { status: 400 }
      );
    }
    if (!projects || projects.length === 0) {
      return NextResponse.json(
        { error: "Upload a CSV of GitHub repository links." },
        { status: 400 }
      );
    }

    const logs: string[] = [];
    const { publicProjects, excluded } = await partitionPublicProjects(projects);
    for (const item of excluded) {
      logs.push(`[Skip] ${item.submission_id} is not a public GitHub repository`);
    }

    const entireBin = resolveEntireBinary();
    if (!entireBin) {
      return NextResponse.json(
        {
          error:
            "Entire is not installed. Click Install on the setup screen, then run the evaluation again.",
        },
        { status: 400 }
      );
    }

    if (publicProjects.length === 0) {
      return NextResponse.json({
        logs,
        watchCommand: `entire judge watch ${workspaceDir}/reports/board.json`,
        board: {
          schema_version: 1,
          kind: "entire_judge_ranking",
          advisory: true,
          disclaimer:
            "Advisory only: these scores inform the jury's judgment, they do not replace it.",
          generated_at: new Date().toISOString(),
          run: {
            agent: "",
            prompt_fingerprint: "",
            hackathon_started_at: hackathonStart,
            llm_status: "skipped",
          },
          submissions: [],
          excluded,
        },
      });
    }

    try {
      const resolvedWorkspace = path.join(process.cwd(), workspaceDir);
      const submissionsDir = path.join(resolvedWorkspace, "submissions");
      const reportsDir = path.join(resolvedWorkspace, "reports");
      const boardPath = path.join(reportsDir, "board.json");

      fs.mkdirSync(submissionsDir, { recursive: true });
      fs.mkdirSync(reportsDir, { recursive: true });

      logs.push(
        `[Step 1] Using Entire at ${entireBin} for "${hackathonName.trim()}"`
      );

      const env = commandEnv();
      env.PATH = `${path.dirname(entireBin)}:${env.PATH || ""}`;

      for (const proj of publicProjects) {
        logs.push(`[Step 2] entire judge add ${proj.repoUrl}`);
        await execFileAsync(
          entireBin,
          [
            "judge",
            "add",
            proj.repoUrl,
            "--dir",
            submissionsDir,
            "--entire-binary",
            entireBin,
          ],
          { env, timeout: 180000 }
        );
      }

      const rankArgs = [
        "judge",
        "rank",
        submissionsDir,
        "--started-at",
        hackathonStart,
        "--json",
      ];
      logs.push(`[Step 3] entire ${rankArgs.join(" ")}`);
      const { stdout } = await execFileAsync(entireBin, rankArgs, {
        env,
        timeout: 300000,
        maxBuffer: 20 * 1024 * 1024,
      });

      fs.writeFileSync(boardPath, stdout, "utf-8");
      const boardReport = JSON.parse(stdout) as RankReport;

      return NextResponse.json({
        boardPath,
        watchCommand: `entire judge watch ${boardPath}`,
        logs,
        board: {
          ...boardReport,
          excluded: [...(boardReport.excluded || []), ...excluded],
        },
      });
    } catch (cliErr: unknown) {
      const msg = cliErr instanceof Error ? cliErr.message : String(cliErr);
      return NextResponse.json({ error: msg, logs }, { status: 500 });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Evaluation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
