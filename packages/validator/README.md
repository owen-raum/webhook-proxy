# Webhook Validator (Hetzner Service)

Validates incoming webhooks (Stripe, GitHub) and forwards them to the Mac Mini receiver via Tailscale.

## Features

- ✅ Stripe webhook signature validation
- ✅ GitHub webhook support (optional)
- ✅ Rate limiting (100 req/15min per IP)
- ✅ Tailscale network isolation
- ✅ Docker Compose deployment

## Endpoints

- `GET /health` — Health check
- `POST /stripe` — Stripe webhooks (signature validated)
- `POST /github` — GitHub webhooks (optional)

## Setup

### 1. Configure Environment

```bash
cp .env.example .env
# Edit .env with your values
```

Required variables:
- `STRIPE_WEBHOOK_SECRET` — From Stripe Dashboard
- `STRIPE_SECRET_KEY` — Your Stripe secret key
- `INTERNAL_API_KEY` — Shared secret with receiver
- `TS_AUTHKEY` — Tailscale auth key (one-time, ephemeral)
- `FORWARD_URL` — Receiver URL (default: `http://100.99.47.83:9010/webhook`)

### 2. Deploy with Docker Compose

```bash
docker-compose up -d
```

The validator will:
1. Connect to Tailscale network
2. Start Express server on port 3000
3. Forward validated webhooks to receiver

### 3. Configure Stripe

In Stripe Dashboard → Webhooks:
1. Add endpoint: `https://your-hetzner-ip:3000/stripe`
2. Select events you want to receive
3. Copy the webhook signing secret to `.env`

## Architecture

```
Internet → Validator (Hetzner)
              ↓ validates signature
              ↓ rate limits
              ↓ Tailscale
           Receiver (Mac Mini)
```

## Logs

```bash
docker-compose logs -f validator
```

## Development

```bash
pnpm install
pnpm dev
```

## Security

- Stripe signature validation prevents replay attacks
- Rate limiting prevents abuse
- Tailscale provides encrypted tunnel
- Internal API key authenticates validator→receiver
