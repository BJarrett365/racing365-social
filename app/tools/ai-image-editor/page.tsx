import { redirect } from "next/navigation";

/** @deprecated Use `/tools/image-editor`. */
export default function AiImageEditorRedirectPage() {
  redirect("/tools/image-editor");
}
