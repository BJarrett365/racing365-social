import { AudioStudioWorkspace } from "../AudioStudioWorkspace";
import { audioStudioToolById } from "../audio-studio-config";

export default function ElevenLabsEditingPage() {
  return <AudioStudioWorkspace activeTool={audioStudioToolById("elevenlabs-editing")} />;
}
