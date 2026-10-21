# Outcomes

**Know what to apply to, and get in.** A Next.js 14 MVP for student founders in India. It covers a stage diagnostic, an honest stage reveal, fit-ranked programs, a founder profile, an AI Application Coach and an application tracker.

## Flow

`/` → `/diagnostic` (10 questions, no signup) → `/result` (stage reveal) → `/matches` → `/programs/[slug]`
→ `/signin` ("Save your matches") → `/dashboard` · `/profile` · `/coach` · `/tracker`

## Setup

```bash
npm install
cp .env.example .env.local   # fill in values (see below)
npm run dev                  # http://localhost:3000
```

### Environment variables

| Variable | Where | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project settings → API | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same page (publishable / anon key) | Public. Data is protected by RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | Same page | **Only** for `npm run seed`. Never ship to the browser |
| `AI_PROVIDER` | `gemini` or `anthropic` | Which model runs the coach and the pipeline (`lib/ai.ts`) |
| `GEMINI_API_KEY` | aistudio.google.com → Get API key | Server-only. Model set by `GEMINI_MODEL` (default `gemini-pro-latest`; extraction and discovery use `GEMINI_FAST_MODEL`, default `gemini-flash-lite-latest`) |
| `ANTHROPIC_API_KEY` | console.anthropic.com | Server-only, optional if using Gemini |
| `NEXT_PUBLIC_COLLEGE_NAME` | — | Replaces `[College Name]` across the app |

The app works without Supabase. Everything is stored on the device, and sign-in shows a "not set up" note. The coach needs `ANTHROPIC_API_KEY`.

### Supabase

1. Run `supabase/migrations/0001_init.sql` in the SQL editor, or with `supabase db push`.
2. `npm run seed` upserts `data/programs.json` into `programs`.
3. **Auth → Providers:** enable Email (magic link) and Google (add your Google OAuth client ID and secret).
4. **Auth → URL configuration:** set the Site URL, and add `https://<your-domain>/auth/callback` and `http://localhost:3000/auth/callback` to the redirect URLs.

### Deploy (Vercel)

Import the repo, add the env vars above (except the service role key, which isn't needed at runtime), deploy, and add the production callback URL in Supabase.

## Editing programs

All programs live in **`data/programs.json`**, which is the source of truth for the UI. Each entry follows the `Program` type in `lib/types.ts`.

- **Never guess.** If you aren't sure of a deadline, amount, equity % or timeline, leave it `null`, and keep `verified: false` until someone has checked the official source. The UI then shows "Details being verified".
- Once verified, set `verified: true` and `last_checked: "YYYY-MM-DD"`.
- `sectors: []` means sector-agnostic.
- `fit_signals` drives the matcher: `technical_founder` (`"required"` / `"preferred"` / `null`), `min_team_size`, `full_time`, `student_only`.
- After editing, run `npm run seed` to sync Supabase, then redeploy.

## Tuning stage and fit rules

Everything is in **`lib/rules.ts`**:

- `STAGE_RULES` is an ordered list. The first matching rule wins, and each rule has a plain-language `because`. Rules lean towards the lower stage on purpose. For example, a prototype without 11+ user conversations still counts as Idea.
- `STAGE_COPY` and `nextSteps()` hold the reveal copy and the 3 personalised next steps.
- `FIT_WEIGHTS` sets the points for stage, sector, team and need (out of 100). `scoreProgram()` turns these into reasons, and every gap carries an `action`.
- Grouping: **Apply now** means a stage match with no hard gaps (a required technical founder or full-time commitment). **2–3 months** means one hard gap, or one stage away. **Not yet** means everything else. Programs the team has outgrown are hidden.
- `readiness()` sets the dashboard checklist and its points (out of 100).

Diagnostic questions and options are in `components/diagnostic/questions.ts`. The coach prompt and output sanitising are in `lib/coach-prompt.ts`.

## Live program data (pipeline)

The `programs` table in Supabase is the source of truth. `lib/programs.ts` reads it, cached for 1 hour. `data/programs.json` is only the initial seed and the fallback if the database can't be reached.

**How it works ("AI proposes, a human approves"):**
1. `program_sources` lists the URLs to watch: one official page per program to start with. Add rows to watch more pages, such as portals or aggregators.
2. **Daily cron** (`vercel.json` → `/api/cron/ingest`, protected by `CRON_SECRET`), or `npm run ingest -- y-combinator,hult-prize` locally:
   - Firecrawl fetches each page as markdown (`lib/ingest/firecrawl.ts`).
   - Unchanged pages, detected by hash, are skipped with no AI cost.
   - Claude extracts the fields defined in `lib/ingest/fields.ts`. A value is kept only if it comes with a **verbatim quote** found on the page (`lib/ingest/extract.ts`).
   - Rules in `lib/ingest/evaluate.ts` drop past deadlines, malformed dates and implausible equity or ages, and flag low confidence.
   - High-risk fields (deadline, money, equity, eligibility, status) become **proposals**. Low-risk fields (the page's share image as the poster) are applied automatically.
   - Programs whose deadline has passed are switched to `closed` automatically.
3. **`/admin/review`** is limited to `ADMIN_EMAILS`. It shows current vs proposed, the source quote and the link. Admins can edit, approve or reject, or trigger a run. Approving updates the program, records per-field verification in `field_meta`, logs the change to `program_changes`, and refreshes the site cache.

**UI:** cards and detail pages show the poster (or a generated cover), a status chip (Open · closes in Nd / Rolling / Upcoming / Closed), and "Verified {date} · source ↗" for each approved field.

**Needed env:** `FIRECRAWL_API_KEY`, `ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_EMAILS`, `CRON_SECRET`.

### Discovery: finding programs we don't know about yet

`lib/ingest/discover.ts` covers both a program's 20th cohort and its first. Two kinds of `discovery_sources` (edit the rows to add more):
- **Directories** (weekly, skipped when the page is unchanged): Startup India programs and schemes, MeitY Startup Hub, AIM, BIRAC calls, Startup Grants India, Unstop, Devfolio.
- **Search sweeps** (daily, web + news from the past week): queries such as "pre-incubation program applications open India students" and "launches first cohort startup accelerator India".

AI lists each distinct opportunity. A find is kept only if:
- its URL and quote appear in what was fetched,
- confidence is at least 0.5,
- its evidence doesn't point only to past years,
- it isn't a duplicate of a known program or an earlier find (matched by domain and name).

Finds land in **`/admin/review` → New programs found**. **Add to Outcomes** creates the program, adds it to the daily watch list, runs a first fetch for logo and details, and sends any deadline it saw to normal field review.

Run it with `npm run discover [search|directory]`, the **Discover now** button, or cron (searches daily, directories on Mondays; see `vercel.json`).

**Free-tier note:** the Gemini free tier allows roughly 20 requests per day per model. The coach uses `GEMINI_MODEL` and batch jobs use `GEMINI_FAST_MODEL` (Flash-Lite), so they don't compete. Batch jobs are spaced by `AI_MIN_INTERVAL_MS` and stop early once the quota runs out; the rest resumes on the next run. Enable billing for reliable daily coverage.

**Next phases (planned):** newsletter inbox, poster uploads from students (read by Claude vision), eligibility questions in the diagnostic, a "What changed" feed, a discovery agent, Unstop/Devfolio listings, and social posters via Apify.

## Idea Bank (`/ideas`)

A curated list of real problems worth solving, for students without an idea yet. Students can list, search, filter (category, path), sort (score, market size, growth, newest, most interested), expand a problem, and mark "I'm interested". Interested problems also show in **Tracker → Problems you're interested in**. Filters, sort, search and the open row live in the URL, so any view can be shared.

**Tables** (`supabase/migrations/0006`–`0010`): `idea_sources`, `ideas`, `idea_interests`.
- Students read published ideas only, through a column grant that hides `market_source_quote` and the review fields. They can read, add and delete only their own interests. A trigger keeps `ideas.interest_count` in sync. `idea_sources` is service-role only.
- Admin writes go through the service role after the `ADMIN_EMAILS` check, the same way programs work.
- The database refuses to publish an idea whose market data is `pending`, or `sourced` but not verified (constraint `ideas_publish_requires_verified_market`).

### Sources and modes

Every source starts **`disabled`**. Before turning one on, read its robots.txt and terms, write a note, and only then change its mode in **/admin/review → Ideas → Sources**.

| Mode | What happens |
|---|---|
| `rewrite` | Problems are extracted and rewritten in our own words (title, summary, who has it, why it matters). |
| `link_only` | Only a short rewritten title plus the link to the original is stored. |
| `disabled` | Skipped. |

Adapters (`lib/ideas/collect.ts`):
- **Razorpay Fix My Itch:** Firecrawl scrape. Collects the problem, Itch Score and industry.
- **IdeaBrowser:** Firecrawl scrape. Takes only the core problem and why it matters, never the write-ups, plans or market analysis.
- **TrustMRR:** the official API (`lib/ideas/trustmrr.ts`, `TRUSTMRR_API_KEY`, 10 requests/min). Each product becomes the problem it solves, with verified MRR as the signal.
- **Starter Story:** Firecrawl scrape of the public `/data` page only, while logged out. Its terms allow re-publishing only for non-commercial use, with a link back on every screen, so it stays disabled until you confirm the app is non-commercial. Member-only data behind the login is never collected.
- **Research reports:** an admin pastes a URL.

TrustMRR's terms require written permission before API data appears in a product, so keep it disabled until you have that.

**Rewrite rules.** The prompt is in `lib/ideas/rewrite.ts`, and code re-checks the output:
- the title is a question of at most 15 words;
- the summary is at most 60 words;
- no field shares more than 5 consecutive words with the source;
- the category must be in the taxonomy;
- `is_problem=false` items are dropped;
- scores come only from what the adapter read at the source, never from the AI.

Each new title is compared with existing ideas by trigram similarity (`similar_ideas()`, threshold 0.5). Likely duplicates still go in as drafts, with a **Possible duplicate** warning. Everything lands as `draft` with `market_status='pending'`, and **nothing is published automatically**.

### Adding one idea by hand (a tweet, an article, a conversation)

On /admin/review → Ideas, use **Add an idea**:
1. Paste the text and the link to the original.
2. Optionally add a signal you read yourself, e.g. `3835` with the label `MRR (USD)`.
3. The AI rewrites it as a problem in our words. If it's about a product, it describes the problem the product solves and leaves out the product's name. The usual checks run: no copied phrases, duplicate check.
4. An AI market estimate and snapshot are added, and the idea lands as a draft.

Students see "Source: Curated by Outcomes" and a link to the original post. The source row is `manual` (migration 0014).

### Adding a research report

On /admin/review → Ideas, paste the report URL into **Add report**. This needs the Research reports source set to `rewrite` or `link_only`. Each problem it finds cites the report URL as its original.

### Running collection

- **Weekly cron:** `vercel.json` → `/api/cron/ideas` (Mondays 04:00 UTC). It collects from enabled sources.
- **On demand:**
  - **Run now** on a source.
  - Locally: `npm run ideas -- collect [slug,slug]`, `npm run ideas -- report <url>`.

**Market data and snapshot** (`lib/ideas/estimate.ts`). Product decision on 2026-10-21: no idea is left empty.
- **When:** every new draft gets an AI estimate (segment, size, currency, unit, geography, year, growth, type, period) and a **snapshot** (a short case study, what people earn doing this, and the main competitors) as soon as it's collected. **Fill with AI** (on one idea), **Fill empty with AI** (all ideas) and `npm run ideas -- estimate` do the same on demand. The weekly cron runs it after collection.
- **Labelling:** estimates are stored as `market_status='ai_estimate'`. Students see them with a "~" and an **AI estimate** label ("not from a published source"), and the snapshot is labelled "AI-generated".
- **Accuracy:** AI figures and named companies can be wrong or out of date. Check them in admin before approving.
- **Published figures:** if you find a real one, enter it with its link and exact sentence and set status to `sourced`. It replaces the estimate, and the AI never overwrites it; for those ideas, only the snapshot is generated.

### Reviewing ideas

Go to **/admin/review → Ideas**. For each draft:
1. Edit any field inline.
2. Check the duplicate warning.
3. If you entered a figure, compare it with the **Evidence** panel (source link and exact quote).
4. Click **Approve**. It always publishes: a complete figure (value, source, link, quote) goes live and counts as checked; anything else goes live as "—" (`not_found`).

**Approve selected** publishes every selected draft the same way. The counter tracks progress toward 150 published ideas.

**Attribution.** Always write "Source: <name>". The page footer says that problems are summarised from the linked sources and all rights stay with the publishers. The logo strip ("Drawn from trusted, well-researched sources") lists only sources that have published problems.

**Simplifying decisions:**
- Admins come from `ADMIN_EMAILS`, not a database role.
- The source isn't a student-facing filter.
- "Newest" sorts by `published_at`.
- Market figures come from an AI estimate (clearly labelled) unless an admin enters a published figure; there is no automatic web search.
- Research reports share one source row, and the URL is the citation.
- Score sorting mixes source scales (Itch Score and MRR), so it orders by raw value.
- Source logos are favicons, shown in greyscale.

## Applications that got in (`/stories`)

The dashboard and `/stories` show **sample** selected applications for Y Combinator, Entrepreneur First and The Foundery (`lib/stories.ts`). Each story page has:
- a sample notice, the programme's logo and brand strip, the outcome and the deal as publicly reported;
- a "How it went" timeline;
- the full form, section by section: each question with its limit, the answer shown as a filled field, and a toggleable "Why this works" note;
- "What they'd do differently", with links to Coach and the programme.

**Accuracy:**
- Founders are fictional.
- YC's questions are close to the real form. EF's and The Foundery's are reconstructed from public descriptions, because their forms are behind a login. Each story says which.
- Programme names and logos belong to their owners, and the pages state that they aren't affiliated with them.

**Next:** replace the samples with real stories from seniors, collected through a submission form with consent, an admin approval tab and a `stories` table.

## Access: SSB students only

Only `@ssb.scaler.com` accounts can use the app. This is enforced in three places:

1. **Database:** a trigger on `auth.users` (`supabase/migrations/0002_restrict_signup_domain.sql`) refuses to create any other account. This is the real gate, and it covers Google and magic links alike.
2. **Middleware:** every route except `PUBLIC_PATHS` in `lib/config.ts` (`/`, `/signin`, `/auth/callback`) needs a signed-in, allowed user. `/api/coach` returns 401 otherwise.
3. **Sign-in UI:** checks the email before sending a link, and passes `hd=ssb.scaler.com` so Google only offers SSB accounts.

To change the domain, update the migration's trigger function and `NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN`.
This replaces the original "value before signup" flow. To make the diagnostic public again, add `/diagnostic` and `/result` to `PUBLIC_PATHS`.

## Architecture notes and simplifying decisions

- **Local-first data.** Answers, profile, saved programs and reviews live in `localStorage` (`lib/store.ts`), so there's value before signup. On sign-in, `lib/sync.ts` merges local data with Supabase (the server wins on conflicts), and later writes go to both. This is simpler than server-only state and keeps the no-signup promise.
- **Programs are bundled** from JSON rather than fetched from Supabase at runtime. Pages are static and fast, and the DB copy exists for joins and future admin tools.
- **The coach** (`app/api/coach/route.ts`) calls the configured AI provider (`lib/ai.ts`: Gemini or Claude) from the server only. Output is parsed defensively: scores are clamped to 1–10, and vague phrases or the strongest line are dropped unless they appear verbatim in the draft, so highlights always line up. Rate limiting is in memory per instance (10 reviews per 10 minutes per IP). Use a shared store before scaling.
- **UI primitives** are hand-rolled in shadcn style (`components/ui/*`) instead of the shadcn CLI, to keep the dependency surface small. You can swap them for shadcn components later; the tokens are in `tailwind.config.ts`.
- **Tracker deadlines** are entered by the student, because program deadlines are unverified.
- **"Seniors who got in"** and **Mock Interview** are intentional placeholders.
- `users` is Supabase's `auth.users`. Every user table has owner-only RLS, and `programs` is public read-only.
