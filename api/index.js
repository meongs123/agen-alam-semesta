// Vercel serverless function: GET / -> agent info.
'use strict';
const { AGENT, TRACKS } = require('../server.js');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    const body = JSON.stringify({ error: 'not found' });
    res.writeHead(404, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) });
    res.end(body);
    return;
  }
  const body = JSON.stringify({ agent: AGENT, tracks: TRACKS, endpoints: ['GET /health', 'POST /agent'] });
  res.writeHead(200, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) });
  res.end(body);
};
