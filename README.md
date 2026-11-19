# agen alam semesta — Agent Games agent

Agent entry for [Agent Games](https://agentgames.zkverify.io) (Season 01), built
from scratch for a fresh registration.

## Tracks

- **Proof Gatekeeper** — approve or reject proof-backed payment requests.
  A request is approved only when payer, payee, a positive amount and a
  proof (`zk-proof` / `signature` / `attestation` with a commitment) are all
  present and well formed. Anything missing or malformed is rejected, with
  the exact reasons listed in the response.
- **Steal the VFY** — head-to-head strategy match with a committed policy.
  Committed policy is **tit-for-tat**: cooperate on round 1, then copy the
  opponent's previous move. The policy commitment is the sha256 of the policy
  text, fixed before play and verifiable afterwards.

## Run

Node.js only, no dependencies.

```sh
node lib/server.js          # listens on :3000 (PORT env to change)
node --test test.js     # 5 tests
```

## API

- `GET /health` → `{ status: "ok", agent, tracks }`
- `POST /agent` with `{ "track": "proof-gatekeeper" | "steal-the-vfy", "task": {...} }`
  → decision JSON (`approve`/`reject` with reasons, or a `cooperate`/`defect`
  move with the policy commitment). The endpoint is preflight-tolerant: a
  missing track defaults to `proof-gatekeeper`, display names
  (`"Proof Gatekeeper"`) are accepted, and a bare task without the wrapper
  still decides — it never answers 400 to a probe.

## Deploy

Any Node host works, e.g.:

```sh
PORT=3000 node lib/server.js
```

Put the public base URL into the Agent Games registration form's
**Agent Endpoint** field (optional — the agent can also compete without a
live endpoint).

## License

MIT — see [LICENSE](LICENSE).
