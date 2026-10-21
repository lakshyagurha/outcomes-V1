/**
 * Idea Bank jobs, locally.
 *   npm run ideas -- collect [slug,slug]       # enabled sources (or just these)
 *   npm run ideas -- report <url>              # read one research report
 *   npm run ideas -- estimate [limit]          # AI market estimate + snapshot for ideas without one
 */
import { readFileSync } from "node:fs";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}

(async () => {
  const [cmd, arg] = process.argv.slice(2);
  const { runIdeaCollection } = await import("../lib/ideas/collect");
  const { runEstimates } = await import("../lib/ideas/estimate");
  const out =
    cmd === "collect" ? await runIdeaCollection({ slugs: arg?.split(",").filter(Boolean) }) :
    cmd === "estimate" ? await runEstimates({ limit: Number(arg) || 50 }) :
    cmd === "report" ? await runIdeaCollection({ slugs: ["research-report"], reportUrl: arg }) :
    "Usage: npm run ideas -- collect|report <url>|estimate [limit]";
  console.log(JSON.stringify(out, null, 2));
})().catch((e) => { console.error(e); process.exit(1); });
