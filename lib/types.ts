export const STAGES = ["Exploring", "Idea", "Validating", "Building", "Early Revenue", "Scaling"] as const;
export type Stage = (typeof STAGES)[number];

export const SECTORS = [
  "EdTech", "FinTech", "HealthTech", "AgriTech", "ClimateTech", "SaaS / B2B",
  "Consumer", "D2C / Commerce", "Deep Tech / Hardware", "AI / ML", "Social Impact", "Mobility",
] as const;
export type Sector = (typeof SECTORS)[number];

export type Need = "clarity" | "mentorship" | "funding" | "workspace" | "network";

export interface DiagnosticAnswers {
  problem: "none" | "rough" | "clear";
  usersSpoken: "0" | "1-10" | "11-30" | "30+";
  built: "nothing" | "mockups" | "prototype" | "live";
  activeUsers: "0" | "1-10" | "11-100" | "100+";
  paid: "no" | "pilots" | "recurring";
  team: "solo" | "2-3" | "4+";
  hasBuilder: "yes" | "no";
  sectors: Sector[];
  commitment: "weekends" | "part-time" | "full-time";
  need: Need;
}

export type ProgramType = "grant" | "incubator" | "accelerator" | "competition" | "investor";

export interface Program {
  slug: string;
  name: string;
  organisation: string;
  type: ProgramType;
  summary: string;
  stages_accepted: Stage[];
  /** Empty array = sector-agnostic. */
  sectors: Sector[];
  what_you_get: {
    money: string | null;
    mentorship: boolean;
    workspace: boolean;
    network: boolean;
  };
  what_they_take: {
    kind: "equity" | "fees" | "none" | "unknown";
    equity_percent: number | null;
    notes: string | null;
  };
  what_they_look_for: string[];
  /** Machine-readable preferences used by the fit matcher. */
  fit_signals: {
    technical_founder: "required" | "preferred" | null;
    min_team_size: number | null;
    full_time: boolean;
    student_only: boolean;
  };
  typical_timeline: string | null;
  deadline: string | null;
  application_link: string;
  red_flags: string[];
  verified: boolean;
  last_checked: string | null;
  /** Live fields, maintained by the ingestion pipeline (lib/ingest). */
  status?: ProgramStatus;
  opens_at?: string | null;
  cohort_name?: string | null;
  eligibility?: Eligibility;
  poster_url?: string | null;
  logo_url?: string | null;
  /** Primary colour from the program's own site, e.g. "#FE5A22". */
  brand_color?: string | null;
  poster_source_url?: string | null;
  /** Per-field verification, keyed by field path (e.g. "deadline", "what_you_get.money"). */
  field_meta?: Record<string, FieldMeta>;
}

export type ProgramStatus = "open" | "rolling" | "closed" | "upcoming" | "unknown";

export interface Eligibility {
  min_age?: number | null;
  max_age?: number | null;
  education?: "student" | "graduate" | "any" | null;
  requires_registered_company?: boolean | null;
  requires_dpiit?: boolean | null;
  states?: string[] | null;
  women_led_only?: boolean | null;
  notes?: string | null;
}

export interface FieldMeta { verified: boolean; source_url: string; checked_at: string; quote?: string | null }

export type TrackerStatus = "interested" | "drafting" | "submitted" | "interview" | "accepted" | "rejected";

export interface SavedProgram {
  program_slug: string;
  status: TrackerStatus;
  deadline: string | null;
  notes: string;
  updated_at: string;
}

export interface FounderProfile {
  startup_name: string;
  problem: string;
  solution: string;
  users_spoken_to: string;
  traction: string;
  team: string;
  sector: string;
}

export interface CoachResult {
  overall: number;
  scores: { specificity: number; evidence: number; clarity: number; fit_to_program: number };
  vague_phrases: { phrase: string; why: string; ask_yourself: string }[];
  missing: string[];
  follow_up_questions: string[];
  strongest_line: string;
}

export interface CoachReview {
  id: string;
  program_slug: string;
  question: string;
  draft: string;
  result: CoachResult;
  created_at: string;
}
