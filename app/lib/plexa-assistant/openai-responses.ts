export type PlexaAssistantMessage = {
  role: "user" | "assistant";
  content: string;
};

export type OpenAiResponseOutput = {
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
      annotations?: Array<{
        type?: string;
        title?: string;
        url?: string;
      }>;
    }>;
  }>;
  output_text?: string;
};

export function messagesToResponsesInput(messages: PlexaAssistantMessage[]): Array<{ role: "user" | "assistant"; content: string }> {
  return messages
    .filter((message) => message.content.trim())
    .slice(-12)
    .map((message) => ({ role: message.role, content: message.content.trim() }));
}

export function extractResponseText(data: OpenAiResponseOutput): { text: string; sources: Array<{ title?: string; url: string }> } {
  if (data.output_text?.trim()) return { text: data.output_text.trim(), sources: [] };
  const textParts: string[] = [];
  const sourceMap = new Map<string, { title?: string; url: string }>();

  for (const item of data.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && content.text?.trim()) {
        textParts.push(content.text.trim());
      }
      for (const annotation of content.annotations ?? []) {
        if (annotation.url) {
          sourceMap.set(annotation.url, { title: annotation.title, url: annotation.url });
        }
      }
    }
  }

  return {
    text: textParts.join("\n\n").trim(),
    sources: [...sourceMap.values()],
  };
}
