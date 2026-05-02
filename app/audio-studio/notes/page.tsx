import { AudioStudioWorkspace } from "../AudioStudioWorkspace";
import { audioStudioToolById } from "../audio-studio-config";

export default function AudioNotesPage() {
  return <AudioStudioWorkspace activeTool={audioStudioToolById("notes")} />;
}
