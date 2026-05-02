import { AudioStudioWorkspace } from "../AudioStudioWorkspace";
import { audioStudioToolById } from "../audio-studio-config";

export default function ElevenLabsRecordingPage() {
  return <AudioStudioWorkspace activeTool={audioStudioToolById("elevenlabs-recording")} />;
}
