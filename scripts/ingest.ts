/**
 * Run the ingestion pipeline locally.
 *   npm run ingest                       # all daily sources
 *   npm run ingest -- y-combinator,hult-prize
 */
import { readFileSync } from "node:fs";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}

(async () => {
  const { runIngest } = await import("../lib/ingest/run");
  const only = process.argv[2]?.split(",").filter(Boolean);
  const summary = await runIngest({ only });
  console.log(JSON.stringify(summary, null, 2));
})().catch((e) => { console.error(e); process.exit(1); });
