import { AudioStudioWorkspace } from "../AudioStudioWorkspace";
import { audioStudioToolById } from "../audio-studio-config";

export default function AudioTranscribePage() {
  return <AudioStudioWorkspace activeTool={audioStudioToolById("transcribe")} />;
}
