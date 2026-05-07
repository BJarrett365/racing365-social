export const metadata = {
  title: "Terms of Service · Planet Sport Studio",
  description: "Terms for using Planet Sport Studio by Planet Sport Limited.",
};

export default function TermsPage() {
  return (
    <article className="prose prose-slate max-w-4xl dark:prose-invert">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[color:var(--text-muted)]">Updated 4 May 2026</p>
      <h1>Terms of Service</h1>
      <p>
        These Terms govern access to and use of Planet Sport Studio, the AI-powered production platform operated by Planet Sport Limited.
        By using Planet Sport Studio, you agree to follow these Terms, the Privacy Policy and the Use Policy.
      </p>

      <h2>Permitted Use</h2>
      <p>
        Planet Sport Studio may be used for authorised editorial, commercial, production, translation, audio, video and publishing
        workflows. Users are responsible for ensuring they have the rights, permissions and approvals needed for all
        content, prompts, audio recordings, voice samples and outputs they submit or create.
      </p>

      <h2>Voice and Audio Workflows</h2>
      <p>
        Users must not clone, imitate or generate a person&apos;s voice unless they have clear consent or another lawful basis
        approved by Planet Sport Limited. Voice outputs must not be used to deceive audiences, impersonate people without
        permission, bypass security checks, mislead voters, harass individuals or create unlawful content.
      </p>

      <h2>Third-Party Providers</h2>
      <p>
        Planet Sport Studio may use third-party AI and infrastructure providers, including ElevenLabs and OpenAI. Users must comply with
        the provider restrictions that apply to the relevant workflow. If provider terms are stricter than these Terms for a
        specific feature, the stricter rule applies to that feature.
      </p>

      <h2>Outputs</h2>
      <p>
        AI outputs may be inaccurate, incomplete or unsuitable for publication without editorial review. Users must review,
        fact-check, rights-check and approve outputs before publishing or distributing them.
      </p>

      <h2>Accounts and Security</h2>
      <p>
        Users must keep credentials secure and only access projects and data they are authorised to use. Suspicious access,
        rights concerns or policy breaches should be reported immediately.
      </p>

      <h2>Suspension and Removal</h2>
      <p>
        Planet Sport Limited may restrict access, remove content, delete voice models or suspend workflows where required
        for security, rights protection, legal compliance, provider requirements or misuse prevention.
      </p>

      <h2>No Legal Advice</h2>
      <p>
        Planet Sport Studio is a production tool. It does not provide legal, financial, medical or other regulated professional advice.
        Professional advice must be reviewed by an appropriately qualified person before use.
      </p>
    </article>
  );
}
