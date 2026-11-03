import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import os from "os";
import path from "path";
import {
  commandEnv,
  pluginBinary,
  resolveEntireBinary,
} from "@/lib/entire-bin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const execFileAsync = promisify(execFile);

function formatExecError(err: unknown): string {
  if (err && typeof err === "object") {
    const stderr = String((err as { stderr?: string }).stderr || "").trim();
    const stdout = String((err as { stdout?: string }).stdout || "").trim();
    const message = err instanceof Error ? err.message : String(err);
    return [message, stdout, stderr].filter(Boolean).join("\n");
  }
  return err instanceof Error ? err.message : String(err);
}

async function run(
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv,
  timeout: number
) {
  return execFileAsync(command, args, {
    env,
    timeout,
    maxBuffer: 20 * 1024 * 1024,
  });
}

async function ensureGo(
  env: NodeJS.ProcessEnv,
  logs: string[]
): Promise<NodeJS.ProcessEnv> {
  try {
    const { stdout } = await run("go", ["version"], env, 15000);
    logs.push(stdout.trim() || "Go is already installed.");
    return env;
  } catch {
    logs.push("Go is not installed. Downloading it.");
  }

  const osName =
    process.platform === "darwin"
      ? "darwin"
      : process.platform === "linux"
        ? "linux"
        : "";
  const arch =
    process.arch === "arm64" ? "arm64" : process.arch === "x64" ? "amd64" : "";
  if (!osName || !arch) {
    throw new Error(
      "Automatic install supports macOS and Linux. Install Go from https://go.dev/dl and click Install again."
    );
  }

  const indexRes = await fetch("https://go.dev/dl/?mode=json");
  if (!indexRes.ok) {
    throw new Error(`Could not look up the Go download (${indexRes.status}).`);
  }
  const releases = (await indexRes.json()) as Array<{
    version: string;
    stable: boolean;
    files: Array<{ filename: string; os: string; arch: string; kind: string }>;
  }>;
  const stable = releases.find((release) => release.stable);
  const file = stable?.files.find(
    (item) => item.kind === "archive" && item.os === osName && item.arch === arch
  );
  if (!stable || !file) {
    throw new Error("Could not find a Go download for this computer.");
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "go-sdk-"));
  const archive = path.join(tmp, file.filename);
  const download = await fetch(`https://go.dev/dl/${file.filename}`);
  if (!download.ok) {
    throw new Error(`Go download failed (${download.status}).`);
  }
  fs.writeFileSync(archive, Buffer.from(await download.arrayBuffer()));

  const destParent = path.join(os.homedir(), ".local");
  const goRoot = path.join(destParent, "go");
  fs.mkdirSync(destParent, { recursive: true });
  fs.rmSync(goRoot, { recursive: true, force: true });
  await run("tar", ["-xzf", archive, "-C", destParent], env, 120000);
  fs.rmSync(tmp, { recursive: true, force: true });

  const next: NodeJS.ProcessEnv = {
    ...env,
    GOROOT: goRoot,
    PATH: `${path.join(goRoot, "bin")}:${env.PATH || ""}`,
  };
  logs.push(`Installed ${stable.version}.`);
  return next;
}

async function ensurePlugin(
  entireBin: string,
  env: NodeJS.ProcessEnv,
  logs: string[],
  indexName: string,
  binaryName: string
) {
  if (fs.existsSync(pluginBinary(binaryName))) {
    logs.push(`${indexName} plugin is already installed.`);
    return;
  }
  logs.push(`Installing the ${indexName} plugin.`);
  await run(entireBin, ["plugin", "install", indexName], env, 180000);
}

export async function POST() {
  const logs: string[] = [];
  if (process.env.VERCEL) {
    return NextResponse.json(
      {
        error:
          "Install runs on your computer. Start the app locally, then click Install.",
      },
      { status: 400 }
    );
  }
  if (process.platform !== "darwin" && process.platform !== "linux") {
    return NextResponse.json(
      {
        error:
          "Automatic install supports macOS and Linux. On Windows, install Entire from https://docs.entire.io/installation, then install the judge plugin.",
      },
      { status: 400 }
    );
  }

  try {
    let env = commandEnv();

    try {
      await run("git", ["--version"], env, 10000);
      logs.push("Git is installed.");
    } catch {
      return NextResponse.json(
        {
          error:
            "Git is not installed. Install Git, then click Install again.",
          logs,
        },
        { status: 400 }
      );
    }

    let entireBin = resolveEntireBinary();
    if (!entireBin) {
      logs.push("Downloading the Entire CLI.");
      await run(
        "bash",
        ["-lc", "curl -fsSL https://entire.io/install.sh | bash"],
        env,
        180000
      );
      entireBin = resolveEntireBinary();
      if (!entireBin) {
        throw new Error(
          "The Entire CLI install finished, but the entire command was not found."
        );
      }
    } else {
      logs.push("Entire CLI is already installed.");
    }
    env = {
      ...env,
      PATH: `${path.dirname(entireBin)}:${env.PATH || ""}`,
    };

    await Promise.all([
      ensurePlugin(entireBin, env, logs, "brain", "entire-brain"),
      ensurePlugin(entireBin, env, logs, "graph", "entire-graph"),
    ]);

    let judgeReady = false;
    try {
      const { stdout } = await run(
        entireBin,
        ["judge", "version"],
        env,
        15000
      );
      logs.push(
        stdout.trim()
          ? `Entire judge ${stdout.trim()}`
          : "Entire judge is already installed."
      );
      judgeReady = true;
    } catch {
      logs.push("Installing the Entire judge plugin.");
    }

    if (!judgeReady) {
      env = await ensureGo(env, logs);
      const gopath = path.join(os.homedir(), "go");
      const gobin = path.join(gopath, "bin");
      fs.mkdirSync(gobin, { recursive: true });
      await run(
        "go",
        ["install", "github.com/entireio/entire-judge/cmd/entire-judge@latest"],
        {
          ...env,
          GOPATH: gopath,
          GOBIN: gobin,
          GOTOOLCHAIN: "auto",
        },
        300000
      );
      const judgeBin = path.join(gobin, "entire-judge");
      if (!fs.existsSync(judgeBin)) {
        throw new Error(
          "Go finished, but the entire-judge program was not found."
        );
      }
      await run(
        entireBin,
        ["plugin", "install", judgeBin, "--force"],
        env,
        60000
      );
      const { stdout } = await run(
        entireBin,
        ["judge", "version"],
        env,
        15000
      );
      logs.push(stdout.trim() || "Entire judge is installed.");
    }

    return NextResponse.json({ ok: true, logs });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: formatExecError(err), logs },
      { status: 500 }
    );
  }
}
