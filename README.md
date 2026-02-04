# Webhook Proxy

Monorepo für Webhook-Validation und -Forwarding zwischen Hetzner und Mac Mini.

## Architecture

```
Internet → Hetzner (validator) → Tailscale → Mac Mini (receiver) → OpenClaw
```

## Packages

- **packages/validator** — Hetzner Service (Docker)
  - Validates Stripe webhook signatures
  - Forwards to Mac Mini via Tailscale
  - See [packages/validator/README.md](packages/validator/README.md)

- **packages/receiver** — Mac Mini Service (PM2)
  - Receives validated webhooks
  - Calls `openclaw system event`
  - See [packages/receiver/README.md](packages/receiver/README.md)

- **packages/shared** — Shared TypeScript types

## Setup

```bash
pnpm install
pnpm build
```

## Development

```bash
# Validator
pnpm dev:validator

# Receiver
pnpm dev:receiver
```

## Deployment

- **Validator:** Docker Compose on Hetzner (see packages/validator)
- **Receiver:** PM2 on Mac Mini (see packages/receiver)

## Security

- Stripe signature validation on validator
- API key between validator and receiver
- Tailscale network isolation
- IP whitelist on receiver (Tailscale range only)
