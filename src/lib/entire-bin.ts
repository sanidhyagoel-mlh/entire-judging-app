import fs from "fs";
import os from "os";
import path from "path";

export function entireSearchPath(): string {
  const home = os.homedir();
  const extra = [
    path.join(home, ".local", "bin"),
    path.join(home, ".local", "go", "bin"),
    path.join(home, "go", "bin"),
    "/opt/homebrew/bin",
    "/usr/local/bin",
  ];
  return [...extra, process.env.PATH || ""].filter(Boolean).join(":");
}

export function commandEnv(
  base: NodeJS.ProcessEnv = process.env
): NodeJS.ProcessEnv {
  return { ...base, PATH: entireSearchPath() };
}

export function resolveEntireBinary(): string | null {
  const home = os.homedir();
  const candidates = [
    path.join(home, ".local", "bin", "entire"),
    "/opt/homebrew/bin/entire",
    "/usr/local/bin/entire",
  ];
  for (const bin of candidates) {
    if (fs.existsSync(bin)) return bin;
  }
  return null;
}

export function pluginBinary(name: string): string {
  return path.join(
    os.homedir(),
    ".local",
    "share",
    "entire",
    "plugins",
    "bin",
    name
  );
}
