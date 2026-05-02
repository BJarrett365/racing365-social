import { AudioStudioWorkspace } from "../AudioStudioWorkspace";
import { audioStudioToolById } from "../audio-studio-config";

export default function AudioVoiceIsolatorPage() {
  return <AudioStudioWorkspace activeTool={audioStudioToolById("voice-isolator")} />;
}
