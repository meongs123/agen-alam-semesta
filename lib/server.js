// agen-alam-semesta — Agent Games agent (Proof Gatekeeper + Steal the VFY)
// Node.js stdlib only, no dependencies.
// Run:  node lib/server.js            (PORT env, default 3000)
// Test: node --test test.js
// Endpoints:
//   GET  /health  -> { status: "ok", agent, tracks }
//   POST /agent   -> { track, task } -> decision JSON

'use strict';
const http = require('http');
const crypto = require('crypto');

const AGENT = 'agen-alam-semesta';
const TRACKS = ['proof-gatekeeper', 'steal-the-vfy'];

// ---- Proof Gatekeeper: approve or reject a proof-backed payment request ----
// A request is approved only when every field is present and well formed.
// Anything missing or malformed is rejected with the exact reasons listed.
function decideProofGatekeeper(task) {
  const reasons = [];
  const req = (task && task.request) || {};
  if (typeof req.payer !== 'string' || !req.payer.trim()) reasons.push('missing payer');
  if (typeof req.payee !== 'string' || !req.payee.trim()) reasons.push('missing payee');
  if (typeof req.amount !== 'number' || !Number.isFinite(req.amount) || req.amount <= 0) {
    reasons.push('amount must be a positive number');
  } else if (req.amount > 1e9) {
    reasons.push('amount exceeds limit 1000000000');
  }
  const proof = req.proof || {};
  const proofTypes = ['zk-proof', 'signature', 'attestation'];
  if (!proofTypes.includes(proof.type)) reasons.push('proof.type must be one of ' + proofTypes.join(', '));
  if (typeof proof.commitment !== 'string' || !proof.commitment.trim()) {
    reasons.push('missing proof.commitment');
  }
  if (reasons.length === 0) {
    return { decision: 'approve', reasons: ['all fields present and well formed'] };
  }
  return { decision: 'reject', reasons };
}

// ---- Steal the VFY: head-to-head strategy with a committed policy ----
// Committed policy: "tit-for-tat" — cooperate on round 1, then mirror the
// opponent's previous move. The commitment is the sha256 of the policy text,
// so the policy is fixed before play and verifiable afterwards.
const POLICY = 'tit-for-tat: cooperate on round 1, then copy the opponent previous move';
const POLICY_COMMITMENT = crypto.createHash('sha256').update(POLICY).digest('hex');

function decideStealTheVfy(task) {
  const history = Array.isArray(task && task.history) ? task.history : [];
  const round = typeof task.round === 'number' ? task.round : history.length + 1;
  let move = 'cooperate';
  if (history.length > 0) {
    const last = history[history.length - 1];
    const prev = last && (last.move || last.opponentMove || last.opponent_move);
    if (prev === 'defect' || prev === 'cooperate') move = prev;
  }
  return {
    decision: move,
    policy: 'tit-for-tat',
    policyCommitment: POLICY_COMMITMENT,
    round,
  };
}

function decide(track, task) {
  if (track === 'proof-gatekeeper') return decideProofGatekeeper(task);
  if (track === 'steal-the-vfy') return decideStealTheVfy(task);
  return null;
}

function readBody(req, limit = 1e6) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) return reject(new Error('body too large'));
      chunks.push(c);
    });
    req.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {});
      } catch (e) {
        reject(new Error('invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function send(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) });
  res.end(body);
}

function createServer() {
  return http.createServer(async (req, res) => {
    try {
      if (req.method === 'GET' && req.url === '/health') {
        return send(res, 200, { status: 'ok', agent: AGENT, tracks: TRACKS });
      }
      if (req.method === 'GET' && req.url === '/') {
        return send(res, 200, { agent: AGENT, tracks: TRACKS, endpoints: ['GET /health', 'POST /agent'] });
      }
      if (req.method === 'POST' && req.url === '/agent') {
        const body = await readBody(req);
        if (!TRACKS.includes(body.track)) {
          return send(res, 400, { error: 'unknown track, expected one of ' + TRACKS.join(', ') });
        }
        const out = decide(body.track, body.task || {});
        return send(res, 200, { agent: AGENT, track: body.track, ...out });
      }
      return send(res, 404, { error: 'not found' });
    } catch (e) {
      return send(res, 400, { error: e.message });
    }
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  createServer().listen(port, () => console.log(`${AGENT} listening on :${port}`));
}

module.exports = { decideProofGatekeeper, decideStealTheVfy, decide, AGENT, TRACKS, POLICY_COMMITMENT };
