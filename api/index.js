// Vercel serverless entry for agen-alam-semesta.
// Reuses the decision logic from server.js; routes on the request path.
//   GET  /health -> { status: "ok", agent, tracks }
//   GET  /       -> agent info
//   GET  /agent  -> agent info (so a plain GET health probe on the endpoint succeeds)
//   POST /agent  -> { track, task } -> decision JSON
'use strict';
const { decide, AGENT, TRACKS } = require('../server.js');

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
    size += chunk.length;
    if (size > 1e6) throw new Error('body too large');
    chunks.push(chunk);
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
    const url = (req.url || '/').split('?')[0];
    if (req.method === 'GET' && (url === '/health' || url === '/api/health')) {
      return send(res, 200, { status: 'ok', agent: AGENT, tracks: TRACKS });
    }
    if (req.method === 'GET' && (url === '/' || url === '/agent' || url === '/api/index' || url === '/api')) {
      return send(res, 200, { agent: AGENT, tracks: TRACKS, endpoints: ['GET /health', 'POST /agent'] });
    }
    if (req.method === 'POST' && (url === '/agent' || url === '/api/agent' || url === '/api/index' || url === '/api')) {
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
};
