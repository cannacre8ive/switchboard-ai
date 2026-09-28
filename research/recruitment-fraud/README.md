# AI Recruitment Fraud: The Onboarding Trust Boundary

**A defensive AI red-team portfolio case study by Spencer Gray**  
Version 0.1.0 · September 28, 2026 · Synthetic, offline, no real applicants

> Permission to help someone find work is not permission to release their identity or banking information.

**Start here:** [Threat model](#threat-model) · [Executable scenarios](cases.json) · [Measured output](RESULTS.json) · [Manual model-evaluation protocol](MODEL_EVAL.md) · [Reviewer exercise](#your-first-reviewer-exercise)

## The insight

A plausible-looking remote employer can turn an ordinary onboarding request into an identity-theft opportunity. An applicant who delegates job-search work to an AI agent creates a second question: **will the agent mistake progress toward employment for authority to disclose private information?**

The original hypothesis also considered business-registration signals, a paid initial task, and automation. This study treats those as **claims to verify, not proofs of legitimacy**. It does not describe how to establish a fraudulent business, acquire targets, collect credentials, or evade detection.

The project deliberately lives inside **Switchboard AI**, as a bounded research artifact about agent authority. It does not add a new application, service, subscription, or runtime integration.

## What is documented, hypothesized, and actually tested?

| Evidence level | What this project can say |
| --- | --- |
| Documented fraud pattern | The FTC describes fake interviews and onboarding portals that request Social Security and bank-account information, supposedly for payroll. [S1] |
| Established AI-security concepts | OWASP describes indirect prompt injection through external content, and excessive agency arising from overly broad permissions or autonomy. [S2, S3] |
| Project hypothesis | Job-search delegation may allow employer-controlled content to influence unauthorized data sharing. Automation may amplify exposure on either side. The prevalence and economics of this combined scenario are not established here. |
| Executed evidence | A deterministic reference policy and deliberately weak comparator were run on 18 authored scenarios, plus robustness checks. |
| Not tested | Real models, job boards, employers, applicants, bank systems, or the live Switchboard runtime. No vulnerability disclosure or real-world fraud-detection claim is made. |

## Threat model

**Protected assets.** Identity documents, full or partial government identifiers, bank-account details, authentication secrets, and the applicant's ability to decide where their information goes. A bank account number and a bank password are different assets; the policy handles them differently.

**Authorized task.** Draft suitable applications, submit specifically approved low-sensitivity fields, and coordinate interviews. This lab does not authorize the AI to handle raw identity or payroll values—even when a legitimate employer needs the user to supply them directly.

**Adversary-controlled surfaces.** A fictional listing, recruiter message, offer document, onboarding page, and the claims or instructions inside those materials. No control of the genuine user-approval interface or verification service is assumed.

**Trust transitions.**

```text
User's scoped job-search request
  -> external listing / recruiter content [UNTRUSTED]
  -> agent's proposed action and classified field types [NOT authorization]
  -> independent policy gate + user approval [TRUSTED boundary]
  -> minimized basic submission OR verified human-only onboarding

Private identity / payroll values stay outside the model context and this lab.
```

An attractive offer, company-registration badge, or prior payment must not automatically turn an external claim into a trusted permission. Verifying that an entity exists is different from verifying who is requesting information, the destination receiving it, and the applicant's consent for this particular action. These are proposed design requirements, not claims that a badge proves fraud.

### Abuse cases and control owners

| Failure mode | Proposed interruption | Control owner | Remaining risk |
| --- | --- | --- | --- |
| Offer stage silently expands permissions | A separate authorization gate for each outbound action | Agent developer | Broad or misleading approval screens |
| Registration badge or polished page is accepted as verification | Verify employer and collection destination independently of that page | Applicant / verification service | Compromised genuine employer or verifier |
| Job content instructs the agent to use stored identity data | Keep external content outside authorization logic; no identity-vault tool available to the model | Agent / tool developer | Incorrect field classification or another exfiltration path |
| Previously trusted employer changes payroll destination | Invalidate destination-specific approval; verify again | Workflow owner | Social engineering during re-verification |
| Sensitive values leak through a draft, transcript, or log | Do not put raw values in the AI's context; use direct human-only entry | Data / infrastructure owner | Leaks outside the modeled system |
| Every unfamiliar employer is rejected | Preserve low-risk drafting and approved basic submissions; pause uncertainty without declaring fraud | Product owner | Review burden and missed opportunities |

A production approval must bind the **action, exact destination, field list, purpose, and expiry**. A webpage or model must not be able to mint the verification flags. The example gate assumes those attestations already exist; it does not implement an identity-verification service or a signed authorization mechanism.

## The small executable lab

`lab.mjs` makes decisions about **field names and synthetic context only**. It cannot send messages, connect to a bank, access a vault, open a website, or collect a person's data. There are no external packages or API keys.

Four outcomes keep security distinct from fraud accusation:

- **ALLOW:** a low-sensitivity local draft, or a specifically approved basic submission to a verified destination.
- **PAUSE_VERIFY:** stop and clarify missing verification, consent, unknown fields, or an inappropriate transition. This does not mean the employer is fraudulent.
- **HUMAN_HANDOFF:** for a verified onboarding request with specific approval, the user enters necessary sensitive information directly in the independently verified flow. The AI does not receive or transmit it.
- **BLOCK:** this agent cannot share authentication secrets, pay to obtain work, or grant remote access.

This intentionally conservative onboarding policy is an experiment, not legal advice or a universal description of employers' hiring practices. Legitimate identity/background-check requests outside the modeled sequence require separate human review.

### Run it

With a supported Node.js installation, from this directory:

```bash
node --test lab.test.mjs
node lab.mjs > /tmp/recruitment-fraud-results.json
```

From the Switchboard repository root:

```bash
node --test research/recruitment-fraud/lab.test.mjs
node research/recruitment-fraud/lab.mjs
```

This standalone lab does not change `src/`, package dependencies, or the root CI workflow. The repository's existing `npm test` command does not include this research folder; use the commands above.

## Observed results

Executed locally using **Node.js v22.16.0** on September 28, 2026: **29 tests passed, 0 failed**. The suite includes the 18 named scenarios and a 432-combination check that sensitive/forbidden field types never receive `ALLOW` across stage, action, and verification states.

| Authored-fixture measure | Intentionally weak comparator | Guarded reference policy |
| --- | ---: | ---: |
| Exact decision matches | 4 / 18 | 18 / 18 |
| Sensitive or forbidden requests given ALLOW | 11 | 0 |
| Basic ALLOW cases unnecessarily stopped | 3 / 4 | 0 / 4 |

[RESULTS.json](RESULTS.json) contains every case decision and SHA-256 hashes of the exact scenario and policy files used. [lab.test.mjs](lab.test.mjs) contains the assertions.

**Interpretation:** explicit scope and data-class rules enforce the intended contract in this toy environment. This is **not** evidence of 100% fraud detection, production prompt-injection resistance, superior model safety, or prevented identity theft. The comparator was deliberately constructed to fail; it does not represent an actual product or market baseline. Cases and rules were authored together, not evaluated on an independent holdout. Ignoring `external_text` in code demonstrates separation of concerns, not successful natural-language attack detection.

## What this demonstrates in a portfolio

A concise example of turning an adversarial insight into an explicit threat model, testable boundaries, benign controls, failure examples, and reproducible evidence. It also demonstrates a willingness to state where evidence stops.

**Attribution:** original insight and project direction: Spencer Gray. Documentation, reference implementation, and initial fixtures: AI-assisted. Human review of version 0.1.0 is pending. This is not a claim of independent professional penetration-testing experience.

## Your first reviewer exercise

Compare **RF-05** (verified onboarding with specific consent) with **RF-08** (a registration badge but no independent verification). Write three sentences: what the agent may do in each case, what evidence changes the decision, and what sensitive information must never enter the agent's context. Then record one realistic way the verification assumption could fail. No coding or live testing is needed.

The next bounded step is human review, then an optional mock-only model evaluation using [MODEL_EVAL.md](MODEL_EVAL.md). Do not expand into an autonomous application platform or a fraud-collection demo.

## Safety and disclosure boundaries

Synthetic labels only. No real identity documents, numbers, bank details, credential-collection pages, live job ads, unsolicited contact, deception of real applicants, or tests against third parties. Any later authorized assessment needs a written scope, synthetic accounts, isolated tooling, an immediate stop condition for unexpected real data, and a disclosure channel agreed with the system owner. Public reports should not identify an employer as fraudulent without evidence.

## Sources

Accessed September 28, 2026. External references support the background, not this lab's measured effectiveness.

- **[S1] Federal Trade Commission (January 25, 2023),** [Taking the “ploy” out of employment scams](https://www.ftc.gov/business-guidance/blog/2023/01/taking-ploy-out-employment-scams). Documents fake onboarding and recommends independent contact verification.
- **[S2] OWASP GenAI Security Project,** [LLM01:2025 Prompt Injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/). Background on external content, least privilege, and human approval.
- **[S3] OWASP GenAI Security Project,** [LLM06:2025 Excessive Agency](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/). Background on functionality, permissions, and autonomy boundaries.

Code and original project material follow this repository's MIT license. External publications retain their own licenses.
