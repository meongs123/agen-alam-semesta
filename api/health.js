// Vercel serverless function: GET /health -> { status: "ok", agent, tracks }
'use strict';
const { AGENT, TRACKS } = require('../lib/server.js');

module.exports = async (req, res) => {
  const body = JSON.stringify({ status: 'ok', agent: AGENT, tracks: TRACKS });
  res.writeHead(200, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) });
  res.end(body);
};
