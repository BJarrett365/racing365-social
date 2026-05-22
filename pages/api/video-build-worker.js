import { runVideoBuildJob } from "@/app/lib/video-build-runner";

function authorizedInternalBuild(req) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return true;
  const auth = req.headers.authorization?.trim() ?? "";
  return auth === `Bearer ${secret}`;
}

/** @param {import("next").NextApiRequest} req @param {import("next").NextApiResponse} res */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }
  if (!authorizedInternalBuild(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const payload = req.body ?? {};
  const jobId = payload.jobId?.trim();
  const body = payload.body;
  if (!jobId || !body?.contentId || !body?.scenes?.length || !body?.script) {
    return res.status(400).json({ error: "jobId and build body required" });
  }

  await runVideoBuildJob(jobId, body);
  return res.status(200).json({ ok: true, jobId });
}

export const config = {
  type: "experimental-background",
};
