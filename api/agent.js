// Vercel serverless function: the agent endpoint.
//   GET  /agent -> agent info (so a plain GET health probe on the endpoint succeeds)
//   POST /agent -> { track, task } -> decision JSON
'use strict';
const { decide, AGENT, TRACKS } = require('../lib/server.js');

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
