import { NextResponse } from "next/server";
import { approvedTranslationsForClient, authoriseClientRequest, buildClientFeedXml } from "@/app/lib/language-studio/client-access";
import { addClientAccessLog, readLanguageStudioData } from "@/app/lib/language-studio/store";

export async function GET(req: Request) {
  const data = await readLanguageStudioData();
  const auth = authoriseClientRequest(data, req, "xml");
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = approvedTranslationsForClient(data, auth);
  await addClientAccessLog({
    clientId: auth.client.id,
    apiKeyId: auth.apiKey.id,
    format: "xml",
    path: new URL(req.url).pathname,
    status: 200,
    detail: `${rows.length} item(s) returned`,
  });
  return new NextResponse(buildClientFeedXml(rows), {
    status: 200,
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
