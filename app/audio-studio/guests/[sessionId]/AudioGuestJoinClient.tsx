"use client";

import { useEffect, useRef, useState } from "react";
import { Panel } from "@/app/components/Panel";
import { R365Button } from "@/app/components/R365Button";

type GuestSessionSpeaker = {
  id: string;
  displayName: string;
  role: string;
  languageIn: string;
  languageOut: string;
};

type GuestSession = {
  id: string;
  title: string;
  dailyRoomUrl?: string;
  speakers: GuestSessionSpeaker[];
  tracks: Array<{ id: string; displayName: string; createdAt: string }>;
};

type ApiState = {
  loading: boolean;
  message: string;
  error: string;
};

const languages = [
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
const dailyIframeAllow = "microphone; camera; autoplay; display-capture; fullscreen; screen-wake-lock";

export function AudioGuestJoinClient({ sessionId }: { sessionId: string }) {
  const [session, setSession] = useState<GuestSession | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [speakerId, setSpeakerId] = useState("");
  const [languageIn, setLanguageIn] = useState("en");
  const [languageOut, setLanguageOut] = useState("en");
  const [micConnected, setMicConnected] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [api, setApi] = useState<ApiState>({ loading: false, message: "", error: "" });
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    void loadSession();
    const refresh = window.setInterval(() => {
      if (!session?.dailyRoomUrl) void loadSession({ quiet: true });
    }, 10000);
    return () => {
      window.clearInterval(refresh);
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  async function loadSession(options: { quiet?: boolean } = {}) {
    if (!options.quiet) setApi({ loading: true, message: "Loading guest session...", error: "" });
    try {
      const res = await fetch(`/api/audio/guests/sessions/${sessionId}`, { credentials: "include", cache: "no-store" });
      const data = await jsonOrThrow<{ session: GuestSession; user: { name?: string; email?: string } }>(res);
      setSession(data.session);
      const firstGuest = data.session.speakers.find((speaker) => speaker.role !== "Host") || data.session.speakers[0];
      setSpeakerId(firstGuest?.id || "");
      setDisplayName(firstGuest?.displayName || data.user.name || data.user.email || "Guest");
      setLanguageIn(firstGuest?.languageIn || "en");
      setLanguageOut(firstGuest?.languageOut || "en");
      if (!options.quiet) setApi({ loading: false, message: "", error: "" });
    } catch (error) {
      if (!options.quiet) setApi({ loading: false, message: "", error: error instanceof Error ? error.message : "Could not load session." });
    }
  }

  async function connectMicForRecording() {
    setApi({ loading: false, message: "", error: "" });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      cleanup();
      streamRef.current = stream;
      setMicConnected(stream.getAudioTracks().some((track) => track.readyState === "live"));
    } catch (error) {
      setApi({ loading: false, message: "", error: error instanceof Error ? error.message : "Could not connect microphone for recording." });
    }
  }

  function startRecording() {
    const stream = streamRef.current;
    if (!stream) {
      setApi({ loading: false, message: "", error: "Connect camera and mic before recording." });
      return;
    }
    const audioTracks = stream.getAudioTracks();
    if (!audioTracks.length) {
      setApi({ loading: false, message: "", error: "No microphone track available." });
      return;
    }
    const audioOnlyStream = new MediaStream(audioTracks);
    const recorder = new MediaRecorder(audioOnlyStream);
    chunksRef.current = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      setRecordedBlob(new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" }));
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
      timerRef.current = null;
      setRecording(false);
    };
    recorderRef.current = recorder;
    setRecordedBlob(null);
    setRecordingSeconds(0);
    setRecording(true);
    recorder.start(1000);
    timerRef.current = window.setInterval(() => setRecordingSeconds((seconds) => seconds + 1), 1000);
  }

  function stopRecording() {
    if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
  }

  async function submitTrack() {
    if (!recordedBlob) {
      setApi({ loading: false, message: "", error: "Record audio before uploading your track." });
      return;
    }
    setApi({ loading: true, message: "Uploading audio-only track...", error: "" });
    try {
      const form = new FormData();
      form.set("displayName", displayName);
      form.set("speakerId", speakerId);
      form.set("languageIn", languageIn);
      form.set("languageOut", languageOut);
      form.set("file", new File([recordedBlob], `guest-track-${Date.now()}.webm`, { type: recordedBlob.type || "audio/webm" }));
      await jsonOrThrow(await fetch(`/api/audio/guests/sessions/${sessionId}/tracks`, {
        method: "POST",
        body: form,
        credentials: "include",
      }));
      setApi({ loading: false, message: "Track uploaded. The host can now add it to the interview.", error: "" });
      setRecordedBlob(null);
      await loadSession();
    } catch (error) {
      setApi({ loading: false, message: "", error: error instanceof Error ? error.message : "Could not upload track." });
    }
  }

  function cleanup() {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = null;
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setMicConnected(false);
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6">
      <section className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-[color:var(--text-muted)]">Plexa guest interview</p>
        <h1 className="mt-2 text-3xl font-black">Join Audio with Guests</h1>
        <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
          {session?.title || "Loading session..."} - use the shared video room for the call, then record/upload audio only for Plexa.
        </p>
      </section>

      <Panel title="Shared Video Room">
        <div className="overflow-hidden rounded-3xl border border-[color:var(--border)] bg-slate-950">
          {session?.dailyRoomUrl ? (
            <iframe
              title="Plexa Daily guest room"
              src={session.dailyRoomUrl}
              allow={dailyIframeAllow}
              allowFullScreen
              className="aspect-video w-full"
            />
          ) : (
            <div className="flex aspect-video w-full items-center justify-center p-6 text-center text-sm font-semibold text-white/70">
              Waiting for the host to start the shared video room. This page checks again automatically.
            </div>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusPill ok={Boolean(session?.dailyRoomUrl)} label={session?.dailyRoomUrl ? "Video room live" : "Waiting for host"} />
          {session?.dailyRoomUrl ? (
            <a
              href={session.dailyRoomUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2.5 text-sm font-semibold text-[color:var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-[color:var(--text-primary)]"
            >
              Open Video Room
            </a>
          ) : null}
          <R365Button variant="ghost" onClick={() => void loadSession()} disabled={api.loading}>Refresh Room</R365Button>
        </div>
      </Panel>

      <div className="grid gap-6 md:grid-cols-[1fr_320px]">
        <Panel title="Audio Track Recording">
          <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4 text-sm leading-6 text-[color:var(--text-secondary)]">
            Use the shared video room above to see and hear each other. This section records your microphone only so Plexa can upload a clean audio track for transcript and summary.
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
            <StatusPill ok={micConnected} label="Mic ready for recording" />
            <StatusPill ok={Boolean(recordedBlob)} label="Audio recorded" />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <R365Button onClick={connectMicForRecording} disabled={api.loading}>Connect Mic</R365Button>
            <R365Button onClick={recording ? stopRecording : startRecording} disabled={api.loading || !micConnected}>
              {recording ? "Stop" : "Record audio"}
            </R365Button>
            <R365Button variant="ghost" onClick={submitTrack} disabled={api.loading || !recordedBlob}>Upload Track</R365Button>
          </div>
          <p className="mt-3 text-sm font-semibold text-[color:var(--text-secondary)]">Timer: {formatDuration(recordingSeconds)}</p>
          {api.message ? <p className="mt-3 text-sm font-semibold text-emerald-600">{api.message}</p> : null}
          {api.error ? <p className="mt-3 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-500">{api.error}</p> : null}
        </Panel>

        <Panel title="Your Details">
          <label className="block text-sm font-semibold">
            Name
            <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="mt-2 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2" />
          </label>
          <label className="mt-3 block text-sm font-semibold">
            Speaker slot
            <select value={speakerId} onChange={(event) => setSpeakerId(event.target.value)} className="mt-2 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2">
              {(session?.speakers ?? []).map((speaker) => <option key={speaker.id} value={speaker.id}>{speaker.displayName}</option>)}
            </select>
          </label>
          <LanguageField label="I speak" value={languageIn} setValue={setLanguageIn} />
          <LanguageField label="Translate to" value={languageOut} setValue={setLanguageOut} />
          {session?.tracks.length ? (
            <div className="mt-4 rounded-2xl bg-[color:var(--surface-muted)] p-3 text-xs text-[color:var(--text-secondary)]">
              {session.tracks.length} track{session.tracks.length === 1 ? "" : "s"} uploaded to this session.
            </div>
          ) : null}
        </Panel>
      </div>
    </main>
  );
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return <span className={`rounded-full px-3 py-1 ${ok ? "bg-emerald-500/10 text-emerald-700" : "bg-slate-500/10 text-[color:var(--text-muted)]"}`}>{label}</span>;
}

function LanguageField({ label, value, setValue }: { label: string; value: string; setValue: (value: string) => void }) {
  return (
    <label className="mt-3 block text-sm font-semibold">
      {label}
      <select value={value} onChange={(event) => setValue(event.target.value)} className="mt-2 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2">
        {languages.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
      </select>
    </label>
  );
}

async function jsonOrThrow<T = unknown>(res: Response): Promise<T> {
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
