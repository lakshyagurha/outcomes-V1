import { Page } from "@/components/ui/page";
import { IdeaBankSkeleton } from "@/components/ideas/idea-bank";

export default function Loading() {
  return (
    <Page>
      <div className="mb-10 max-w-2xl">
        <div className="mb-4 h-3 w-24 animate-pulse bg-slate-100" />
        <div className="h-12 w-2/3 animate-pulse bg-slate-100" />
      </div>
      <IdeaBankSkeleton />
    </Page>
  );
}
