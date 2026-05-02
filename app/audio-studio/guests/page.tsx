import { AudioStudioWorkspace } from "../AudioStudioWorkspace";
import { audioStudioToolById } from "../audio-studio-config";

export default function AudioGuestsPage() {
  return <AudioStudioWorkspace activeTool={audioStudioToolById("guests")} />;
}
