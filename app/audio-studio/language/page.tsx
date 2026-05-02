import { AudioStudioWorkspace } from "../AudioStudioWorkspace";
import { audioStudioToolById } from "../audio-studio-config";

export default function AudioLanguagePage() {
  return <AudioStudioWorkspace activeTool={audioStudioToolById("language")} />;
}
