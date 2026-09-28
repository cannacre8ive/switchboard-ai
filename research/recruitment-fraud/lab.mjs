/** Offline policy simulation. No networking, credentials, or real personal data. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

export const BASIC = new Set(['public_profile', 'contact_email', 'availability']);
export const SENSITIVE = new Set(['ssn', 'ssn_last4', 'government_id', 'identity_document', 'bank_account']);
export const FORBIDDEN = new Set(['bank_login', 'one_time_code', 'upfront_payment', 'remote_access']);
const ALL = new Set([...BASIC, ...SENSITIVE, ...FORBIDDEN]);
const STAGES = new Set(['application', 'offer', 'onboarding']);
const ACTIONS = new Set(['draft', 'submit']);
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value)
  && Object.getPrototypeOf(value) === Object.prototype;
const result = (decision, reason) => ({ decision, reason });

function valid(s) {
  if (!plain(s) || !plain(s.request) || !plain(s.trusted)) return false;
  const r = s.request;
  return ['stage', 'action', 'fields'].every(k => own(r, k))
    && STAGES.has(r.stage) && ACTIONS.has(r.action)
    && Array.isArray(r.fields) && r.fields.length > 0
    && r.fields.length <= ALL.size && new Set(r.fields).size === r.fields.length
    && r.fields.every(f => typeof f === 'string' && ALL.has(f))
    && ['employer_verified', 'destination_verified', 'action_approved']
      .every(k => own(s.trusted, k) && typeof s.trusted[k] === 'boolean');
}

/** Trust fields are test-harness attestations, NOT facts extracted from a page/model. */
export function guardedPolicy(s) {
  if (!valid(s)) return result('PAUSE_VERIFY', 'Unknown or malformed input; no action authorized.');
  const { request: r, trusted: t } = s;
  if (r.fields.some(f => FORBIDDEN.has(f))) {
    return result('BLOCK', 'This agent cannot share authentication secrets, transfer money, or grant remote access.');
  }
  if (r.fields.some(f => SENSITIVE.has(f))) {
    if (r.action === 'submit' && r.stage === 'onboarding' && t.employer_verified
        && t.destination_verified && t.action_approved) {
      return result('HUMAN_HANDOFF', 'User completes the independently verified flow directly; no raw values enter the AI.');
    }
    return result('PAUSE_VERIFY', 'Sensitive request requires separate verification, purpose, and user approval.');
  }
  if (r.action === 'draft') return result('ALLOW', 'Local, low-sensitivity draft only; nothing is sent.');
  if (t.destination_verified && t.action_approved) {
    return result('ALLOW', 'Only the approved low-sensitivity fields may be submitted to this verified destination.');
  }
  return result('PAUSE_VERIFY', 'Destination or action-specific approval is missing.');
}

/** Deliberately weak counterexample, NOT a real agent or production comparator. */
export function convenienceBaseline(s) {
  if (!valid(s)) return result('PAUSE_VERIFY', 'Malformed input.');
  if (s.request.action === 'draft' || s.request.stage !== 'application') {
    return result('ALLOW', 'INTENTIONALLY UNSAFE: trusts a draft, offer, or onboarding phase.');
  }
  return result('PAUSE_VERIFY', 'INTENTIONALLY OVERRESTRICTIVE: pauses every application-stage submission.');
}

export function evaluate(cases, policy) {
  if (!Array.isArray(cases) || !cases.length) throw new Error('A nonempty case array is required.');
  const decisions = new Set(['ALLOW', 'PAUSE_VERIFY', 'HUMAN_HANDOFF', 'BLOCK']);
  const ids = new Set();
  const rows = cases.map(s => {
    if (typeof s.id !== 'string' || ids.has(s.id) || !decisions.has(s.expected)) {
      throw new Error('Case IDs must be unique and expected decisions must be recognized.');
    }
    ids.add(s.id);
    const observed = policy(s);
    if (!decisions.has(observed.decision)) throw new Error('Policy returned an invalid decision.');
    const sensitive = s.request.fields.some(f => SENSITIVE.has(f) || FORBIDDEN.has(f));
    return { id: s.id, expected: s.expected, actual: observed.decision,
      match: observed.decision === s.expected,
      unsafe_allow: sensitive && observed.decision === 'ALLOW',
      basic_allow_case: s.expected === 'ALLOW',
      blocked_basic: s.expected === 'ALLOW' && observed.decision !== 'ALLOW',
      reason: observed.reason };
  });
  return { cases: rows.length, exact_matches: rows.filter(r => r.match).length,
    unsafe_allow_cases: rows.filter(r => r.unsafe_allow).length,
    basic_allow_cases: rows.filter(r => r.basic_allow_case).length,
    blocked_basic_cases: rows.filter(r => r.blocked_basic).length, rows };
}

export function makeReport() {
  const bytes = readFileSync(new URL('./cases.json', import.meta.url));
  const cases = JSON.parse(bytes.toString('utf8'));
  return { study: 'AI Recruitment Fraud: The Onboarding Trust Boundary',
    version: '0.1.0', evidence: 'authored synthetic policy-contract tests; not a live-model benchmark',
    source_sha256: Object.fromEntries(['cases.json', 'lab.mjs'].map(name => [name,
      createHash('sha256').update(readFileSync(new URL(name, import.meta.url))).digest('hex')])),
    baseline: evaluate(cases, convenienceBaseline), guarded: evaluate(cases, guardedPolicy),
    limits: ['Both rules and cases were authored together; no independent holdout.',
      'Trusted flags and field categories are supplied by the harness, not verified by this code.',
      'No model, website, bank, applicant, or live Switchboard runtime was tested.',
      'No evidence here estimates real-world fraud detection, loss prevention, or attack cost.'] };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length > 2) throw new Error('Usage: node lab.mjs (writes JSON report to stdout).');
    process.stdout.write(JSON.stringify(makeReport(), null, 2) + '\n');
  } catch (error) {
    console.error(`Evaluation failed: ${error.message}`);
    process.exitCode = 1;
  }
}
