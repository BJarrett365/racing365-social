export type RdEvidenceTemplate = {
  id: string;
  label: string;
  description: string;
  defaultTitle: string;
  content: string;
  mode: string;
};

export const RD_EVIDENCE_TEMPLATES: RdEvidenceTemplate[] = [
  {
    id: "security-incident",
    label: "Security incident & vulnerability log (R&D register)",
    description:
      "Log incidents and vulnerabilities — credential exposure, AWS, AI platforms, phishing. Redact secrets; internal R&D register.",
    defaultTitle: "Security incident / vulnerability",
    mode: "rd_security_incident",
    content: `## Security incident & vulnerability log

**Incident ID:** (e.g. SEC-2026-001 — sequential for register)
**Date detected:**
**Date logged:**
**Reported by:**
**Severity:** Low | Medium | High | Critical
**Status:** Open | Investigating | Mitigated | Closed

### Summary (no secrets, keys, passwords or account IDs)
(What happened in plain language — e.g. AI platform context led to credential exposure and unauthorised AWS environment creation)

### Platform / attack vector
- [ ] Cursor / AI-assisted dev
- [ ] Lovable
- [ ] OpenAI / model API
- [ ] AWS / cloud
- [ ] Git repo / CI
- [ ] Phishing / social engineering (Mimecast relevant?)
- [ ] Human error (pasted secret into chat)
- [ ] Other:

### Vulnerability class
(What control failed or did not exist? e.g. no 2FA, agent over-permissioned, no secrets policy for AI tools)

### Root cause — what we did not know before
(Qualifying uncertainty: why competent professionals could not prevent this without investigation)

### Impact (redacted)
(Scope: which systems class — production / dev / data category — no live identifiers)

### Remediation actions
- [ ] Key / credential rotation
- [ ] AWS / cloud cleanup
- [ ] 2FA enforced
- [ ] Transfon / Venture DK engaged
- [ ] AI secrets policy updated
- [ ] Mimecast training follow-up
- [ ] Engineering / IAM change
- [ ] Other:

### Prevention — what changes so this class cannot repeat

### Open risks / follow-up

### R&D link
(Section 2.8 — AI-era security)

### External reporting (if applicable)
(ICO / insurer / counsel — note only that formal steps were taken; no sensitive detail)

*Redact sensitive detail in any external copy. No live secrets in this entry.*
`,
  },
  {
    id: "platform-case-study",
    label: "Platform case study (Cursor, Lovable app, Plexa, APIs)",
    description: "Dated case study for R&D claim — uncertainty, outcome, vs prior technician-led cycle.",
    defaultTitle: "Platform case study",
    mode: "rd_case_study",
    content: `## Platform case study

**Platform:** (Cursor / Lovable / OpenAI / Runway / ElevenLabs / Plexa)
**Project / app name:** (e.g. Lovable app title, Match Report Builder, Team Line Up)
**Lovable project URL:** (if applicable)
**Date range:**
**Team:** (UK product / SA dev / editorial — names optional)

### Problem / uncertainty
(What could a competent professional not readily deduce?)

### What we did
(Prototype, integration, productionise, reject)

### Outcome
Productionised in Plexa | Rejected | Blocked (legal / security / cost)

### vs previous R&D cycle
(Would this have required a dedicated technician before Cursor/Lovable?)

### Headcount / effort note
(Estimate time saved OR where manual work remains)

### Evidence
(Commits, screenshots, Gateway ID — no secrets)
`,
  },
  {
    id: "trust-hallucination",
    label: "Trust / hallucination / fact-check",
    description: "AI invented facts, publish blocks, why Plexa control layer was needed.",
    defaultTitle: "Trust / hallucination evidence",
    mode: "rd_trust",
    content: `## Trust / hallucination evidence

**Workflow:** (Match report / preview / translation / other)
**Date:**
**Model / prompt version:**

### What the AI got wrong
(Hallucinated score, quote, injury, odds, etc.)

### How Plexa caught or missed it
(Fact-check tier, editorial score, human review)

### Licensed / owned source used
(Tier 1 data, owned content)

### Publish decision
Blocked | Repaired | Approved with edit

### Learning for prompts / gates
`,
  },
  {
    id: "human-adoption",
    label: "Human adoption / role anxiety",
    description: "Staff fear of replacement, resistance, change management tried.",
    defaultTitle: "Human adoption",
    mode: "rd_adoption",
    content: `## Human adoption / role anxiety

**Date:**
**Team / role affected:**

### Concern expressed
(Fear of role loss, distrust of AI, shadow workflow)

### What we tried
(Training, visible diffs, byline policy, demo, creator profile)

### Outcome
Adopted | Partial | Still blocked

### Quote / theme (anonymised if needed)

### Next step
`,
  },
  {
    id: "legal-ethical-gdpr",
    label: "Legal / ethical / GDPR review",
    description: "Motion from image, voice clone, manipulation, personal data — no legal advice.",
    defaultTitle: "Legal / ethical / GDPR",
    mode: "rd_legal_gdpr",
    content: `## Legal / ethical / GDPR review

**Feature:** (e.g. image→motion / ElevenLabs voice / synthetic presenter)
**Date:**
**Reviewer:** (legal / editorial / technical)

### Capability tested

### Rights basis
(Licensed image / owned content / consent / unclear)

### Ethical concern
(Misleading manipulation / deepfake / personality rights)

### GDPR / personal data
(What personal data processed? Subprocessor? Retention?)

### Decision
Approved with conditions | Blocked | Needs external counsel

### Plexa controls implemented
(Provenance, disclosure, block publish, audit log)

*This template is for R&D evidence only — not legal advice.*
`,
  },
  {
    id: "platform-trial",
    label: "Platform trial (Cursor, Lovable, Adobe, APIs)",
    description: "Document evaluation of AI dev platforms, creative tools or APIs — including rejections.",
    defaultTitle: "Platform trial",
    mode: "rd_platform_trial",
    content: `## Platform trial

**Platform:** (e.g. Cursor / Lovable / Adobe Creative Cloud / Runway / OpenAI)
**Date:**
**Trialled by:** (name, team — UK product / SA development)
**Status:** Active | Rejected | Deprioritised

### Why we tried it
(What problem were we solving? Cost, speed, production capability?)

### What we tested
(Concrete tasks — prototype, Lovable app, integration, render, editorial workflow)

### Outcome
- **Technical fit:**
- **Cost / licensing:**
- **Governance fit** (rights, review, export, secrets):
- **Decision:** Keep | Reject | Needs more work

### Qualifying uncertainty
(What could a competent professional not readily deduce without this trial?)

### Evidence links
(Commits, screenshots, API bills, branch names — no secrets or keys)
`,
  },
  {
    id: "productionisation",
    label: "Productionisation (prototype → Plexa release)",
    description: "Gap between AI-assisted demo and governed production across UK + SA teams.",
    defaultTitle: "Productionisation gap",
    mode: "rd_productionisation",
    content: `## Productionisation evidence

**Feature / prototype:**
**Owner:** (Nik Keene / David Jarrett / SA dev / UK engineering)
**Date:**

### Prototype state
(What works in demo? Cursor/Lovable/local only?)

### Production gaps still open
- [ ] Tests / CI
- [ ] Review gates / fact-check
- [ ] Secrets / env policy
- [ ] Rights / provenance metadata
- [ ] Export / publish reliability
- [ ] Multi-user / SA team standards
- [ ] Other:

### Manual steps still required
(What blocks publish or release today?)

### Next hardening step
`,
  },
  {
    id: "parser-import",
    label: "Parser / import / feed failure",
    description: "Sport365, WhoScored, FotMob, SixLogics, RSS/XML, transcript errors.",
    defaultTitle: "Parser / import failure",
    mode: "rd_parser",
    content: `## Parser / import failure

**Source:** (Sport365 / WhoScored / FotMob / SixLogics / RSS / YouTube / other)
**Date:**
**Fixture or URL:** (if applicable)

### Error observed
(Parser message, HTTP status, shape mismatch)

### Expected vs actual
(What did we expect from the feed/page?)

### Investigation steps
(What was tried — fallback, selector change, normaliser update?)

### Resolution
Fixed | Workaround | Blocked | Abandoned

### Evidence
(Commit, test file, sample redacted payload — no PII or keys)
`,
  },
  {
    id: "prompt-model",
    label: "Prompt / model experiment",
    description: "Model comparison, fact-check calibration, editorial score, hallucination controls.",
    defaultTitle: "Prompt / model experiment",
    mode: "rd_prompt_model",
    content: `## Prompt / model experiment

**Workflow:** (Match report / preview / fact-check / translation / other)
**Date:**
**Model(s):**

### Hypothesis
(What quality or accuracy question were we testing?)

### Method
(Prompt version, temperature, source hierarchy, test fixtures)

### Results
- Pass / fail examples:
- Hallucinations or false positives:
- Cost / latency notes:

### Decision
(Keep prompt | Revise | Block publish | Escalate to editorial)

### Linked files
(Test names, prompt file paths)
`,
  },
  {
    id: "abandoned",
    label: "Abandoned approach or blocker",
    description: "Failed prototypes, rejected workflows, API limits, rights barriers.",
    defaultTitle: "Abandoned approach",
    mode: "rd_abandoned",
    content: `## Abandoned approach / blocker

**Area:**
**Date:**

### What we attempted

### Why it failed or was abandoned
(Technical | Cost | Rights | Quality | Security | Operational)

### Learning for Plexa
(What will we do differently?)

### Evidence
(Screenshots, logs, Gateway chat — redacted)
`,
  },
  {
    id: "blank",
    label: "Blank — custom entry",
    description: "Start from scratch for anything not covered above.",
    defaultTitle: "R&D evidence",
    mode: "rd_custom",
    content: `## R&D evidence

**Date:**
**Area:**

### Uncertainty or experiment

### Outcome

### Evidence
`,
  },
];

export function getRdEvidenceTemplate(id: string): RdEvidenceTemplate {
  return RD_EVIDENCE_TEMPLATES.find((t) => t.id === id) ?? RD_EVIDENCE_TEMPLATES[RD_EVIDENCE_TEMPLATES.length - 1]!;
}
