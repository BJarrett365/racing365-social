export const metadata = {
  title: "Use Policy · Planet Sport Studio",
  description: "Rules for safe and permitted use of Planet Sport Studio AI production tools.",
};

export default function UsePolicyPage() {
  return (
    <article className="prose prose-slate max-w-4xl dark:prose-invert">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[color:var(--text-muted)]">Updated 4 May 2026</p>
      <h1>Use Policy</h1>
      <p>
        This Use Policy applies to Planet Sport Studio inputs, outputs, audio recordings, voice models, generated speech and published
        material created through Planet Sport Limited workflows.
      </p>

      <h2>Consent and Voice Rights</h2>
      <ul>
        <li>Do not upload or clone a voice unless you have explicit permission or another approved lawful basis.</li>
        <li>Do not use cloned or generated voices to deceive people about who is speaking.</li>
        <li>Do not create voice outputs for unauthorised impersonation, fraud, harassment or security bypass.</li>
        <li>Keep records of consent for cloned voices used in Planet Sport Limited production.</li>
      </ul>

      <h2>Prohibited Content</h2>
      <ul>
        <li>No child sexual abuse material, child exploitation or sexualised content involving minors.</li>
        <li>No illegal goods, services, scams, credential theft, malware, unauthorised surveillance or system abuse.</li>
        <li>No hateful, violent, harassing, exploitative or discriminatory material outside legitimate editorial reporting or fictional context.</li>
        <li>No misleading election content, voter suppression or unauthorised political impersonation.</li>
        <li>No regulated professional advice without qualified human review and clear disclosure.</li>
      </ul>

      <h2>Disclosure</h2>
      <p>
        Where AI-generated or cloned audio could reasonably be mistaken for a real person speaking live or personally,
        users must apply appropriate disclosure, labelling or editorial context.
      </p>

      <h2>Human Review</h2>
      <p>
        Planet Sport Studio outputs must be reviewed before publication. This is especially important for news, sport reporting,
        commercial claims, rights-sensitive material, translation and any content involving a person&apos;s voice or likeness.
      </p>

      <h2>Provider Restrictions</h2>
      <p>
        Users must comply with the restrictions of integrated providers such as ElevenLabs and OpenAI. Do not use provider
        outputs to train competing models, evade provider safety systems or resell provider services outside approved Planet
        Sport Limited workflows.
      </p>

      <h2>Enforcement</h2>
      <p>
        Planet Sport Limited may remove content, revoke voice access, suspend accounts, delete cloned voices, restrict API
        features or escalate suspected misuse to appropriate teams or authorities.
      </p>
    </article>
  );
}
