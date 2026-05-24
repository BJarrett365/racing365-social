import { redirect } from "next/navigation";
import { LOOP_FEED_PRIORITY_REPORTERS_PATH } from "@/app/lib/configure/paths";

export default function LoopFeedPriorityReportersRedirectPage() {
  redirect(LOOP_FEED_PRIORITY_REPORTERS_PATH);
}
