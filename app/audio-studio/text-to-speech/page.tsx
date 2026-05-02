import { AudioStudioWorkspace } from "../AudioStudioWorkspace";
import { audioStudioToolById } from "../audio-studio-config";

export default function AudioTextToSpeechPage() {
  return <AudioStudioWorkspace activeTool={audioStudioToolById("text-to-speech")} />;
}
