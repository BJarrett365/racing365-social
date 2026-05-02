import { AudioStudioWorkspace } from "../AudioStudioWorkspace";
import { audioStudioToolById } from "../audio-studio-config";

export default function AudioVoiceChangerPage() {
  return <AudioStudioWorkspace activeTool={audioStudioToolById("voice-changer")} />;
}
