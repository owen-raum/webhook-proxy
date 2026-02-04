# Webhook Receiver (Mac Mini Service)

Receives validated webhooks from the Hetzner validator and triggers OpenClaw system events.

## Features

- ✅ API key validation
- ✅ IP whitelist (Tailscale + private networks)
- ✅ Calls `openclaw system event` with formatted messages
- ✅ PM2 auto-restart
- ✅ Stripe & GitHub webhook formatting

## Endpoint

- `GET /health` — Health check
- `POST /webhook` — Receive forwarded webhooks

## Setup

### 1. Install Dependencies

```bash
cd packages/receiver
pnpm install
pnpm build
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your values
```

Required:
- `INTERNAL_API_KEY` — Must match validator's API key
- `PORT` — Server port (default: 9010)

### 3. Start with PM2

```bash
# Install PM2 globally if needed
npm install -g pm2

# Start service
pnpm pm2:start

# Check status
pm2 status

# View logs
pnpm pm2:logs

# Restart
pnpm pm2:restart

# Stop
pnpm pm2:stop
```

### 4. Auto-start on Boot

```bash
pm2 startup
pm2 save
```

## Security

- **API Key:** Validates `X-Internal-Key` header
- **IP Whitelist:** Only accepts requests from:
  - Tailscale network (100.64.0.0/10)
  - Private networks (10.0.0.0/8)
  - Localhost

## Message Format

### Stripe Examples

**checkout.session.completed:**
```
🔔 Stripe: checkout.session.completed
Kunde: max@example.com
Betrag: 149EUR
Status: paid
```

**payment_intent.succeeded:**
```
🔔 Stripe: payment_intent.succeeded
Betrag: 49USD
Status: succeeded
```

### GitHub Examples

**push:**
```
🔔 GitHub: push
Repo: owen-raum/webhook-proxy
Branch: main
Commits: 3
```

**pull_request:**
```
🔔 GitHub: pull_request
Repo: owen-raum/webhook-proxy
Action: opened
PR: #5 - Add rate limiting
```

## Development

```bash
pnpm dev
```

## Logs

PM2 logs are stored in `./logs/`:
- `error.log` — Error logs
- `out.log` — Standard output

View live:
```bash
pnpm pm2:logs
```

## Architecture

```
Validator (Hetzner)
    ↓ Tailscale
Receiver (Mac Mini) → openclaw system event → WhatsApp/Discord/etc
```
