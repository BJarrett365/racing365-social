export const metadata = {
  title: "Privacy Policy · Plexa",
  description: "How Plexa and Planet Sport Limited handle personal data, audio recordings and voice data.",
};

export default function PrivacyPolicyPage() {
  return (
    <article className="prose prose-slate max-w-4xl dark:prose-invert">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[color:var(--text-muted)]">Updated 4 May 2026</p>
      <h1>Privacy Policy</h1>
      <p>
        This Privacy Policy explains how Plexa, operated by Planet Sport Limited, processes personal data when users
        create, upload, transcribe, translate, clone or generate audio and related production assets.
      </p>

      <h2>Who We Are</h2>
      <p>
        Plexa is an internal and client-facing production platform for editorial, audio, video and multilingual workflows.
        References to &quot;Plexa&quot;, &quot;we&quot;, &quot;us&quot; and &quot;our&quot; mean Planet Sport Limited and the teams operating Plexa.
      </p>

      <h2>Data We Process</h2>
      <ul>
        <li>Account and access details, such as name, email address, role, permissions and audit logs.</li>
        <li>Production inputs, including scripts, transcripts, prompts, uploaded files, generated outputs and metadata.</li>
        <li>Audio recordings and voice data, including microphone recordings, uploaded voice samples, cloned voice metadata and generated speech.</li>
        <li>Technical information, including device, browser, IP address, usage logs and error diagnostics.</li>
      </ul>

      <h2>Voice Data</h2>
      <p>
        Voice cloning and speech generation can involve personal data and, in some jurisdictions, biometric data. Users must
        only upload or clone a voice where Planet Sport Limited has the speaker&apos;s permission or another lawful basis to do
        so. Voice samples are used to provide the requested Plexa workflow, store project evidence, support security and
        comply with legal obligations.
      </p>

      <h2>Providers</h2>
      <p>
        Plexa may send audio, text and metadata to approved AI providers such as ElevenLabs and OpenAI to provide
        transcription, text to speech, translation, voice isolation, voice cloning and related workflows. Provider use is
        governed by our contracts, settings and the provider terms applicable to the service.
      </p>

      <h2>How We Use Data</h2>
      <ul>
        <li>To provide and improve Plexa production tools.</li>
        <li>To create, store and retrieve project media, transcripts, notes, voices and generated audio.</li>
        <li>To verify consent, prevent misuse, investigate abuse and maintain platform security.</li>
        <li>To comply with legal, regulatory, accounting and contractual obligations.</li>
      </ul>

      <h2>Retention</h2>
      <p>
        Project data is retained for as long as needed for editorial production, audit, rights management and operational
        purposes, unless deleted earlier by an authorised user or required by law. Voice clone records should be reviewed
        periodically and removed when no longer required.
      </p>

      <h2>Your Rights</h2>
      <p>
        Depending on your location, you may have rights to access, correct, delete, restrict or object to processing of
        your personal data. Requests should be sent through the appropriate Planet Sport Limited contact or data protection
        channel.
      </p>

      <h2>Security</h2>
      <p>
        We use access controls, server-side provider calls and project-level storage controls to protect production data.
        No system is completely secure, so users must avoid uploading unnecessary sensitive data.
      </p>
    </article>
  );
}
