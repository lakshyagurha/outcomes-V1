// Runs before `npm run dev` (package.json "predev"). Two `next dev` servers in one folder share .next and
// overwrite each other's chunks, which shows up in the browser as "ChunkLoadError: Loading chunk … failed".
import { execSync } from "node:child_process";

const here = process.cwd();
let pids = [];
// Only real Next.js servers (the `next dev` node process or its `next-server` child), not shells that mention them.
try {
  pids = execSync("ps -eo pid=,command=", { encoding: "utf8" }).split("\n")
    .map((l) => l.trim().match(/^(\d+)\s+(.*)$/)).filter(Boolean)
    .filter(([, , cmd]) => /^node\s+\S*\/next dev\b|^next-server\b/.test(cmd))
    .map(([, pid]) => Number(pid));
} catch { /* ps unavailable: skip the check */ }

for (const pid of pids) {
  if (pid === process.pid || pid === process.ppid) continue;
  let cwd = "";
  try { cwd = execSync(`lsof -a -p ${pid} -d cwd -Fn`, { encoding: "utf8" }).split("\n").find((l) => l.startsWith("n"))?.slice(1) ?? ""; } catch { continue; }
  if (cwd !== here) continue;
  let port = "?";
  try { port = execSync(`lsof -a -p ${pid} -iTCP -sTCP:LISTEN -Fn`, { encoding: "utf8" }).match(/:(\d+)/)?.[1] ?? "?"; } catch { /* child holds the port */ }
  console.error(`\n✋ A dev server for this project is already running (pid ${pid}${port !== "?" ? `, http://localhost:${port}` : ""}).`);
  console.error("   Two servers share .next and break each other (ChunkLoadError). Use that one, or stop it first:");
  console.error(`   kill ${pid}\n`);
  process.exit(1);
}
