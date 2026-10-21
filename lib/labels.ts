import type { ProgramType, TrackerStatus } from "./types";
export const TYPE_LABEL: Record<ProgramType, string> = {
  grant: "Grant", incubator: "Incubator", accelerator: "Accelerator", competition: "Competition", investor: "Investor",
};
export const STATUS_LABEL: Record<TrackerStatus, string> = {
  interested: "Interested", drafting: "Drafting", submitted: "Submitted", interview: "Interview", accepted: "Accepted", rejected: "Rejected",
};
