/**
 * Run discovery locally.
 *   npm run discover                # everything
 *   npm run discover -- search      # only search sweeps
 *   npm run discover -- directory   # only directory crawls
 */
import { readFileSync } from "node:fs";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}

(async () => {
  const { runDiscovery } = await import("../lib/ingest/discover");
  const kind = process.argv[2];
  const summary = await runDiscovery({ kinds: kind === "search" || kind === "directory" ? [kind] : undefined });
  console.log(JSON.stringify(summary, null, 2));
})().catch((e) => { console.error(e); process.exit(1); });
