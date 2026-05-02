import { AudioStudioWorkspace } from "../AudioStudioWorkspace";
import { audioStudioToolById } from "../audio-studio-config";

export default function AudioVoiceCreatorPage() {
  return <AudioStudioWorkspace activeTool={audioStudioToolById("voice-creator")} />;
}
