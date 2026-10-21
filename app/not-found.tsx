import { LinkButton } from "@/components/ui/button";
import { EmptyState, Page } from "@/components/ui/page";
export default function NotFound() {
  return <Page><EmptyState title="We couldn't find that page" body="It may have moved, or the link may be wrong." action={<LinkButton href="/">Go home</LinkButton>} /></Page>;
}
