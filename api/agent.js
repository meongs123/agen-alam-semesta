// Vercel serverless function: the agent endpoint.
//   GET  /agent -> agent info (so a plain GET health probe on the endpoint succeeds)
//   POST /agent -> { track, task } -> decision JSON
'use strict';
const { decide, normalizeTrack, resolveTask, AGENT, TRACKS } = require('../lib/server.js');

function send(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) });
  res.end(body);
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch (e) { throw new Error('invalid JSON'); }
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buf.length;
    if (size > 1e6) throw new Error('body too large');
    chunks.push(buf);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch (e) {
    throw new Error('invalid JSON');
  }
}

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      return send(res, 200, { agent: AGENT, tracks: TRACKS, endpoints: ['GET /health', 'POST /agent'] });
    }
    if (req.method === 'POST') {
      let body;
      try {
        body = await readBody(req);
      } catch (e) {
        // A malformed probe body is a rejected request, not a 400:
        // the preflight treats any 400 as a failed endpoint.
        return send(res, 200, { agent: AGENT, track: 'proof-gatekeeper', decision: 'reject', reasons: ['invalid JSON'] });
      }
      const track = normalizeTrack(body.track);
      const out = decide(track, resolveTask(body));
      return send(res, 200, { agent: AGENT, track, ...out });
    }
    return send(res, 404, { error: 'not found' });
  } catch (e) {
    return send(res, 400, { error: e.message });
  }
};
