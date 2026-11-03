import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import {
  commandEnv,
  pluginBinary,
  resolveEntireBinary,
} from "@/lib/entire-bin";

const execFileAsync = promisify(execFile);

export async function GET() {
  const isVercel = Boolean(process.env.VERCEL);
  const entireBin = resolveEntireBinary();
  const env = commandEnv();

  let entireVersion = "";
  let judgeVersion = "";

  if (entireBin) {
    try {
      const { stdout } = await execFileAsync(entireBin, ["version"], {
        env,
        timeout: 4000,
      });
      entireVersion = stdout.trim().split("\n")[0] || "installed";
    } catch {
      // ignore
    }

    try {
      const { stdout } = await execFileAsync(entireBin, ["judge", "version"], {
        env,
        timeout: 4000,
      });
      judgeVersion = stdout.trim();
    } catch {
      // ignore
    }
  }

  return NextResponse.json({
    isVercel,
    localCliAvailable: Boolean(entireBin && judgeVersion),
    entireBinary: entireBin,
    entireVersion,
    judgeVersion,
    hasBrain: fs.existsSync(pluginBinary("entire-brain")),
    hasGraph: fs.existsSync(pluginBinary("entire-graph")),
  });
}
