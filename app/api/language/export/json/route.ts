import { POST as exportPost } from "@/app/api/language/export/xml/route";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  return exportPost(
    new Request(req.url, {
      method: "POST",
      headers: req.headers,
      body: JSON.stringify({ ...body, format: "json" }),
    }),
  );
}
