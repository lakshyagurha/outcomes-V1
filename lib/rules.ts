/**
 * All stage and fit rules live here so they can be tuned in one place.
 * Rules are deliberately simple and transparent. When in doubt, they pick the
 * LOWER stage: an honest diagnosis is more useful than a flattering one.
 */
import type { DiagnosticAnswers, FounderProfile, Need, Program, Stage } from "./types";
import { STAGES } from "./types";

/* ------------------------------------------------------------------ */
/* 1. Stage rules                                                      */
/* ------------------------------------------------------------------ */

type StageRule = { stage: Stage; when: (a: DiagnosticAnswers) => boolean; because: (a: DiagnosticAnswers) => string };

const spokeTo = (a: DiagnosticAnswers) => (a.usersSpoken === "0" ? "no potential users" : `${a.usersSpoken} potential users`);

/** Checked top to bottom; the first match wins. */
export const STAGE_RULES: StageRule[] = [
  {
    stage: "Scaling",
    when: (a) => a.paid === "recurring" && a.activeUsers === "100+" && a.built === "live",
    because: () => "You have a live product, 100+ active users and recurring revenue.",
  },
  {
    stage: "Early Revenue",
    when: (a) => a.paid === "recurring" || (a.paid === "pilots" && (a.built === "prototype" || a.built === "live")),
    because: (a) =>
      a.paid === "recurring"
        ? "Customers are paying you on a recurring basis."
        : "Someone has paid for a pilot or pre-order, and you have something working.",
  },
  {
    stage: "Building",
    // A prototype only counts if it's backed by real user conversations.
    when: (a) => (a.built === "prototype" || a.built === "live") && (a.usersSpoken === "11-30" || a.usersSpoken === "30+"),
    because: (a) => `You have a working ${a.built === "live" ? "product" : "prototype"} and have spoken to ${a.usersSpoken} potential users.`,
  },
  {
    stage: "Validating",
    when: (a) => a.problem !== "none" && a.usersSpoken !== "0" && !(a.problem === "rough" && a.usersSpoken === "1-10"),
    because: (a) => `You have a ${a.problem === "clear" ? "clear problem" : "problem"} and have spoken to ${a.usersSpoken} potential users.`,
  },
  {
    stage: "Idea",
    when: (a) => a.problem !== "none",
    because: (a) =>
      a.built !== "nothing" && a.usersSpoken === "0"
        ? "You've started building, but haven't spoken to potential users yet, so the problem is still unproven."
        : `You have a ${a.problem === "clear" ? "clear problem statement" : "rough idea"}, and have spoken to ${spokeTo(a)} so far.`,
  },
  {
    stage: "Exploring",
    when: () => true,
    because: () => "You don't have a specific problem yet. That's a normal place to start.",
  },
];

export function computeStage(a: DiagnosticAnswers): { stage: Stage; because: string } {
  const rule = STAGE_RULES.find((r) => r.when(a))!;
  return { stage: rule.stage, because: rule.because(a) };
}

export const stageIndex = (s: Stage) => STAGES.indexOf(s);

/* ------------------------------------------------------------------ */
/* 2. What each stage means, and what moves you forward                */
/* ------------------------------------------------------------------ */

export const STAGE_COPY: Record<Stage, { meaning: string; encouragement: string }> = {
  Exploring: {
    meaning: "You're looking for a problem worth solving. Most good startups begin with a problem the founder has seen up close.",
    encouragement: "Every founder starts here. The ones who move fastest go looking for problems on purpose.",
  },
  Idea: {
    meaning: "You have a problem in mind, but it hasn't been tested with the people who have it.",
    encouragement: "You're ahead of most students: you've picked something to work on. Now prove it's real.",
  },
  Validating: {
    meaning: "You're testing whether the problem is real and painful by talking to people who have it.",
    encouragement: "This is where good startups are made. Evidence from users is what programs look for first.",
  },
  Building: {
    meaning: "You've confirmed the problem and have something people can use. The job now is getting real usage.",
    encouragement: "You've built something real, which most applicants haven't. Usage numbers will open doors.",
  },
  "Early Revenue": {
    meaning: "People are paying you. The question now is whether that can grow reliably.",
    encouragement: "Someone paying you is the strongest signal there is. Most programs are built for teams like yours.",
  },
  Scaling: {
    meaning: "You have recurring revenue and a growing user base. Now it's about growth and the team.",
    encouragement: "You're at a stage few student startups reach. Focus on programs that bring capital and network.",
  },
};

/** Three concrete next steps, personalised to the answers. */
export function nextSteps(a: DiagnosticAnswers, stage: Stage): string[] {
  const steps: string[] = [];
  switch (stage) {
    case "Exploring":
      steps.push(
        "Write down 10 problems you or people around you face every week, then pick the 3 that annoy people most.",
        "Talk to 5 people about the top problem. Ask about the last time it happened, not whether they'd use your idea.",
        "Join one ideathon or E-cell problem-discovery session this month.",
      );
      break;
    case "Idea":
      steps.push(
        a.usersSpoken === "0"
          ? "Talk to 10 people who have this problem before you build anything more."
          : `You've spoken to ${a.usersSpoken} people. Get to 15, and note the exact words they use to describe the problem.`,
        "Write a one-sentence problem statement: who has the problem, how often, and what it costs them.",
        a.built === "nothing"
          ? "Make the cheapest possible test: a landing page, a WhatsApp group or a Google Form."
          : "Pause building. Show what you have to 5 users and watch where they get confused.",
      );
      break;
    case "Validating":
      steps.push(
        a.usersSpoken === "30+"
          ? "You've done the conversations. Turn the patterns into a one-page summary with numbers."
          : `Get from ${a.usersSpoken} to 30 user conversations, and track how many say it's a top-3 problem.`,
        a.built === "nothing" || a.built === "mockups"
          ? "Build a simple working prototype that solves the single most painful part."
          : "Get 10 people using your prototype every week.",
        a.hasBuilder === "no"
          ? "Find a technical cofounder, or learn enough no-code to build the first version yourself."
          : "Ask 3 of the people you interviewed if they'd pre-order or join a paid pilot.",
      );
      break;
    case "Building":
      steps.push(
        a.activeUsers === "0" || a.activeUsers === "1-10"
          ? "Get to 25 active users and measure how many come back each week."
          : "Measure weekly retention, which tells reviewers more than total sign-ups do.",
        a.paid === "no" ? "Ask for money: offer a paid pilot to your 5 most engaged users." : "Turn your pilots into recurring payments.",
        "Write down the one metric that shows the product works, and track it every week.",
      );
      break;
    case "Early Revenue":
      steps.push(
        "Work out your monthly revenue growth rate and what drives it.",
        "Identify the channel that brought your best paying customers and double down on it.",
        a.commitment === "full-time" ? "Prepare a 10-slide deck with your traction for accelerators." : "Decide whether you'll go full-time; most accelerators expect it.",
      );
      break;
    case "Scaling":
      steps.push(
        "Know your unit economics: what a customer costs to acquire and what they're worth.",
        "Plan your first key hires and what each one unlocks.",
        "Shortlist investors who have backed your sector at your stage.",
      );
      break;
  }
  return steps;
}

/* ------------------------------------------------------------------ */
/* 3. Fit matcher                                                      */
/* ------------------------------------------------------------------ */

/** Points are out of 100. Tune weights here. */
export const FIT_WEIGHTS = { stage: 45, sector: 20, team: 20, need: 15 };

export type FitGroup = "now" | "soon" | "later";
export interface FitReason { kind: "strength" | "gap"; text: string; action?: string }
export interface FitResult { program: Program; score: number; group: FitGroup; reasons: FitReason[]; /** True when the team is past every stage the program accepts. */ outgrown: boolean }

const NEED_LABEL: Record<Need, string> = {
  clarity: "clarity on your idea",
  mentorship: "mentorship",
  funding: "funding",
  workspace: "workspace",
  network: "network",
};

function programProvides(p: Program, need: Need): boolean {
  switch (need) {
    case "funding": return p.what_you_get.money !== null || p.type === "grant" || p.type === "accelerator" || p.type === "investor";
    case "mentorship": return p.what_you_get.mentorship;
    case "clarity": return p.what_you_get.mentorship && (p.stages_accepted.includes("Exploring") || p.stages_accepted.includes("Idea"));
    case "workspace": return p.what_you_get.workspace;
    case "network": return p.what_you_get.network;
  }
}

export function scoreProgram(p: Program, a: DiagnosticAnswers, stage: Stage): FitResult {
  const reasons: FitReason[] = [];
  let score = 0;
  let hardGaps = 0;

  // Stage
  const myIdx = stageIndex(stage);
  const accepted = p.stages_accepted.map(stageIndex);
  const earliest = Math.min(...accepted);
  let stageDistance = 0;
  if (accepted.includes(myIdx)) {
    score += FIT_WEIGHTS.stage;
    reasons.push({ kind: "strength", text: `They accept ${stage}-stage teams.` });
  } else if (earliest > myIdx) {
    stageDistance = earliest - myIdx;
    score += stageDistance === 1 ? FIT_WEIGHTS.stage / 2 : 0;
    reasons.push({
      kind: "gap",
      text: `They take teams from the ${STAGES[earliest]} stage. You're at ${stage}.`,
      action: nextStageAction(stage),
    });
  } else {
    stageDistance = -1; // you're past their stage
    reasons.push({ kind: "gap", text: `This program is built for earlier teams than yours.`, action: "Look at programs for your stage below; they'll give you more." });
  }

  // Sector
  const sectorAgnostic = p.sectors.length === 0;
  const sectorHit = a.sectors.find((s) => p.sectors.includes(s));
  if (sectorAgnostic) {
    score += FIT_WEIGHTS.sector * 0.75;
  } else if (sectorHit) {
    score += FIT_WEIGHTS.sector;
    reasons.push({ kind: "strength", text: `They focus on ${sectorHit}, which is your sector.` });
  } else {
    reasons.push({
      kind: "gap",
      text: `They focus on ${p.sectors.slice(0, 3).join(", ")}.`,
      action: "Only apply if you can clearly show how your idea fits their sector focus.",
    });
  }

  // Team
  let teamPoints = FIT_WEIGHTS.team;
  if (p.fit_signals.technical_founder && a.hasBuilder === "no") {
    teamPoints -= p.fit_signals.technical_founder === "required" ? FIT_WEIGHTS.team : FIT_WEIGHTS.team / 2;
    if (p.fit_signals.technical_founder === "required") hardGaps++;
    reasons.push({
      kind: "gap",
      text: `They ${p.fit_signals.technical_founder === "required" ? "expect" : "strongly prefer"} teams with a technical founder.`,
      action: "Find a cofounder who can build, through your college's coding club or a hackathon, before you apply.",
    });
  } else if (p.fit_signals.technical_founder && a.hasBuilder === "yes") {
    reasons.push({ kind: "strength", text: "You have someone who can build, which they look for." });
  }
  if (p.fit_signals.min_team_size && a.team === "solo") {
    teamPoints -= FIT_WEIGHTS.team / 2;
    reasons.push({
      kind: "gap",
      text: `They prefer teams of ${p.fit_signals.min_team_size} or more founders.`,
      action: "Bring on a cofounder whose skills complement yours.",
    });
  }
  if (p.fit_signals.full_time && a.commitment !== "full-time") {
    teamPoints -= FIT_WEIGHTS.team / 2;
    hardGaps++;
    reasons.push({
      kind: "gap",
      text: "They expect founders to work on the startup full-time.",
      action: "Apply once you can commit full-time, for example after graduation.",
    });
  }
  score += Math.max(0, teamPoints);

  // Need
  if (programProvides(p, a.need)) {
    score += FIT_WEIGHTS.need;
    reasons.push({ kind: "strength", text: `They offer ${NEED_LABEL[a.need]}, which is what you need most right now.` });
  }

  // Live eligibility and status from the ingestion pipeline.
  const e = p.eligibility ?? {};
  if (e.requires_registered_company || e.requires_dpiit) {
    reasons.push({
      kind: "gap",
      text: e.requires_dpiit ? "They require a DPIIT-recognised company." : "They require a registered company.",
      action: e.requires_dpiit ? "Register your company, then apply for DPIIT recognition on startupindia.gov.in (free)." : "Register a private limited company or LLP before applying.",
    });
  }
  if (p.status === "closed") {
    hardGaps++;
    reasons.push({ kind: "gap", text: "Applications are closed right now.", action: "Save it to your tracker. We'll show it here when the next cohort opens." });
  }

  let group: FitGroup;
  if (stageDistance === 0 && hardGaps === 0) group = "now";
  else if ((stageDistance === 0 && hardGaps <= 1) || stageDistance === 1) group = "soon";
  else group = "later";

  // Strengths first, always.
  reasons.sort((x, y) => (x.kind === y.kind ? 0 : x.kind === "strength" ? -1 : 1));
  return { program: p, score: Math.round(score), group, reasons, outgrown: stageDistance === -1 };
}

function nextStageAction(stage: Stage): string {
  switch (stage) {
    case "Exploring": return "Pick one problem and talk to 10 people who have it.";
    case "Idea": return "Talk to at least 11 potential users and record what you learn.";
    case "Validating": return "Build a working prototype and put it in front of real users.";
    case "Building": return "Get your first paying customer or paid pilot.";
    default: return "Grow recurring revenue month on month.";
  }
}

export function matchPrograms(programs: Program[], a: DiagnosticAnswers, stage: Stage): FitResult[] {
  return programs.map((p) => scoreProgram(p, a, stage)).sort((x, y) => y.score - x.score);
}

/* ------------------------------------------------------------------ */
/* 4. Readiness score (dashboard)                                      */
/* ------------------------------------------------------------------ */

export interface ReadinessItem { key: string; label: string; points: number; done: boolean; href: string }

export function readiness(input: {
  diagnosticDone: boolean;
  answers: DiagnosticAnswers | null;
  profile: FounderProfile | null;
  savedCount: number;
  bestCoachScore: number | null;
}): { score: number; items: ReadinessItem[] } {
  const p = input.profile;
  const filled = (s?: string) => !!s && s.trim().length >= 20;
  const a = input.answers;
  const items: ReadinessItem[] = [
    { key: "diagnostic", label: "Complete the stage diagnostic", points: 10, done: input.diagnosticDone, href: "/diagnostic" },
    { key: "matches", label: "Review your matched programs", points: 5, done: input.diagnosticDone, href: "/matches" },
    { key: "problem", label: "Write your problem statement", points: 15, done: filled(p?.problem), href: "/profile" },
    { key: "solution", label: "Describe your solution", points: 10, done: filled(p?.solution), href: "/profile" },
    { key: "users", label: "Talk to 11+ potential users", points: 20, done: !!a && (a.usersSpoken === "11-30" || a.usersSpoken === "30+"), href: "/diagnostic" },
    { key: "traction", label: "Record your traction with numbers", points: 10, done: filled(p?.traction) && /\d/.test(p!.traction), href: "/profile" },
    { key: "save", label: "Save a program to your tracker", points: 10, done: input.savedCount > 0, href: "/matches" },
    { key: "coach", label: "Get an answer to 7/10 with the coach", points: 20, done: (input.bestCoachScore ?? 0) >= 7, href: "/coach" },
  ];
  return { score: items.filter((i) => i.done).reduce((s, i) => s + i.points, 0), items };
}
