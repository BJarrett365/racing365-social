/** Poster rel next to a backdrop video (`editor-upload` naming for Runway vs camera). */
export function inferredBackdropPosterRelFromVideo(videoRel: string): string {
  const v = videoRel.replace(/\\/g, "/");
  const i = v.lastIndexOf("/");
  const dir = i >= 0 ? v.slice(0, i) : "";
  const base = i >= 0 ? v.slice(i + 1) : v;
  if (base === "custom-bg.mp4") return dir ? `${dir}/custom-bg-video-frame.png` : "custom-bg-video-frame.png";
  if (/^camera-record\.(webm|mp4)$/i.test(base)) return dir ? `${dir}/camera-record-frame.png` : "camera-record-frame.png";
  return dir ? `${dir}/custom-bg-video-frame.png` : "custom-bg-video-frame.png";
}
