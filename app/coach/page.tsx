import { Suspense } from "react";
import { CoachView } from "@/components/coach/coach-view";
export const metadata = { title: "Application Coach · Outcomes" };
export default function CoachPage() {
  return <Suspense><CoachView /></Suspense>;
}
