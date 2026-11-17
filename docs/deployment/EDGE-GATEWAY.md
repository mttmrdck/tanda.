# Local gateway prototype

Requires Node 20+ and the existing root dependencies. No new service dependencies or cloud accounts are required.

```sh
npm run gateway:build
# Set TANDA_GATEWAY_TOKEN to a private random value of at least 24 characters in your shell.
npm run gateway
```

Do not put the token in source, a URL, screenshots or shell command arguments. The process reads `TANDA_GATEWAY_TOKEN` from its environment and does not print it. Optional environment settings:

- `TANDA_GATEWAY_PORT`: default 4321; service binds **127.0.0.1 only**.
- `TANDA_GATEWAY_FILE`: default `.tanda-gateway/events.json`, ignored by Git.
- `TANDA_WEB_ORIGIN`: default `http://127.0.0.1:5173`; only this browser Origin is allowed.

Run the caregiver Vite app on the configured origin. `/edge-api/*` proxies to loopback port 4321 during development; Devices → gateway health requires entering the token explicitly. The token stays in component memory and is cleared on success. A static production deployment needs an explicitly configured same-origin reverse proxy; no proxy is silently installed. The health check verifies the service only, not a camera or remote notification link.

All routes require `Authorization: Bearer <token>`. `GET /health` returns service capability metadata. `GET /snapshot` returns the current validated metadata snapshot. `POST /command` accepts:

- `{action:"configure",care}` with the `careSchema` contract (including explicit video/authority consent, audio false).
- `{action:"start"}` / `stop` / `disconnect`.
- `{action:"baseline"}` to begin a reviewed baseline.
- `{action:"sample",observation}` with a validated **simulated** observation for `individual-1`, `camera-1`, `room-1` in the default service instance.
- `{action:"review",id,review:"acknowledge"|"dismiss"|"note",note}`.
- `{action:"reset"}` for simulated history only. Actual-source history cannot be cleared as a demo reset.

This service accepts metadata simulation, not camera frames or microphone samples. It does not provide a raw-video endpoint or a remote notification endpoint. Failed authentication returns 401, disallowed Origins 403, invalid commands/missing consent/persistence failure 400. Body size is bounded. Writes are serialized and persisted via a restrictive-permission temp file and atomic rename. Restart preserves events and reviews but marks processing stopped.

Run the integration check with `npm run gateway:test`. It starts an ephemeral loopback instance, verifies authentication/CORS/consent, generates a temporally validated simulated event, acknowledges it, restarts from disk and verifies review retention. Its temporary directory is removed afterward.

For a real edge deployment, the next service must add camera credential storage, decoder hardening, process supervision, health/watchdog/reconnect policies, authenticated pairing and TLS where traffic leaves loopback. No production CCTV compatibility or safety monitoring is claimed by this prototype.
