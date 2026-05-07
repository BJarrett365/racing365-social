"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Panel } from "@/app/components/Panel";
import { R365Button } from "@/app/components/R365Button";

type ApiState = {
  loading: boolean;
  message: string;
  error: string;
};

type GuestSpeaker = {
  id: string;
  default_label: string;
  display_name: string;
  role: string;
  language_in: string;
  language_out: string;
  assigned_user_id?: string;
  colour: string;
  confidence_score: number | null;
};

type GuestTranscriptSegment = {
  id: string;
  speaker_id: string;
  start_time?: number;
  end_time?: number;
  text: string;
  confidence_score: number | null;
  edited_text: string;
  note?: string;
  is_highlighted_quote: boolean;
};

type SpeakerMark = {
  speaker_id: string;
  timestamp: number;
};

type RecordingMode = "same-room" | "guest-room";

type GuestSummary = {
  title: string;
  shortSummary: string;
  keyQuotes: string[];
  mainStoryAngles: string[];
  possibleHeadlines: string[];
  actionPoints: string[];
  followUpQuestions: string[];
  cleanArticleBrief: string;
  socialPostIdeas: string[];
  whatEachGuestSaid: string[];
};

type ProcessResponse = {
  recording: {
    id: string;
    title: string;
    sport: string;
    brand: string;
    date: string;
    duration: number;
    audio_url: string;
    status: string;
    transcription_provider?: string;
    diarisation_enabled?: boolean;
    diarisation_warning?: string;
    speaker_markers_used?: boolean;
    recording_mode: string;
    invite_url: string;
    speakers: GuestSpeaker[];
    transcript_segments: GuestTranscriptSegment[];
    summary: GuestSummary | null;
  };
  file: { id: string; relPath: string };
  transcript: { id: string; audioFileId?: string };
};

type GuestInviteResponse = {
  session: GuestSessionState;
  joinUrl: string;
};

type DailyRoomResponse = {
  session?: GuestSessionState;
  roomUrl: string;
  roomName?: string;
};

type GuestSessionState = {
  id: string;
  hostUserId: string;
  hostName?: string;
  hostEmail?: string;
  dailyRoomUrl?: string;
  speakers: Array<{ id: string; displayName: string; role: string; languageIn: string; languageOut: string; assignedUserId?: string }>;
  participants?: GuestSessionParticipant[];
  tracks: Array<{ id: string; userId: string; displayName: string; createdAt: string }>;
};

type GuestSessionParticipant = {
  userId: string;
  name: string;
  email: string;
  role: "host" | "guest";
  speakerId?: string;
  displayName: string;
  languageIn: string;
  languageOut: string;
  recordingConsentAcceptedAt?: string;
  lastTrackAt?: string;
};

type RegisteredMeetingUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

const acceptedAudio = ".mp3,.wav,.m4a,.mp4,.webm,audio/*,video/mp4,video/webm";
const dailyIframeAllow = "microphone; camera; autoplay; display-capture; fullscreen; screen-wake-lock";
const speakerColours = ["#38bdf8", "#22c55e", "#f97316", "#a78bfa", "#f43f5e", "#14b8a6", "#eab308", "#6366f1", "#84cc16", "#ec4899", "#06b6d4"];
const languageOptions = [
  ["en", "English"],
  ["cs", "Czech"],
  ["da", "Danish"],
  ["it", "Italian"],
  ["ur", "Urdu"],
  ["pa", "Punjabi"],
  ["hi", "Hindi"],
  ["es", "Spanish"],
  ["fr", "French"],
  ["de", "German"],
] as const;

export function AudioWithGuestsWorkspace() {
  const [projectId, setProjectId] = useState("default-audio-project");
  const [title, setTitle] = useState("Post-match interview");
  const [language, setLanguage] = useState("en");
  const [recordingMode, setRecordingMode] = useState<RecordingMode>("guest-room");
  const [guestCount, setGuestCount] = useState(1);
  const [speakers, setSpeakers] = useState<GuestSpeaker[]>(() => createDefaultSpeakers(1));
  const [segments, setSegments] = useState<GuestTranscriptSegment[]>([]);
  const [summary, setSummary] = useState<GuestSummary | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [recordedFile, setRecordedFile] = useState<File | null>(null);
  const [removeNoise, setRemoveNoise] = useState(true);
  const [audioUrl, setAudioUrl] = useState("");
  const [recording, setRecording] = useState(false);
  const [recordingPaused, setRecordingPaused] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingLevel, setRecordingLevel] = useState(0);
  const [activeSpeakerId, setActiveSpeakerId] = useState("");
  const [speakerMarks, setSpeakerMarks] = useState<SpeakerMark[]>([]);
  const [search, setSearch] = useState("");
  const [transcriptId, setTranscriptId] = useState("");
  const [audioFileId, setAudioFileId] = useState("");
  const [api, setApi] = useState<ApiState>({ loading: false, message: "", error: "" });
  const [diarisationStatus, setDiarisationStatus] = useState("");
  const [namesSaved, setNamesSaved] = useState(false);
  const [currentUser, setCurrentUser] = useState<RegisteredMeetingUser | null>(null);
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredMeetingUser[]>([]);
  const [guestSessionId, setGuestSessionId] = useState("");
  const [guestSession, setGuestSession] = useState<GuestSessionState | null>(null);
  const [inviteUrl, setInviteUrl] = useState("");
  const [dailyRoomUrl, setDailyRoomUrl] = useState("");
  const [translatedScript, setTranslatedScript] = useState("");
  const [hostMeetingStarted, setHostMeetingStarted] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const meterAnimationRef = useRef<number | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  const fileForProcessing = recordedFile ?? uploadedFile;
  const transcriptText = useMemo(() => serialiseTranscript(speakers, segments), [segments, speakers]);
  const filteredSegments = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return segments;
    return segments.filter((segment) => {
      const speaker = speakers.find((item) => item.id === segment.speaker_id);
      return [
        speaker?.display_name,
        segment.text,
        segment.edited_text,
        segment.note,
      ].some((value) => value?.toLowerCase().includes(term));
    });
  }, [search, segments, speakers]);
  const highlightedQuotes = segments.filter((segment) => segment.is_highlighted_quote);

  useEffect(() => {
    setSpeakers((current) => reconcileSpeakers(current, guestCount));
  }, [guestCount]);

  useEffect(() => {
    void loadMeetingUsers();
  }, []);

  useEffect(() => {
    return () => {
      stopRecordingCleanup();
      stopHostMeeting();
      if (audioUrl.startsWith("blob:")) URL.revokeObjectURL(audioUrl);
    };
    // Cleanup only on unmount; the active blob URL is revoked when replaced.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadMeetingUsers() {
    try {
      const [meRes, usersRes] = await Promise.all([
        fetch("/api/auth/me", { credentials: "include", cache: "no-store" }),
        fetch("/api/audio/guests/users", { credentials: "include", cache: "no-store" }),
      ]);
      const meData = await jsonOrThrow<{ user: RegisteredMeetingUser }>(meRes);
      setCurrentUser(meData.user);
      setSpeakers((current) => defaultHostSpeakerToUser(current, meData.user));
      const usersData = await jsonOrThrow<{ users: RegisteredMeetingUser[] }>(usersRes);
      setRegisteredUsers(usersData.users ?? []);
    } catch {
      // The page still works with manual names if user lookup is unavailable.
    }
  }

  async function startRecording() {
    try {
      setApi({ loading: false, message: "", error: "" });
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Microphone recording is not supported in this browser.");
      if (typeof MediaRecorder === "undefined") throw new Error("Browser recording is not supported in this browser.");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        if (blob.size > 0) {
          const file = new File([blob], `audio-with-guests-${Date.now()}.${extensionForMime(blob.type)}`, {
            type: blob.type || "audio/webm",
          });
          setRecordedFile(file);
          setUploadedFile(null);
          replaceAudioUrl(URL.createObjectURL(file));
        }
        stopRecordingCleanup();
      };
      recorderRef.current = recorder;
      streamRef.current = stream;
      setActiveSpeakerId(speakers[0]?.id ?? "");
      setSpeakerMarks(speakers[0]?.id ? [{ speaker_id: speakers[0].id, timestamp: 0 }] : []);
      setRecording(true);
      setRecordingPaused(false);
      setRecordingSeconds(0);
      startMeter(stream);
      recorder.start(1000);
      timerRef.current = window.setInterval(() => setRecordingSeconds((seconds) => seconds + 1), 1000);
    } catch (error) {
      stopRecordingCleanup();
      setApi({ loading: false, message: "", error: error instanceof Error ? error.message : "Could not start recording." });
    }
  }

  async function startHostMeeting() {
    try {
      setApi({ loading: true, message: "Starting Daily video room...", error: "" });
      const sessionId = guestSessionId || (await createInviteSession({ silent: true })).sessionId;
      const data = await jsonOrThrow<DailyRoomResponse>(
        await fetch(`/api/audio/guests/sessions/${sessionId}/daily-room`, {
          method: "POST",
          credentials: "include",
        }),
      );
      setDailyRoomUrl(data.roomUrl);
      setHostMeetingStarted(true);
      setApi({ loading: false, message: "Daily video room started. Guests using the invite link can join the same room.", error: "" });
    } catch (error) {
      stopHostMeeting();
      setApi({ loading: false, message: "", error: error instanceof Error ? error.message : "Could not start host meeting." });
    }
  }

  function stopHostMeeting() {
    setHostMeetingStarted(false);
    setDailyRoomUrl("");
  }

  function pauseRecording() {
    const recorder = recorderRef.current;
    if (!recorder) return;
    if (recorder.state === "recording") {
      recorder.pause();
      setRecordingPaused(true);
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
      timerRef.current = null;
      return;
    }
    if (recorder.state === "paused") {
      recorder.resume();
      setRecordingPaused(false);
      timerRef.current = window.setInterval(() => setRecordingSeconds((seconds) => seconds + 1), 1000);
    }
  }

  function stopRecording() {
    if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
  }

  function stopRecordingCleanup() {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    if (meterAnimationRef.current !== null) cancelAnimationFrame(meterAnimationRef.current);
    timerRef.current = null;
    meterAnimationRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
    void audioContextRef.current?.close().catch(() => undefined);
    audioContextRef.current = null;
    setRecording(false);
    setRecordingPaused(false);
    setRecordingLevel(0);
  }

  function startMeter(stream: MediaStream) {
    const AudioContextCtor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;
    const context = new AudioContextCtor();
    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);
    audioContextRef.current = context;
    const data = new Uint8Array(analyser.fftSize);
    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (const value of data) {
        const centred = (value - 128) / 128;
        sum += centred * centred;
      }
      setRecordingLevel(Math.min(1, Math.max(0, (Math.sqrt(sum / data.length) - 0.006) / 0.12)));
      meterAnimationRef.current = requestAnimationFrame(tick);
    };
    tick();
  }

  function selectUpload(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setUploadedFile(file);
    setRecordedFile(null);
    setSpeakerMarks([]);
    setActiveSpeakerId("");
    replaceAudioUrl(URL.createObjectURL(file));
    setApi({ loading: false, message: "", error: "" });
  }

  function deleteCurrentAudio() {
    setUploadedFile(null);
    setRecordedFile(null);
    setRecordingSeconds(0);
    setSegments([]);
    setSpeakerMarks([]);
    setActiveSpeakerId("");
    setSummary(null);
    setTranscriptId("");
    setAudioFileId("");
    setDiarisationStatus("");
    replaceAudioUrl("");
    setApi({ loading: false, message: "Recording/upload removed.", error: "" });
  }

  function replaceAudioUrl(nextUrl: string) {
    setAudioUrl((current) => {
      if (current.startsWith("blob:")) URL.revokeObjectURL(current);
      return nextUrl;
    });
  }

  async function processRecording() {
    if (!fileForProcessing) {
      setApi({ loading: false, message: "", error: "Upload or record audio before processing." });
      return;
    }
    setApi({ loading: true, message: "Transcribing audio and preparing guest transcript...", error: "" });
    try {
      const form = new FormData();
      form.set("projectId", projectId);
      form.set("title", title);
      form.set("language", language);
      form.set("guestCount", String(guestCount));
      form.set("recordingMode", recordingMode);
      form.set("source", recordedFile ? "recording" : "upload");
      form.set("removeBackgroundNoise", removeNoise ? "true" : "false");
      form.set("speakers", JSON.stringify(speakers));
      form.set("speakerMarks", JSON.stringify(speakerMarks));
      form.set("file", fileForProcessing);
      const data = await jsonOrThrow<ProcessResponse>(
        await fetch("/api/audio/guests/process", { method: "POST", body: form, credentials: "include" }),
      );
      setSpeakers((current) => data.recording.speakers.map((speaker) => {
        const existing = current.find((item) => item.id === speaker.id || item.default_label === speaker.default_label);
        return {
          ...speaker,
          language_in: existing?.language_in || speaker.language_in || "en",
          language_out: existing?.language_out || speaker.language_out || "en",
        };
      }));
      setSegments(data.recording.transcript_segments.map((segment) => ({ ...segment, edited_text: segment.edited_text || "" })));
      setTranscriptId(data.transcript.id);
      setAudioFileId(data.file.id);
      setSummary(null);
      setDiarisationStatus(
        data.recording.speaker_markers_used
          ? "Speaker labels used your speaking markers because automatic voice detection only found one voice."
          : data.recording.diarisation_enabled
          ? "Voice detection used ElevenLabs diarisation. Check labels and correct any weak speaker splits."
          : data.recording.diarisation_warning
            ? `Voice detection did not run, so the opening speaker has been set as Host. ${data.recording.diarisation_warning}`
            : "Voice detection did not run, so the opening speaker has been set as Host. Assign guest lines manually.",
      );
      if (data.recording.audio_url) replaceAudioUrl(data.recording.audio_url);
      setApi({ loading: false, message: "Transcript ready. Assign speakers and generate the sports summary.", error: "" });
    } catch (error) {
      setApi({ loading: false, message: "", error: error instanceof Error ? error.message : "Could not process recording." });
    }
  }

  async function generateSummary() {
    if (!transcriptText.trim()) {
      setApi({ loading: false, message: "", error: "Create or edit a transcript before generating a summary." });
      return;
    }
    setApi({ loading: true, message: "Generating sports-first interview notes...", error: "" });
    try {
      const data = await jsonOrThrow<{ summary: GuestSummary }>(
        await fetch("/api/audio/guests/summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ projectId, transcript: transcriptText, transcriptId, audioFileId, title }),
        }),
      );
      setSummary(data.summary);
      setApi({ loading: false, message: "AI summary ready.", error: "" });
    } catch (error) {
      setApi({ loading: false, message: "", error: error instanceof Error ? error.message : "Could not generate summary." });
    }
  }

  async function createInviteSession(options: { silent?: boolean } = {}): Promise<{ sessionId: string; joinUrl: string }> {
    if (guestSessionId && inviteUrl) return { sessionId: guestSessionId, joinUrl: inviteUrl };
    if (!options.silent) setApi({ loading: true, message: "Creating guest invite link...", error: "" });
    try {
      const data = await jsonOrThrow<GuestInviteResponse>(
        await fetch("/api/audio/guests/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            projectId,
            title,
            speakers: speakers.map((speaker) => ({
              id: speaker.id,
              displayName: speaker.default_label === "Host" && currentUser
                ? speaker.display_name || currentUser.name || currentUser.email
                : speaker.display_name,
              role: speaker.role,
              languageIn: speaker.language_in,
              languageOut: speaker.language_out,
              assignedUserId: speaker.assigned_user_id,
            })),
          }),
        }),
      );
      setGuestSessionId(data.session.id);
      setGuestSession(data.session);
      setInviteUrl(data.joinUrl);
      if (data.session.dailyRoomUrl) setDailyRoomUrl(data.session.dailyRoomUrl);
      setSpeakers((current) => syncSpeakersFromSession(current, data.session));
      await navigator.clipboard?.writeText(data.joinUrl).catch(() => undefined);
      if (!options.silent) setApi({ loading: false, message: "Invite link created and copied.", error: "" });
      return { sessionId: data.session.id, joinUrl: data.joinUrl };
    } catch (error) {
      if (!options.silent) setApi({ loading: false, message: "", error: error instanceof Error ? error.message : "Could not create invite link." });
      throw error;
    }
  }

  async function refreshGuestSession() {
    if (!guestSessionId) {
      setApi({ loading: false, message: "", error: "Create the invite before refreshing meeting users." });
      return;
    }
    setApi({ loading: true, message: "Refreshing meeting users...", error: "" });
    try {
      const data = await jsonOrThrow<{ session: GuestSessionState }>(
        await fetch(`/api/audio/guests/sessions/${guestSessionId}`, { credentials: "include", cache: "no-store" }),
      );
      setGuestSession(data.session);
      if (data.session.dailyRoomUrl) setDailyRoomUrl(data.session.dailyRoomUrl);
      setSpeakers((current) => syncSpeakersFromSession(current, data.session));
      setApi({ loading: false, message: "Meeting users refreshed.", error: "" });
    } catch (error) {
      setApi({ loading: false, message: "", error: error instanceof Error ? error.message : "Could not refresh meeting users." });
    }
  }

  async function translateScript() {
    if (!transcriptText.trim()) {
      setApi({ loading: false, message: "", error: "Create a transcript before translating." });
      return;
    }
    const targetLanguage = speakers[0]?.language_out || "en";
    setApi({ loading: true, message: "Translating interview script...", error: "" });
    try {
      const data = await jsonOrThrow<{ translatedText: string }>(
        await fetch("/api/audio/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ projectId, transcript: transcriptText, transcriptId, language: targetLanguage, previewOnly: true }),
        }),
      );
      setTranslatedScript(data.translatedText);
      setApi({ loading: false, message: "Translated script ready.", error: "" });
    } catch (error) {
      setApi({ loading: false, message: "", error: error instanceof Error ? error.message : "Could not translate script." });
    }
  }

  function updateSpeaker(id: string, patch: Partial<GuestSpeaker>) {
    setNamesSaved(false);
    setSpeakers((current) => current.map((speaker) => speaker.id === id ? { ...speaker, ...patch } : speaker));
  }

  function saveSpeakerNames() {
    setSpeakers((current) => current.map((speaker) => ({
      ...speaker,
      display_name: speaker.display_name.trim() || speaker.default_label,
      role: speaker.role.trim() || (speaker.default_label === "Host" ? "Host" : "Guest"),
    })));
    setNamesSaved(true);
    setApi({ loading: false, message: "Guest names saved to the transcript editor.", error: "" });
  }

  function selectRegisteredUserForSpeaker(speakerId: string, userId: string) {
    const user = registeredUsers.find((item) => item.id === userId);
    if (!user) return;
    updateSpeaker(speakerId, {
      display_name: user.name || user.email,
      assigned_user_id: user.id,
      role: speakers.find((speaker) => speaker.id === speakerId)?.default_label === "Host" ? "Host" : "Guest",
    });
  }

  function markSpeaker(speakerId: string) {
    setActiveSpeakerId(speakerId);
    setSpeakerMarks((current) => {
      const timestamp = recording ? recordingSeconds : audioElementRef.current?.currentTime ?? recordingSeconds;
      const previous = current[current.length - 1];
      if (previous?.speaker_id === speakerId && Math.abs(previous.timestamp - timestamp) < 1) return current;
      return [...current, { speaker_id: speakerId, timestamp }];
    });
  }

  function updateSegment(id: string, patch: Partial<GuestTranscriptSegment>) {
    setSegments((current) => current.map((segment) => segment.id === id ? { ...segment, ...patch } : segment));
  }

  function mergeSpeaker(fromId: string, toId: string) {
    if (!fromId || !toId || fromId === toId) return;
    setSegments((current) => current.map((segment) => segment.speaker_id === fromId ? { ...segment, speaker_id: toId } : segment));
    setSpeakers((current) => current.filter((speaker) => speaker.id !== fromId));
  }

  function splitSegment(segment: GuestTranscriptSegment) {
    const text = segment.edited_text || segment.text;
    const midpoint = Math.max(1, Math.floor(text.length / 2));
    const firstText = text.slice(0, midpoint).trim();
    const secondText = text.slice(midpoint).trim();
    if (!firstText || !secondText) return;
    const midTime = Number.isFinite(segment.start_time) && Number.isFinite(segment.end_time)
      ? ((segment.start_time ?? 0) + (segment.end_time ?? 0)) / 2
      : undefined;
    const next: GuestTranscriptSegment[] = [
      { ...segment, text: firstText, edited_text: firstText, end_time: midTime },
      { ...segment, id: localId("seg"), text: secondText, edited_text: secondText, start_time: midTime, is_highlighted_quote: false },
    ];
    setSegments((current) => current.flatMap((item) => item.id === segment.id ? next : [item]));
  }

  function exportContent(format: "transcript" | "summary" | "quotes" | "json") {
    const payload = format === "summary"
      ? summaryToMarkdown(summary)
      : format === "quotes"
        ? highlightedQuotes.map((segment) => `${speakerName(speakers, segment.speaker_id)}: "${segment.edited_text || segment.text}"`).join("\n\n")
        : format === "json"
          ? JSON.stringify({ title, speakers, transcript_segments: segments, summary }, null, 2)
          : transcriptText;
    if (!payload.trim()) {
      setApi({ loading: false, message: "", error: `Nothing to export for ${format}.` });
      return;
    }
    const extension = format === "json" ? "json" : "txt";
    const mimeType = format === "json" ? "application/json" : "text/plain";
    const url = URL.createObjectURL(new Blob([payload], { type: mimeType }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slug(title || "audio-with-guests")}-${format}.${extension}`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-3 text-[color:var(--text-primary)] shadow-sm">
        <div className="flex flex-wrap gap-2">
          <ModeButton
            title="Same room"
            active={recordingMode === "same-room"}
            onSelect={() => {
              setRecordingMode("same-room");
              stopHostMeeting();
            }}
          />
          <ModeButton
            title="Guest room + video"
            active={recordingMode === "guest-room"}
            onSelect={() => setRecordingMode("guest-room")}
          />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <div className="space-y-6">
          <Panel title="Guest Setup">
            {currentUser ? (
              <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs leading-5 text-[color:var(--text-secondary)]">
                Host defaults to <span className="font-bold text-[color:var(--text-primary)]">{currentUser.name || currentUser.email}</span> from your Planet Sport Studio login.
              </div>
            ) : null}
            <label className="block text-sm font-semibold">
              Number of guests
              <select value={guestCount} onChange={(event) => setGuestCount(Number(event.target.value))} className="mt-2 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2">
                {Array.from({ length: 10 }, (_, index) => index + 1).map((count) => <option key={count} value={count}>{count}</option>)}
              </select>
            </label>
            <div className="mt-4 space-y-3">
              {speakers.map((speaker) => (
                <div key={speaker.id} className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: speaker.colour }} />
                    <span className="text-xs font-bold uppercase tracking-wide text-[color:var(--text-muted)]">{speaker.default_label}</span>
                    {segments.some((segment) => segment.speaker_id === speaker.id) ? (
                      <span className="ml-auto rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-600">
                        Detected
                      </span>
                    ) : null}
                    {activeSpeakerId === speaker.id ? (
                      <span className="ml-auto rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-cyan-600">
                        Speaking
                      </span>
                    ) : null}
                  </div>
                  <input
                    value={speaker.display_name}
                    onChange={(event) => updateSpeaker(speaker.id, { display_name: event.target.value })}
                    className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm font-semibold"
                  />
                  {registeredUsers.length ? (
                    <label className="mt-2 block text-[10px] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
                      Select registered user
                      <select
                        value=""
                        onChange={(event) => selectRegisteredUserForSpeaker(speaker.id, event.target.value)}
                        className="mt-1 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-xs font-semibold text-[color:var(--text-primary)]"
                      >
                        <option value="">Choose a Planet Sport Studio user...</option>
                        {registeredUsers.map((user) => (
                          <option key={user.id} value={user.id}>{user.name || user.email} - {user.role}</option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  <input
                    value={speaker.role}
                    onChange={(event) => updateSpeaker(speaker.id, { role: event.target.value })}
                    className="mt-2 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-xs"
                    placeholder="Role, e.g. manager, player, agent"
                  />
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <LanguageSelect label="Speaks" value={speaker.language_in} onChange={(value) => updateSpeaker(speaker.id, { language_in: value })} />
                    <LanguageSelect label="Translate to" value={speaker.language_out} onChange={(value) => updateSpeaker(speaker.id, { language_out: value })} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <StudioButton onClick={saveSpeakerNames} tone="primary">Save Names</StudioButton>
                <StudioButton onClick={processRecording} disabled={api.loading || !fileForProcessing}>Detect Voices</StudioButton>
              </div>
              {namesSaved ? <span className="text-xs font-semibold text-emerald-600">Names saved</span> : null}
            </div>
          </Panel>

          <Panel title={recordingMode === "guest-room" ? "Guest Room Audio" : "Same Room Record or Upload"}>
            <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4 text-[color:var(--text-primary)] shadow-sm">
              <LiveBars level={recordingLevel} active={recording && !recordingPaused} />
              <div className="mt-3 flex items-center justify-between text-sm font-black text-[color:var(--text-primary)]">
                <span>{recording ? recordingPaused ? "Paused" : "Recording" : fileForProcessing ? "Audio ready" : "Ready"}</span>
                <span className="font-mono">{formatDuration(recordingSeconds)}</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <StudioButton onClick={recording ? stopRecording : startRecording} disabled={api.loading} tone={recording ? "danger" : "primary"}>
                  {recording ? "Stop" : "Record"}
                </StudioButton>
                <StudioButton onClick={pauseRecording} disabled={!recording}>{recordingPaused ? "Resume" : "Pause"}</StudioButton>
                <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2.5 text-sm font-bold text-[color:var(--text-primary)] transition hover:bg-[color:var(--surface-hover)]">
                  Upload
                  <input type="file" accept={acceptedAudio} className="sr-only" onChange={(event) => selectUpload(event.target.files)} />
                </label>
              </div>
              {audioUrl ? <audio ref={audioElementRef} controls src={audioUrl} className="mt-4 w-full" /> : null}
              <p className="mt-3 text-xs leading-5 text-[color:var(--text-secondary)]">
                {recordingMode === "guest-room"
                  ? "Guest room uses invite links for remote people. You can still upload or record host audio here, then use Detect Voices for the combined interview."
                  : "Same-room mode records all speakers through one microphone. Planet Sport Studio will try voice detection first, then you can correct speaker labels after transcription."}
              </p>
              <div className="mt-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-[color:var(--text-muted)]">Who is speaking?</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {speakers.map((speaker) => (
                    <button
                      key={speaker.id}
                      type="button"
                      onClick={() => markSpeaker(speaker.id)}
                      disabled={!recording && !fileForProcessing}
                      className={`rounded-full border px-3 py-1.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                        activeSpeakerId === speaker.id
                          ? "border-[color:var(--accent)] bg-[color:var(--accent)] text-[color:var(--accent-foreground)]"
                          : "border-[color:var(--border)] bg-[color:var(--surface-muted)] text-[color:var(--text-secondary)] hover:bg-[color:var(--surface-hover)]"
                      }`}
                    >
                      {speaker.display_name || speaker.default_label}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs leading-5 text-[color:var(--text-muted)]">
                  Tap the name when someone starts speaking during recording or playback. {speakerMarks.length ? `${speakerMarks.length} marker${speakerMarks.length === 1 ? "" : "s"} saved.` : "No markers yet."}
                </p>
              </div>
            </div>
            <label className="mt-4 flex items-start gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-3 text-sm font-semibold text-[color:var(--text-primary)]">
              <input type="checkbox" checked={removeNoise} onChange={(event) => setRemoveNoise(event.target.checked)} className="mt-1" />
              <span>
                Remove background noise from audio recordings
                <span className="block text-xs font-normal leading-5 text-[color:var(--text-muted)]">
                  Useful for noisy samples. Turn off for clean studio audio to avoid quality loss.
                </span>
              </span>
            </label>
            <div className="mt-4 flex flex-wrap gap-2">
              <StudioButton onClick={processRecording} disabled={api.loading || !fileForProcessing} tone="primary">Process Recording</StudioButton>
              <StudioButton onClick={generateSummary} disabled={api.loading || !segments.length}>Generate AI Summary</StudioButton>
              <StudioButton onClick={deleteCurrentAudio} disabled={api.loading || !fileForProcessing} tone="danger">Delete</StudioButton>
            </div>
            {api.message ? <p className="mt-3 text-sm font-semibold text-emerald-600">{api.message}</p> : null}
            {diarisationStatus ? <p className="mt-2 text-xs font-semibold text-[color:var(--text-secondary)]">{diarisationStatus}</p> : null}
            {api.error ? <p className="mt-3 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-500">{api.error}</p> : null}
          </Panel>

          <Panel title="Session details">
            <div className="grid gap-3">
              <TextInput label="Title" value={title} onChange={setTitle} />
              <label className="block text-xs font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
                Transcript language
                <select value={language} onChange={(event) => setLanguage(event.target.value)} className="mt-2 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm font-semibold text-[color:var(--text-primary)]">
                  <option value="en">English</option>
                  <option value="auto">Auto detect</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="it">Italian</option>
                  <option value="pt">Portuguese</option>
                </select>
              </label>
              <TextInput label="Project ID" value={projectId} onChange={setProjectId} />
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          {recordingMode === "guest-room" ? (
            <Panel title="Host Room + Video">
              <div className="overflow-hidden rounded-3xl border border-[color:var(--border)] bg-slate-950">
                {dailyRoomUrl ? (
                  <iframe
                    title="Planet Sport Studio Daily host room"
                    src={dailyRoomUrl}
                    allow={dailyIframeAllow}
                    allowFullScreen
                    className="aspect-video w-full"
                  />
                ) : (
                  <div className="flex aspect-video w-full items-center justify-center p-6 text-center text-sm font-semibold text-white/70">
                    Start the meeting to open the shared Daily video room for host and guests.
                  </div>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <StatusPill ok={hostMeetingStarted} label={hostMeetingStarted ? "Meeting started" : "Meeting not started"} />
                <StatusPill ok={Boolean(dailyRoomUrl)} label="Shared video room" />
                <StatusPill ok={Boolean(inviteUrl)} label="Invite link ready" />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <StudioButton onClick={hostMeetingStarted ? stopHostMeeting : () => void startHostMeeting()} disabled={api.loading} tone={hostMeetingStarted ? "danger" : "primary"}>
                  {hostMeetingStarted ? "End Meeting" : "Start Meeting"}
                </StudioButton>
                {dailyRoomUrl ? (
                  <a
                    href={dailyRoomUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2.5 text-sm font-bold text-[color:var(--text-primary)] transition hover:bg-[color:var(--surface-hover)]"
                  >
                    Open Video Room
                  </a>
                ) : null}
                <StudioButton onClick={() => void createInviteSession()} disabled={api.loading} tone="primary">Create Invite Link</StudioButton>
                {inviteUrl ? <StudioButton onClick={() => void navigator.clipboard?.writeText(inviteUrl)}>Copy Link</StudioButton> : null}
              </div>
              {inviteUrl ? (
                <input readOnly value={inviteUrl} className="mt-3 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2 text-xs" />
              ) : null}
              <p className="mt-3 text-xs leading-5 text-[color:var(--text-secondary)]">
                Start Meeting opens the same Daily video room for host and guests. If browser permissions block the embedded room, open it directly in a new tab.
              </p>
            </Panel>
          ) : null}

          {recordingMode === "guest-room" ? (
            <Panel title="Meeting Users">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-[color:var(--text-secondary)]">
                    Planet Sport Studio labels remote audio from the logged-in host and guests where possible.
                  </p>
                  <StudioButton onClick={() => void refreshGuestSession()} disabled={api.loading || !guestSessionId}>Refresh Users</StudioButton>
                </div>
                {guestSession?.participants?.length ? (
                  <div className="space-y-2">
                    {guestSession.participants.map((participant) => {
                      const hasTrack = guestSession.tracks.some((track) => track.userId === participant.userId);
                      return (
                        <div key={participant.userId} className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-3">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-black text-[color:var(--text-primary)]">{participant.displayName || participant.name}</p>
                              <p className="mt-1 text-xs text-[color:var(--text-muted)]">{participant.email} - {participant.role === "host" ? "Host" : "Guest"}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <StatusPill ok={participant.role === "host" || Boolean(participant.recordingConsentAcceptedAt)} label={participant.role === "host" ? "Host" : participant.recordingConsentAcceptedAt ? "Consent accepted" : "Consent needed"} />
                              <StatusPill ok={hasTrack} label={hasTrack ? "Audio uploaded" : "No audio yet"} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4 text-sm text-[color:var(--text-muted)]">
                    Create an invite, then guests will appear here after they log in.
                  </div>
                )}
              </div>
            </Panel>
          ) : null}

          <Panel title="Transcript Editor">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search transcript, speakers or notes"
                className="min-w-64 flex-1 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2 text-sm"
              />
              <div className="flex flex-wrap gap-2">
                <R365Button variant="ghost" onClick={() => exportContent("transcript")} disabled={!segments.length}>Export Transcript</R365Button>
                <R365Button variant="ghost" onClick={() => exportContent("summary")} disabled={!summary}>Export Summary</R365Button>
                <R365Button variant="ghost" onClick={() => exportContent("quotes")} disabled={!highlightedQuotes.length}>Quotes</R365Button>
                <R365Button variant="ghost" onClick={() => exportContent("json")} disabled={!segments.length}>JSON</R365Button>
                <R365Button variant="ghost" onClick={translateScript} disabled={!segments.length || api.loading}>Translate Script</R365Button>
              </div>
            </div>
            <div className="mb-4 flex flex-wrap gap-2">
              {speakers.map((speaker) => (
                <span key={speaker.id} className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-1 text-xs font-bold text-[color:var(--text-secondary)]">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: speaker.colour }} />
                  {speaker.display_name || speaker.default_label}
                </span>
              ))}
            </div>

            {filteredSegments.length ? (
              <div className="space-y-3">
                {filteredSegments.map((segment) => (
                  <TranscriptSegmentCard
                    key={segment.id}
                    segment={segment}
                    speakers={speakers}
                    updateSegment={updateSegment}
                    mergeSpeaker={mergeSpeaker}
                    splitSegment={splitSegment}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[color:var(--border)] bg-[color:var(--surface-muted)] p-8 text-center text-sm text-[color:var(--text-muted)]">
                Upload or record audio, then process it to create timestamped transcript segments.
              </div>
            )}
          </Panel>

          <Panel title="Sports AI Summary">
            {summary ? <SummaryView summary={summary} /> : (
              <div className="rounded-2xl border border-dashed border-[color:var(--border)] bg-[color:var(--surface-muted)] p-8 text-sm leading-6 text-[color:var(--text-muted)]">
                Generate a sports-first summary after the transcript is ready. Planet Sport Studio will produce story angles, quotes, headlines, action points, follow-up questions, an article brief and social ideas.
              </div>
            )}
          </Panel>
          {translatedScript ? (
            <Panel title="Translated Script">
              <textarea
                value={translatedScript}
                onChange={(event) => setTranslatedScript(event.target.value)}
                rows={10}
                className="w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4 text-sm leading-6"
              />
            </Panel>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function TranscriptSegmentCard({
  segment,
  speakers,
  updateSegment,
  mergeSpeaker,
  splitSegment,
}: {
  segment: GuestTranscriptSegment;
  speakers: GuestSpeaker[];
  updateSegment: (id: string, patch: Partial<GuestTranscriptSegment>) => void;
  mergeSpeaker: (fromId: string, toId: string) => void;
  splitSegment: (segment: GuestTranscriptSegment) => void;
}) {
  return (
    <div className={`rounded-2xl border p-4 ${segment.is_highlighted_quote ? "border-amber-400 bg-amber-400/10" : "border-[color:var(--border)] bg-[color:var(--surface-muted)]"}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
          <span>{formatDuration(segment.start_time ?? 0)} - {formatDuration(segment.end_time ?? segment.start_time ?? 0)}</span>
          {segment.confidence_score !== null && segment.confidence_score < 0.65 ? <span className="text-amber-500">Check speaker</span> : null}
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold">
          <input
            type="checkbox"
            checked={segment.is_highlighted_quote}
            onChange={(event) => updateSegment(segment.id, { is_highlighted_quote: event.target.checked })}
          />
          Strong quote
        </label>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-[220px_1fr]">
        <div className="space-y-2">
          <select
            value={segment.speaker_id}
            onChange={(event) => updateSegment(segment.id, { speaker_id: event.target.value })}
            className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm font-semibold"
          >
            {speakers.map((speaker) => <option key={speaker.id} value={speaker.id}>{speaker.display_name || speaker.default_label}</option>)}
          </select>
          <select
            value=""
            onChange={(event) => {
              if (event.target.value) mergeSpeaker(segment.speaker_id, event.target.value);
              event.currentTarget.value = "";
            }}
            className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-xs"
          >
            <option value="">Merge this speaker into...</option>
            {speakers.filter((speaker) => speaker.id !== segment.speaker_id).map((speaker) => (
              <option key={speaker.id} value={speaker.id}>{speaker.display_name || speaker.default_label}</option>
            ))}
          </select>
          <R365Button variant="ghost" onClick={() => splitSegment(segment)}>Split segment</R365Button>
        </div>
        <div className="space-y-2">
          <textarea
            value={segment.edited_text || segment.text}
            onChange={(event) => updateSegment(segment.id, { edited_text: event.target.value })}
            rows={3}
            className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-3 text-sm leading-6"
          />
          <input
            value={segment.note || ""}
            onChange={(event) => updateSegment(segment.id, { note: event.target.value })}
            placeholder="Add note at this timestamp"
            className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-xs"
          />
        </div>
      </div>
    </div>
  );
}

function SummaryView({ summary }: { summary: GuestSummary }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-[color:var(--text-muted)]">Short summary</p>
        <p className="mt-1 text-sm leading-6">{summary.shortSummary}</p>
      </div>
      <SummarySection title="Key quotes" items={summary.keyQuotes} />
      <SummarySection title="Main story angles" items={summary.mainStoryAngles} />
      <SummarySection title="Possible headlines" items={summary.possibleHeadlines} />
      <SummarySection title="Action points" items={summary.actionPoints} />
      <SummarySection title="Follow-up questions" items={summary.followUpQuestions} />
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-[color:var(--text-muted)]">Clean article brief</p>
        <p className="mt-1 whitespace-pre-wrap text-sm leading-6">{summary.cleanArticleBrief}</p>
      </div>
      <SummarySection title="Social post ideas" items={summary.socialPostIdeas} />
      <SummarySection title="What each guest said" items={summary.whatEachGuestSaid} />
    </div>
  );
}

function SummarySection({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-[color:var(--text-muted)]">{title}</p>
      <ul className="mt-2 space-y-2 text-sm leading-6">
        {items.map((item, index) => <li key={`${title}-${index}`}>- {item}</li>)}
      </ul>
    </div>
  );
}

function ModeButton({
  title,
  active = false,
  onSelect,
}: {
  title: string;
  active?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rounded-xl border px-4 py-2.5 text-sm font-black transition ${
        active
          ? "border-[color:var(--accent)] bg-[color:var(--accent)] text-[color:var(--accent-foreground)]"
          : "border-[color:var(--border)] bg-[color:var(--surface-muted)] text-[color:var(--text-secondary)] hover:bg-[color:var(--surface-hover)]"
      }`}
    >
      {title}
    </button>
  );
}

function TextInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-xs font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm font-semibold text-[color:var(--text-primary)]" />
    </label>
  );
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black ${ok ? "bg-emerald-500/10 text-emerald-700" : "bg-slate-500/10 text-[color:var(--text-muted)]"}`}>
      {label}
    </span>
  );
}

function LanguageSelect({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-[10px] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-2 py-2 text-xs font-semibold text-[color:var(--text-primary)]"
      >
        {languageOptions.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
      </select>
    </label>
  );
}

function LiveBars({ level, active }: { level: number; active: boolean }) {
  return (
    <div className="mt-4 flex h-16 items-end gap-1 overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-2">
      {Array.from({ length: 42 }, (_, index) => {
        const shape = 0.35 + (((index * 13) % 17) / 24);
        const height = active ? Math.max(5, level * 58 * shape) : 6 + ((index * 5) % 10);
        return <span key={index} className={`flex-1 rounded-full ${active ? "bg-[color:var(--accent)]" : "bg-[color:var(--border-strong)]"}`} style={{ height }} />;
      })}
    </div>
  );
}

function StudioButton({
  children,
  onClick,
  disabled,
  tone = "neutral",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "neutral" | "primary" | "danger";
}) {
  const toneClass = tone === "primary"
    ? "border-transparent bg-[color:var(--accent)] text-[color:var(--accent-foreground)] hover:bg-[color:var(--accent-hover)]"
    : tone === "danger"
      ? "border-red-500 bg-red-500 text-white hover:bg-red-600"
      : "border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--text-primary)] hover:bg-[color:var(--surface-hover)]";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-xl border px-3 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:border-[color:var(--border)] disabled:bg-[color:var(--surface-muted)] disabled:text-[color:var(--text-muted)] ${toneClass}`}
    >
      {children}
    </button>
  );
}

function createDefaultSpeakers(guestCount: number): GuestSpeaker[] {
  return [
    makeSpeaker("Host", 0, "Host"),
    ...Array.from({ length: guestCount }, (_, index) => makeSpeaker(`Guest ${index + 1}`, index + 1, "Guest")),
  ];
}

function reconcileSpeakers(current: GuestSpeaker[], guestCount: number): GuestSpeaker[] {
  const nextDefaults = createDefaultSpeakers(guestCount);
  return nextDefaults.map((fallback, index) => {
    const existing = current[index];
    return existing
      ? {
          ...fallback,
          id: existing.id,
          display_name: existing.display_name,
          role: existing.role,
          language_in: existing.language_in,
          language_out: existing.language_out,
        }
      : fallback;
  });
}

function syncSpeakersFromSession(current: GuestSpeaker[], session: GuestSessionState): GuestSpeaker[] {
  if (!session.speakers?.length) return current;
  return current.map((speaker) => {
    const remote = session.speakers.find((item) => item.id === speaker.id);
    if (!remote) return speaker;
    return {
      ...speaker,
      display_name: remote.displayName || speaker.display_name,
      role: remote.role || speaker.role,
      language_in: remote.languageIn || speaker.language_in,
      language_out: remote.languageOut || speaker.language_out,
      assigned_user_id: remote.assignedUserId || speaker.assigned_user_id,
    };
  });
}

function defaultHostSpeakerToUser(current: GuestSpeaker[], user: RegisteredMeetingUser): GuestSpeaker[] {
  const displayName = user.name || user.email;
  return current.map((speaker) => {
    if (speaker.default_label !== "Host") return speaker;
    const shouldDefault = !speaker.display_name || speaker.display_name === "Host";
    return {
      ...speaker,
      display_name: shouldDefault ? displayName : speaker.display_name,
      assigned_user_id: user.id,
      role: "Host",
    };
  });
}

function makeSpeaker(label: string, index: number, role: string): GuestSpeaker {
  return {
    id: localId("speaker"),
    default_label: label,
    display_name: label,
    role,
    language_in: "en",
    language_out: "en",
    assigned_user_id: undefined,
    colour: speakerColours[index % speakerColours.length],
    confidence_score: null,
  };
}

function serialiseTranscript(speakers: GuestSpeaker[], segments: GuestTranscriptSegment[]): string {
  return segments.map((segment) => {
    const speaker = speakerName(speakers, segment.speaker_id);
    const text = segment.edited_text || segment.text;
    return `[${formatDuration(segment.start_time ?? 0)} - ${formatDuration(segment.end_time ?? segment.start_time ?? 0)}] ${speaker}: ${text}`;
  }).join("\n");
}

function speakerName(speakers: GuestSpeaker[], id: string): string {
  const speaker = speakers.find((item) => item.id === id);
  return speaker?.display_name || speaker?.default_label || "Guest";
}

function summaryToMarkdown(summary: GuestSummary | null): string {
  if (!summary) return "";
  return [
    summary.title,
    `Short Summary\n${summary.shortSummary}`,
    markdownList("Key Quotes", summary.keyQuotes),
    markdownList("Main Story Angles", summary.mainStoryAngles),
    markdownList("Possible Headlines", summary.possibleHeadlines),
    markdownList("Action Points", summary.actionPoints),
    markdownList("Follow-up Questions", summary.followUpQuestions),
    `Clean Article Brief\n${summary.cleanArticleBrief}`,
    markdownList("Social Post Ideas", summary.socialPostIdeas),
    markdownList("What Each Guest Said", summary.whatEachGuestSaid),
  ].filter(Boolean).join("\n\n");
}

function markdownList(title: string, items: string[]): string {
  return items.length ? `${title}\n${items.map((item) => `- ${item}`).join("\n")}` : "";
}

async function jsonOrThrow<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : `Request failed (${res.status})`);
  return data as T;
}

function formatDuration(value: number): string {
  const total = Math.max(0, Math.floor(value));
  const minutes = Math.floor(total / 60).toString().padStart(2, "0");
  const seconds = (total % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function extensionForMime(mimeType: string): string {
  if (mimeType.includes("mp4")) return "mp4";
  if (mimeType.includes("mpeg")) return "mp3";
  if (mimeType.includes("wav")) return "wav";
  return "webm";
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "audio-with-guests";
}

function localId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
