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

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const send = (event: Record<string, unknown>) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        void (async () => {
          const logs: string[] = [];
          try {
      send({ type: "phase", phase: "github", message: `Checking ${projects.length} repositories with GitHub…` });
      const { publicProjects, excluded } = await partitionPublicProjects(projects, (checked, total, repoUrl, isPublic) => {
        const message = `GitHub ${checked}/${total}: ${repoUrl} — ${isPublic ? "public" : "not public / unavailable"}`;
        logs.push(message); send({ type: "progress", phase: "github", checked, total, message });
      });
      for (const item of excluded) logs.push(`[Skip] ${item.submission_id} is not publicly accessible on GitHub`);
      send({ type: "phase", phase: "adding", message: `GitHub check complete: ${publicProjects.length} eligible, ${excluded.length} skipped. Preparing repositories…` });
      // `entire judge rank <dir>` scores EVERY repo inside <dir>. Each run gets its
      // own folder so repos cloned by earlier runs are never ranked again.
      const runId = new Date().toISOString().replace(/[:.]/g, "-");
      const resolvedWorkspace = path.join(process.cwd(), workspaceDir, "runs", runId);
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

      let added = 0;
      for (const proj of publicProjects) {
        send({ type: "progress", phase: "adding", checked: added, total: publicProjects.length, message: `Adding ${added + 1}/${publicProjects.length}: ${proj.repoUrl}` });
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
        added++;
        logs.push(`Added ${added}/${publicProjects.length}: ${proj.repoUrl}`);
        send({ type: "progress", phase: "adding", checked: added, total: publicProjects.length, message: `Added ${added}/${publicProjects.length}: ${proj.repoUrl}` });
      }

      const rankArgs = [
        "judge",
        "rank",
        submissionsDir,
        "--started-at",
        hackathonStart,
        "--json",
      ];
      send({ type: "phase", phase: "ranking", message: "All eligible repositories are added. Running Entire judge ranking…" });
      const stdout = await new Promise<string>((resolve, reject) => {
        const child = execFile(entireBin, rankArgs, {
          env,
          timeout: 300000,
          maxBuffer: 20 * 1024 * 1024,
        }, (error, output) => {
          if (pending.trim()) send({ type: "log", phase: "ranking", message: pending.trim() });
          if (error) reject(error);
          else resolve(output);
        });
        let pending = "";
        child.stderr?.on("data", (chunk: Buffer) => {
          pending += chunk.toString("utf-8").replace(/\x1b\[[0-9;]*m/g, "");
          const lines = pending.split(/\r?\n/);
          pending = lines.pop() || "";
          for (const line of lines) {
            const message = line.trim();
            if (message) send({ type: "log", phase: "ranking", message });
          }
        });
      });

      send({ type: "phase", phase: "report", message: "Judge finished ranking. Saving the assessment report…" });
      fs.writeFileSync(boardPath, stdout, "utf-8");
      const boardReport = JSON.parse(stdout) as RankReport;
      send({ type: "phase", phase: "report", message: `Report saved with ${boardReport.submissions?.length || 0} assessed submissions.` });

      send({ type: "complete", data: {
        boardPath,
        watchCommand: `entire judge watch ${boardPath}`,
        logs,
        board: {
          ...boardReport,
          excluded: [...(boardReport.excluded || []), ...excluded],
        },
      }});
          } catch (error) {
            send({ type: "error", error: error instanceof Error ? error.message : String(error), logs });
          } finally { controller.close(); }
        })();
      }
    });
    return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no" } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Evaluation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
