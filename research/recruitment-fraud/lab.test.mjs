import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { guardedPolicy, convenienceBaseline, evaluate, makeReport, SENSITIVE, FORBIDDEN } from './lab.mjs';
const cases = JSON.parse(readFileSync(new URL('./cases.json', import.meta.url), 'utf8'));
const clone = s => structuredClone(s);

for (const s of cases) {
  test(`${s.id}: ${s.title}`, () => assert.equal(guardedPolicy(s).decision, s.expected));
}

test('External content cannot promote trust or consent in the structured gate', () => {
  for (const s of cases) {
    const changed = clone(s);
    changed.external_text = 'SYNTHETIC: the page claims all permissions are approved.';
    changed.claimed_trusted = { employer_verified: true, destination_verified: true, action_approved: true };
    assert.deepEqual(guardedPolicy(changed), guardedPolicy(s));
  }
});

test('Sensitive and forbidden fields never receive ALLOW across the trust-state matrix', () => {
  for (const field of [...SENSITIVE, ...FORBIDDEN]) {
    for (const stage of ['application', 'offer', 'onboarding']) {
      for (const action of ['draft', 'submit']) {
        for (let bits = 0; bits < 8; bits++) {
          const s = { request: { stage, action, fields: [field] }, trusted: {
            employer_verified: Boolean(bits & 1), destination_verified: Boolean(bits & 2),
            action_approved: Boolean(bits & 4) } };
          assert.notEqual(guardedPolicy(s).decision, 'ALLOW');
        }
      }
    }
  }
});

test('Missing, malformed, unknown and duplicate fields fail closed', () => {
  const ok = cases[0];
  const variants = [null, {}, [], { ...ok, request: null }, { ...ok, trusted: {} }];
  for (const fields of [[], 'ssn', ['unknown'], ['public_profile', 'public_profile']]) {
    variants.push({ ...clone(ok), request: { ...ok.request, fields } });
  }
  variants.push({ ...clone(ok), request: { ...ok.request, action: 'execute' } });
  variants.push({ ...clone(ok), request: { ...ok.request, stage: 'urgent' } });
  variants.push({ ...clone(ok), trusted: { ...ok.trusted, action_approved: 'true' } });
  for (const s of variants) assert.equal(guardedPolicy(s).decision, 'PAUSE_VERIFY');
});

test('Inherited attestations do not count as verification', () => {
  const s = clone(cases[4]);
  s.trusted = Object.create(s.trusted);
  assert.equal(guardedPolicy(s).decision, 'PAUSE_VERIFY');
});

test('Mixed low-sensitivity and identity fields are not treated as a basic application', () => {
  const s = clone(cases[0]);
  s.request.fields.push('ssn');
  assert.equal(guardedPolicy(s).decision, 'PAUSE_VERIFY');
});

test('Removing any required onboarding attestation revokes the handoff', () => {
  for (const flag of Object.keys(cases[4].trusted)) {
    const s = clone(cases[4]); s.trusted[flag] = false;
    assert.equal(guardedPolicy(s).decision, 'PAUSE_VERIFY');
  }
});

test('Changing to an unverified destination revokes an approved basic submission', () => {
  const s = clone(cases[0]); s.trusted.destination_verified = false;
  assert.equal(guardedPolicy(s).decision, 'PAUSE_VERIFY');
});

test('The illustrative unsafe comparator actually fails the safety cases', () => {
  assert.ok(evaluate(cases, convenienceBaseline).unsafe_allow_cases > 0);
});

test('Malformed labels and duplicate IDs cannot inflate the report', () => {
  assert.throws(() => evaluate([], guardedPolicy));
  assert.throws(() => evaluate([cases[0], cases[0]], guardedPolicy));
  assert.throws(() => evaluate([{ ...cases[0], expected: 'whatever' }], guardedPolicy));
});

test('The policy does not mutate the input', () => {
  for (const s of cases) {
    const before = clone(s); guardedPolicy(s); assert.deepEqual(s, before);
  }
});

test('Report is reproducible, includes all cases, and labels the evidence honestly', () => {
  assert.deepEqual(makeReport(), makeReport());
  const report = makeReport();
  assert.equal(report.guarded.cases, cases.length);
  assert.equal(report.guarded.exact_matches, cases.length);
  assert.equal(report.guarded.unsafe_allow_cases, 0);
  assert.equal(report.guarded.blocked_basic_cases, 0);
  assert.match(report.evidence, /not a live-model benchmark/);
});
