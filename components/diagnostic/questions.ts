import type { DiagnosticAnswers } from "@/lib/types";
import { SECTORS } from "@/lib/types";

export type Question = {
  key: keyof DiagnosticAnswers;
  title: string;
  hint?: string;
  multi?: boolean;
  options: { value: string; label: string }[];
  /** Skip the question (and use `skipValue`) when this returns true. */
  skipIf?: (a: Partial<DiagnosticAnswers>) => boolean;
  skipValue?: string;
};

export const QUESTIONS: Question[] = [
  { key: "problem", title: "Do you have a specific problem you're working on?", options: [
    { value: "none", label: "No, not yet" }, { value: "rough", label: "A rough idea" }, { value: "clear", label: "A clear problem statement" } ] },
  { key: "usersSpoken", title: "How many potential users have you spoken to about this problem?", hint: "Count real conversations, not survey responses from friends.", options: [
    { value: "0", label: "None yet" }, { value: "1-10", label: "1–10" }, { value: "11-30", label: "11–30" }, { value: "30+", label: "More than 30" } ] },
  { key: "built", title: "Have you built anything people can use?", options: [
    { value: "nothing", label: "Nothing yet" }, { value: "mockups", label: "Mockups or designs only" }, { value: "prototype", label: "A working prototype" }, { value: "live", label: "A live product" } ] },
  { key: "activeUsers", title: "How many people are actively using it?", hint: "People who've used it in the last month.",
    skipIf: (a) => a.built === "nothing" || a.built === "mockups", skipValue: "0", options: [
    { value: "0", label: "None yet" }, { value: "1-10", label: "1–10" }, { value: "11-100", label: "11–100" }, { value: "100+", label: "More than 100" } ] },
  { key: "paid", title: "Has anyone paid you?", options: [
    { value: "no", label: "No" }, { value: "pilots", label: "Pre-orders or paid pilots" }, { value: "recurring", label: "Yes, recurring payments" } ] },
  { key: "team", title: "How big is your founding team?", options: [
    { value: "solo", label: "Just me" }, { value: "2-3", label: "2–3 founders" }, { value: "4+", label: "4 or more" } ] },
  { key: "hasBuilder", title: "Does your team have someone who can build the product?", hint: "Someone who can write code, or build the hardware.", options: [
    { value: "yes", label: "Yes" }, { value: "no", label: "No" } ] },
  { key: "sectors", title: "Which sectors does your idea fall into?", hint: "Pick up to three.", multi: true,
    options: SECTORS.map((s) => ({ value: s, label: s })) },
  { key: "commitment", title: "How much time can you give it?", options: [
    { value: "weekends", label: "Weekends" }, { value: "part-time", label: "Part-time, alongside classes" }, { value: "full-time", label: "Full-time after graduation" } ] },
  { key: "need", title: "What do you need most right now?", options: [
    { value: "clarity", label: "Clarity on my idea" }, { value: "mentorship", label: "Mentorship" }, { value: "funding", label: "Funding" }, { value: "workspace", label: "Workspace" }, { value: "network", label: "Network" } ] },
];
