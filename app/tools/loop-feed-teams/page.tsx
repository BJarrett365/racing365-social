import { redirect } from "next/navigation";
import { LOOP_FEED_TEAMS_PATH } from "@/app/lib/configure/paths";

export default function LoopFeedTeamsRedirectPage() {
  redirect(LOOP_FEED_TEAMS_PATH);
}
