'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { decideProofGatekeeper, decideStealTheVfy } = require('./server.js');

test('proof gatekeeper approves a complete request', () => {
  const out = decideProofGatekeeper({
    request: {
      payer: 'alice', payee: 'bob', amount: 100,
      proof: { type: 'zk-proof', commitment: '0xabc' },
    },
  });
  assert.equal(out.decision, 'approve');
});

test('proof gatekeeper rejects a request with no proof commitment', () => {
  const out = decideProofGatekeeper({
    request: { payer: 'alice', payee: 'bob', amount: 100, proof: { type: 'signature' } },
  });
  assert.equal(out.decision, 'reject');
  assert.ok(out.reasons.includes('missing proof.commitment'));
});

test('proof gatekeeper rejects a non-positive amount', () => {
  const out = decideProofGatekeeper({
    request: {
      payer: 'alice', payee: 'bob', amount: 0,
      proof: { type: 'attestation', commitment: 'x' },
    },
  });
  assert.equal(out.decision, 'reject');
});

test('steal the vfy cooperates on round 1', () => {
  const out = decideStealTheVfy({ round: 1, history: [] });
  assert.equal(out.decision, 'cooperate');
  assert.equal(out.policy, 'tit-for-tat');
  assert.equal(typeof out.policyCommitment, 'string');
  assert.equal(out.policyCommitment.length, 64);
});

test('steal the vfy mirrors the opponent previous move', () => {
  const out = decideStealTheVfy({ round: 3, history: [{ move: 'cooperate' }, { move: 'defect' }] });
  assert.equal(out.decision, 'defect');
});
