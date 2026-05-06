"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Panel } from "@/app/components/Panel";
import { R365Button } from "@/app/components/R365Button";

type CloneSample = {
  id: string;
  file: File;
  url: string;
  source: "recording" | "upload";
  fingerprint: string;
  durationSec?: number;
};

type ApiState = {
  loading: boolean;
  message: string;
  error: string;
};

const acceptedAudio = ".mp3,.wav,.m4a,.mp4,.webm,audio/*,video/mp4,video/webm";
const MAX_RECORDING_SECONDS = 30;
const TARGET_CLONE_SECONDS = 180;
const languageOptions = ["English", "Spanish", "French", "German", "Italian", "Portuguese"];
const accentOptions = ["British", "American", "Australian", "Irish", "Neutral"];
const genderOptions = ["Female", "Male", "Neutral"];
const ageOptions = ["Young adult", "Adult", "Middle aged", "Senior"];

export function VoiceCreatorCloneWorkspace() {
  const projectId = "default-audio-project";
  const [provider, setProvider] = useState<"elevenlabs" | "openai">("elevenlabs");
  const [step, setStep] = useState<"samples" | "details" | "done">("samples");
  const [samples, setSamples] = useState<CloneSample[]>([]);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingLevel, setRecordingLevel] = useState(0);
  const [micDeviceId, setMicDeviceId] = useState("");
  const [micDevices, setMicDevices] = useState<MediaDeviceInfo[]>([]);
  const [removeNoise, setRemoveNoise] = useState(true);
  const [voiceName, setVoiceName] = useState("");
  const [description, setDescription] = useState("Clear, natural voice for Planet Sport and Plexa audio production.");
  const [language, setLanguage] = useState("English");
  const [accent, setAccent] = useState("British");
  const [gender, setGender] = useState("");
  const [age, setAge] = useState("");
  const [consent, setConsent] = useState(false);
  const [createdVoiceId, setCreatedVoiceId] = useState("");
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [api, setApi] = useState<ApiState>({ loading: false, message: "", error: "" });
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const recordingSecondsRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const meterRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const meterSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const meterAnalyserRef = useRef<AnalyserNode | null>(null);
  const meterLevelRef = useRef(0);
  const sampleFingerprintsRef = useRef(new Set<string>());

  const totalDuration = samples.reduce((total, sample) => total + sampleDurationForTarget(sample), 0);
  const hasEstimatedDurations = samples.some((sample) => sample.source === "upload" && sample.durationSec === undefined);
  const readyForDetails = samples.length > 0 && totalDuration >= TARGET_CLONE_SECONDS;
  const recommended = provider === "elevenlabs";
  const progressPercent = Math.min(100, Math.round((totalDuration / TARGET_CLONE_SECONDS) * 100));
  const remainingSeconds = Math.max(0, TARGET_CLONE_SECONDS - totalDuration);
  const remainingTakes = Math.ceil(remainingSeconds / MAX_RECORDING_SECONDS);

  useEffect(() => {
    void navigator.mediaDevices?.enumerateDevices?.()
      .then((devices) => setMicDevices(devices.filter((device) => device.kind === "audioinput")))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    return () => {
      samples.forEach((sample) => URL.revokeObjectURL(sample.url));
      stopRecordingCleanup();
    };
    // Cleanup should run only when unmounting; sample URLs are also revoked on delete.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sampleStatus = useMemo(() => {
    if (readyForDetails) {
      return {
        label: "Ready",
        detail: hasEstimatedDurations
          ? "180 seconds counted from recordings and uploads. Some uploaded durations are still being checked."
          : "180 seconds captured from recordings and uploads. Continue or add more samples for an even better clone.",
        ok: true,
      };
    }
    return {
      label: "180 seconds of audio required",
      detail: samples.length
        ? `${hasEstimatedDurations ? "About " : ""}${formatDuration(totalDuration)} counted so far from recordings and uploads. Add about ${remainingTakes} more 30-second take${remainingTakes === 1 ? "" : "s"}.`
        : "Record six clean 30-second takes, or upload equivalent samples.",
      ok: false,
    };
  }, [hasEstimatedDurations, readyForDetails, remainingTakes, samples.length, totalDuration]);

  async function startRecording() {
    try {
      setApi({ loading: false, message: "", error: "" });
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Microphone recording is not supported in this browser.");
      if (typeof MediaRecorder === "undefined") throw new Error("Browser audio recording is not supported in this browser.");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: micDeviceId ? { deviceId: { exact: micDeviceId } } : true,
      });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        if (blob.size > 0) {
          const file = new File([blob], `voice-sample-${samples.length + 1}.${extensionForMime(blob.type)}`, {
            type: blob.type || "audio/webm",
          });
          void addSample(file, "recording", Math.min(MAX_RECORDING_SECONDS, recordingSecondsRef.current));
        }
        stopRecordingCleanup();
      };
      recorderRef.current = recorder;
      streamRef.current = stream;
      setRecordingSeconds(0);
      recordingSecondsRef.current = 0;
      void startMeter(stream);
      recorder.start(1000);
      setRecording(true);
      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((seconds) => {
          const next = Math.min(MAX_RECORDING_SECONDS, seconds + 1);
          recordingSecondsRef.current = next;
          if (next >= MAX_RECORDING_SECONDS && recorderRef.current?.state === "recording") {
            window.setTimeout(() => stopRecording(), 0);
          }
          return next;
        });
      }, 1000);
    } catch (error) {
      stopRecordingCleanup();
      setApi({ loading: false, message: "", error: error instanceof Error ? error.message : "Could not start recording." });
    }
  }

  function stopRecording() {
    if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
    setRecording(false);
  }

  function stopRecordingCleanup() {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    if (meterRef.current !== null) cancelAnimationFrame(meterRef.current);
    timerRef.current = null;
    meterRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
    meterSourceRef.current?.disconnect();
    meterAnalyserRef.current?.disconnect();
    meterSourceRef.current = null;
    meterAnalyserRef.current = null;
    void audioContextRef.current?.close().catch(() => undefined);
    audioContextRef.current = null;
    meterLevelRef.current = 0;
    setRecording(false);
    setRecordingLevel(0);
  }

  async function startMeter(stream: MediaStream) {
    const AudioContextCtor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;
    const context = new AudioContextCtor();
    if (context.state === "suspended") await context.resume().catch(() => undefined);
    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.12;
    const data = new Uint8Array(analyser.fftSize);
    audioContextRef.current = context;
    meterSourceRef.current = source;
    meterAnalyserRef.current = analyser;
    source.connect(analyser);
    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (const value of data) {
        const centred = (value - 128) / 128;
        sum += centred * centred;
      }
      const rms = Math.sqrt(sum / data.length);
      const nextLevel = Math.min(1, Math.max(0, (rms - 0.006) / 0.08));
      meterLevelRef.current = (meterLevelRef.current * 0.62) + (nextLevel * 0.38);
      setRecordingLevel(meterLevelRef.current);
      meterRef.current = requestAnimationFrame(tick);
    };
    tick();
  }

  async function addSample(file: File, source: CloneSample["source"], durationSec?: number) {
    const fingerprint = await fileFingerprint(file);
    if (sampleFingerprintsRef.current.has(fingerprint)) {
      setApi({
        loading: false,
        message: "",
        error: `${file.name} is already in the sample list. Duplicate audio files are skipped before sending to ElevenLabs.`,
      });
      return;
    }
    sampleFingerprintsRef.current.add(fingerprint);
    const url = URL.createObjectURL(file);
    const sample: CloneSample = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      url,
      source,
      fingerprint,
      durationSec,
    };
    setApi({ loading: false, message: "", error: "" });
    setSamples((current) => [...current, sample]);
    if (durationSec === undefined) {
      const audio = new Audio(url);
      audio.preload = "metadata";
      audio.onloadedmetadata = () => {
        if (Number.isFinite(audio.duration) && audio.duration > 0) {
          setSamples((current) =>
            current.map((item) => item.id === sample.id ? { ...item, durationSec: Math.round(audio.duration) } : item),
          );
        }
      };
      audio.load();
    }
  }

  function removeSample(id: string) {
    setSamples((current) => {
      const next = current.filter((sample) => sample.id !== id);
      current.filter((sample) => sample.id === id).forEach((sample) => {
        sampleFingerprintsRef.current.delete(sample.fingerprint);
        URL.revokeObjectURL(sample.url);
      });
      return next;
    });
  }

  async function createVoice() {
    setApi({ loading: true, message: "Creating ElevenLabs instant voice clone...", error: "" });
    try {
      if (provider !== "elevenlabs") throw new Error("OpenAI does not currently provide voice cloning in this workflow. Use ElevenLabs for cloned voices.");
      if (!samples.length) throw new Error("Add at least one voice sample.");
      if (!voiceName.trim()) throw new Error("Add a name for this voice.");
      if (!consent) throw new Error("Confirm you have the speaker rights and consent before creating a clone.");

      const labels = Object.fromEntries(
        Object.entries({ language, accent, gender, age }).filter(([, value]) => value.trim()),
      );
      const form = new FormData();
      form.set("projectId", projectId);
      form.set("name", voiceName.trim());
      form.set("description", description.trim());
      form.set("permissionConfirmed", "true");
      form.set("removeBackgroundNoise", removeNoise ? "true" : "false");
      form.set("labels", JSON.stringify(labels));
      samples.forEach((sample) => form.append("files", sample.file));

      const res = await fetch("/api/audio/voice-creator/elevenlabs", {
        method: "POST",
        body: form,
        credentials: "include",
      });
      const data = await jsonOrThrow<{ voice: { voiceId: string }; requiresVerification?: boolean }>(res);
      setCreatedVoiceId(data.voice.voiceId);
      setRequiresVerification(Boolean(data.requiresVerification));
      setStep("done");
      setApi({ loading: false, message: "Voice clone created.", error: "" });
    } catch (error) {
      setApi({ loading: false, message: "", error: error instanceof Error ? error.message : "Voice creation failed." });
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4 shadow-sm">
        <label className="block max-w-sm text-sm font-semibold text-[color:var(--text-primary)]">
          Provider
          <select value={provider} onChange={(event) => setProvider(event.target.value as "elevenlabs" | "openai")} className="mt-2 block w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2">
            <option value="elevenlabs">ElevenLabs instant clone</option>
            <option value="openai">OpenAI TTS only</option>
          </select>
        </label>
        {!recommended ? (
          <p className="mt-4 rounded-2xl border border-amber-400/50 bg-amber-400/10 p-3 text-sm text-[color:var(--text-secondary)]">
            OpenAI does not expose custom voice cloning for this product flow. Switch back to ElevenLabs to create a reusable cloned voice.
          </p>
        ) : null}
      </section>

      <div className="grid gap-6 lg:grid-cols-[210px_1fr]">
        <aside className="space-y-3">
          <StepList current={step} />
          <Link href="/use-policy" className="block rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm font-semibold text-[color:var(--text-secondary)] hover:bg-[color:var(--surface-hover)]">
            Voice use policy
          </Link>
        </aside>

        {step === "samples" ? (
          <Panel title="Upload Audio">
            <div className="grid gap-5">
              <div className="grid gap-4 md:grid-cols-3">
                <QualityTip title="Avoid noisy environments" body="Background sounds interfere with cloning quality." />
                <QualityTip title="Check microphone quality" body="Use an external mic or headphones where possible." />
                <QualityTip title="Use consistent equipment" body="Keep recording setup consistent between samples." />
              </div>
              <div className="rounded-3xl border border-dashed border-[color:var(--border-strong)] bg-[color:var(--surface-muted)] p-6">
                <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-2xl text-center text-sm text-[color:var(--text-secondary)]">
                  <span className="font-bold text-[color:var(--text-primary)]">Click to upload, or drag and drop</span>
                  <span className="mt-1 text-xs">Audio or video files. Aim for 6 x 30-second samples, 180 seconds total.</span>
                  <input
                    type="file"
                    multiple
                    accept={acceptedAudio}
                    className="sr-only"
                    onChange={(event) => {
                      Array.from(event.target.files ?? []).forEach((file) => void addSample(file, "upload"));
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
                <div className="my-4 text-center text-xs font-bold uppercase tracking-wide text-[color:var(--text-muted)]">or</div>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <select value={micDeviceId} onChange={(event) => setMicDeviceId(event.target.value)} className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm">
                    <option value="">Default microphone</option>
                    {micDevices.map((device, index) => (
                      <option key={device.deviceId || index} value={device.deviceId}>
                        {device.label || `Microphone ${index + 1}`}
                      </option>
                    ))}
                  </select>
                  <R365Button onClick={recording ? stopRecording : startRecording} disabled={api.loading || !recommended}>
                    {recording ? "Stop" : "Record audio"}
                  </R365Button>
                </div>
                <LiveCloneWaveform level={recordingLevel} active={recording} />
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[color:var(--border)]">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-[width] duration-75"
                    style={{ width: `${Math.max(4, Math.round(recordingLevel * 100))}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between gap-3 text-xs font-semibold text-[color:var(--text-muted)]">
                  <span>{recording ? `Input level ${Math.round(recordingLevel * 100)}% · recording will auto-stop at 00:30` : "One take = 30 seconds"}</span>
                  <span>{formatDuration(recordingSeconds)} / {formatDuration(MAX_RECORDING_SECONDS)}</span>
                </div>
              </div>

              <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-bold text-[color:var(--text-primary)]">Voice clone sample target</p>
                  <p className="text-sm font-semibold text-[color:var(--text-secondary)]">
                    {hasEstimatedDurations ? "About " : ""}{formatDuration(totalDuration)} / {formatDuration(TARGET_CLONE_SECONDS)} · {progressPercent}%
                  </p>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[color:var(--border)]">
                  <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${progressPercent}%` }} />
                </div>
                <p className="mt-2 text-xs leading-5 text-[color:var(--text-muted)]">
                  Uploaded files and recorded clips both count towards the target. Uploads are counted as 30-second samples while the browser reads their exact duration.
                </p>
              </div>

              <div className="space-y-2">
                {samples.map((sample, index) => (
                  <div key={sample.id} className="grid gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-3 md:grid-cols-[1fr_auto] md:items-center">
                    <div>
                      <p className="text-sm font-bold text-[color:var(--text-primary)]">{sample.source === "upload" ? "Upload" : "Recording"} {index + 1} · {sample.file.name}</p>
                      <p className="text-xs text-[color:var(--text-muted)]">{sampleDurationLabel(sample)} · {(sample.file.size / 1024 / 1024).toFixed(1)} MB</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <audio controls src={sample.url} className="h-9 max-w-56" />
                      <a
                        href={sample.url}
                        download={sample.file.name}
                        className="inline-flex items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm font-semibold text-[color:var(--text-secondary)] transition hover:bg-[color:var(--surface-hover)] hover:text-[color:var(--text-primary)]"
                      >
                        Download
                      </a>
                      <R365Button variant="danger" onClick={() => removeSample(sample.id)}>Delete</R365Button>
                    </div>
                  </div>
                ))}
              </div>

              <label className="flex items-start gap-3 text-sm font-semibold text-[color:var(--text-primary)]">
                <input type="checkbox" checked={removeNoise} onChange={(event) => setRemoveNoise(event.target.checked)} className="mt-1" />
                <span>
                  Remove background noise from audio recordings
                  <span className="block text-xs font-normal text-[color:var(--text-muted)]">Useful for noisy samples. Turn off for clean studio audio to avoid quality loss.</span>
                </span>
              </label>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className={sampleStatus.ok ? "text-emerald-600" : "text-red-500"}>
                  <p className="text-sm font-bold">{sampleStatus.label}</p>
                  <p className="text-xs text-[color:var(--text-muted)]">{sampleStatus.detail}</p>
                </div>
                <R365Button onClick={() => setStep("details")} disabled={!readyForDetails || !recommended}>Next</R365Button>
              </div>
            </div>
          </Panel>
        ) : null}

        {step === "details" ? (
          <Panel title="Voice Information">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <div className="h-20 w-20 rounded-full bg-[radial-gradient(circle_at_30%_25%,#dbeafe,#22d3ee_45%,#0f766e)]" />
                <R365Button variant="ghost" onClick={() => samples[0] && new Audio(samples[0].url).play()}>Preview voice</R365Button>
              </div>
              <label className="block text-sm font-semibold">
                Name
                <input value={voiceName} onChange={(event) => setVoiceName(event.target.value)} placeholder="e.g. Barrie Jarrett - Planet Sport" className="mt-2 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2" />
              </label>
              <div className="grid gap-3 md:grid-cols-2">
                <SelectLabel label="Language" value={language} setValue={setLanguage} options={languageOptions} />
                <SelectLabel label="Accent" value={accent} setValue={setAccent} options={accentOptions} />
                <SelectLabel label="Gender" value={gender} setValue={setGender} options={["", ...genderOptions]} />
                <SelectLabel label="Age" value={age} setValue={setAge} options={["", ...ageOptions]} />
              </div>
              <label className="block text-sm font-semibold">
                Description
                <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} className="mt-2 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-3" />
              </label>
              <label className="flex items-start gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4 text-sm text-[color:var(--text-secondary)]">
                <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1" />
                <span>
                  I confirm that Planet Sport Limited/Plexa has all necessary rights and consents to upload, clone, store and use these voice samples, and that the voice will not be used for unlawful, deceptive or harmful purposes. I agree to the{" "}
                  <Link href="/terms" className="underline">Terms</Link>,{" "}
                  <Link href="/privacy-policy" className="underline">Privacy Policy</Link> and{" "}
                  <Link href="/use-policy" className="underline">Use Policy</Link>.
                </span>
              </label>
              {api.error ? <p className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-500">{api.error}</p> : null}
              {api.loading ? <p className="text-sm font-semibold text-[color:var(--text-muted)]">{api.message}</p> : null}
              <div className="flex justify-end gap-2">
                <R365Button variant="ghost" onClick={() => setStep("samples")}>Back</R365Button>
                <R365Button onClick={createVoice} disabled={api.loading || !consent || !voiceName.trim()}>Save voice</R365Button>
              </div>
            </div>
          </Panel>
        ) : null}

        {step === "done" ? (
          <Panel title="Finish Up">
            <div className="space-y-4">
              <h2 className="text-2xl font-black text-[color:var(--text-primary)]">Try out your new clone</h2>
              <p className="text-sm text-[color:var(--text-secondary)]">
                Voice ID: <span className="font-mono">{createdVoiceId}</span>
                {requiresVerification ? " · ElevenLabs requires additional verification for this voice." : ""}
              </p>
              <Link href="/audio-studio?tool=text-to-speech" className="block rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4 font-bold hover:bg-[color:var(--surface-hover)]">
                Generate speech →
              </Link>
              <button type="button" onClick={() => setStep("samples")} className="rounded-xl bg-black px-4 py-2 text-sm font-bold text-white">
                Create another voice
              </button>
            </div>
          </Panel>
        ) : null}
      </div>
    </div>
  );
}

function StepList({ current }: { current: "samples" | "details" | "done" }) {
  const steps = [
    ["samples", "Upload Audio"],
    ["details", "Voice Information"],
    ["done", "Finish up"],
  ] as const;
  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
      <p className="mb-3 text-lg font-black">Instant Voice Clone</p>
      <div className="space-y-2">
        {steps.map(([id, label]) => (
          <p key={id} className={`text-sm font-semibold ${current === id ? "text-[color:var(--text-primary)]" : "text-[color:var(--text-muted)]"}`}>
            <span className={current === id ? "text-emerald-500" : "text-[color:var(--text-muted)]"}>•</span> {label}
          </p>
        ))}
      </div>
    </div>
  );
}

function QualityTip({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <p className="text-sm font-bold text-[color:var(--text-primary)]">{title}</p>
      <p className="mt-1 text-xs leading-5 text-[color:var(--text-muted)]">{body}</p>
    </div>
  );
}

function SelectLabel({ label, value, setValue, options }: { label: string; value: string; setValue: (value: string) => void; options: string[] }) {
  return (
    <label className="text-sm font-semibold">
      {label}
      <select value={value} onChange={(event) => setValue(event.target.value)} className="mt-2 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2">
        {options.map((option) => <option key={option} value={option}>{option || "Not set"}</option>)}
      </select>
    </label>
  );
}

function LiveCloneWaveform({ level, active }: { level: number; active: boolean }) {
  return (
    <div className="mt-5 flex h-14 items-end gap-px overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2">
      {Array.from({ length: 64 }).map((_, index) => {
        const shape = 0.25 + (((index * 11) % 17) / 20);
        const ripple = active ? 1 + Math.sin((Date.now() / 90) + index) * 0.12 : 1;
        const height = active ? Math.max(4, level * 46 * shape * ripple) : 4 + ((index * 3) % 7);
        return (
          <span
            key={index}
            className={`w-1 rounded-full transition-[height,background-color] duration-75 ${active ? "bg-emerald-500" : "bg-[color:var(--text-primary)]/30"}`}
            style={{ height }}
          />
        );
      })}
    </div>
  );
}

async function jsonOrThrow<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : `Request failed (${res.status})`);
  return data as T;
}

async function fileFingerprint(file: File): Promise<string> {
  try {
    const hashBuffer = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
    return Array.from(new Uint8Array(hashBuffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
  } catch {
    return `${file.name}:${file.size}:${file.lastModified}`;
  }
}

function formatDuration(value: number): string {
  const total = Math.max(0, Math.floor(value));
  const minutes = Math.floor(total / 60).toString().padStart(2, "0");
  const seconds = (total % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function sampleDurationForTarget(sample: CloneSample): number {
  if (sample.durationSec !== undefined) return sample.durationSec;
  return sample.source === "upload" ? MAX_RECORDING_SECONDS : 0;
}

function sampleDurationLabel(sample: CloneSample): string {
  if (sample.durationSec !== undefined) return formatDuration(sample.durationSec);
  if (sample.source === "upload") return `About ${formatDuration(MAX_RECORDING_SECONDS)} while reading duration`;
  return "Reading duration...";
}

function extensionForMime(mimeType: string): string {
  if (mimeType.includes("mp4")) return "mp4";
  if (mimeType.includes("mpeg")) return "mp3";
  if (mimeType.includes("wav")) return "wav";
  return "webm";
}
