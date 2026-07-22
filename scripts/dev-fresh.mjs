import { execSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import { setTimeout as sleep } from "node:timers/promises";

const PORT = Number(process.env.PORT || 3000);

function killNextDevProcesses() {
  if (process.platform === "win32") {
    try {
      const output = execSync(
        'powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \\"name=\'node.exe\'\\" | Select-Object ProcessId,CommandLine | ForEach-Object { if ($_.CommandLine -match \'next dev\') { $_.ProcessId } }"',
        { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] }
      );
      for (const pid of output.trim().split(/\s+/).filter(Boolean)) {
        try {
          execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
          console.log(`Stopped Next.js dev process ${pid}`);
        } catch {
          // Process may have already exited.
        }
      }
    } catch {
      // No matching processes.
    }
    return;
  }

  try {
    const output = execSync(`pgrep -f "next dev"`, { encoding: "utf8" });
    for (const pid of output.trim().split("\n").filter(Boolean)) {
      try {
        execSync(`kill -9 ${pid}`, { stdio: "ignore" });
        console.log(`Stopped Next.js dev process ${pid}`);
      } catch {
        // Process may have already exited.
      }
    }
  } catch {
    // No matching processes.
  }
}

function freePort(port) {
  if (process.platform === "win32") {
    try {
      const output = execSync(`netstat -ano | findstr ":${port}"`, {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "ignore"],
      });
      const pids = new Set();
      for (const line of output.split("\n")) {
        const match = line.trim().match(/\s+(\d+)\s*$/);
        if (match) pids.add(match[1]);
      }
      for (const pid of pids) {
        try {
          execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
          console.log(`Stopped process ${pid} on port ${port}`);
        } catch {
          // Process may have already exited.
        }
      }
    } catch {
      // No listeners on this port.
    }
    return;
  }

  try {
    const pid = execSync(`lsof -ti:${port}`, { encoding: "utf8" }).trim();
    if (pid) {
      execSync(`kill -9 ${pid}`, { stdio: "ignore" });
      console.log(`Stopped process ${pid} on port ${port}`);
    }
  } catch {
    // No listeners on this port.
  }
}

function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(true));
    server.once("listening", () => {
      server.close();
      resolve(false);
    });
    server.listen(port);
  });
}

console.log("Stopping any running Next.js dev processes...");
killNextDevProcesses();
console.log("Stopping any dev server on port", PORT, "...");
freePort(PORT);
await sleep(2000);

if (fs.existsSync(".next")) {
  console.log("Clearing .next cache...");
  fs.rmSync(".next", { recursive: true, force: true });
}

if (await isPortInUse(PORT)) {
  console.error(`\nPort ${PORT} is still in use. Close the other terminal manually, then retry.`);
  process.exit(1);
}

console.log(`Starting Next.js on http://localhost:${PORT} ...\n`);
execSync(`next dev -p ${PORT}`, { stdio: "inherit" });
