import express from 'express';
import rateLimit from 'express-rate-limit';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import { WebhookPayload } from '@webhook-proxy/shared';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || '';
const FORWARD_URL = process.env.FORWARD_URL || 'http://100.99.47.83:9010/webhook';

if (!STRIPE_WEBHOOK_SECRET) {
  console.warn('⚠️  STRIPE_WEBHOOK_SECRET not set');
}

if (!INTERNAL_API_KEY) {
  console.error('❌ INTERNAL_API_KEY required');
  process.exit(1);
}

// Stripe client
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP',
});

app.use(limiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    service: 'webhook-validator',
    timestamp: Date.now()
  });
});

// Stripe webhook endpoint
app.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;

  if (!sig) {
    console.error('❌ No stripe-signature header');
    return res.status(400).send('No signature');
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
    console.log(`✅ Stripe webhook verified: ${event.type}`);
  } catch (err: any) {
    console.error(`❌ Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Build payload
  const payload: WebhookPayload = {
    provider: 'stripe',
    event: event.type,
    data: event.data.object,
    timestamp: Date.now(),
  };

  // Forward to receiver
  try {
    const response = await fetch(FORWARD_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Key': INTERNAL_API_KEY,
      },
      body: JSON.stringify({ payload }),
    });

    if (!response.ok) {
      throw new Error(`Receiver responded with ${response.status}`);
    }

    const result = await response.json();
    console.log(`✅ Forwarded to receiver: ${event.type}`, result);
    
    res.json({ received: true, forwarded: true });
  } catch (err: any) {
    console.error(`❌ Failed to forward webhook: ${err.message}`);
    res.status(500).json({ 
      received: true, 
      forwarded: false,
      error: err.message 
    });
  }
});

// GitHub webhook endpoint (optional)
app.post('/github', express.json(), async (req, res) => {
  const event = req.headers['x-github-event'] as string || 'unknown';
  
  console.log(`📦 GitHub webhook: ${event}`);

  const payload: WebhookPayload = {
    provider: 'github',
    event,
    data: req.body,
    timestamp: Date.now(),
  };

  // Forward to receiver
  try {
    const response = await fetch(FORWARD_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Key': INTERNAL_API_KEY,
      },
      body: JSON.stringify({ payload }),
    });

    if (!response.ok) {
      throw new Error(`Receiver responded with ${response.status}`);
    }

    const result = await response.json();
    console.log(`✅ Forwarded GitHub webhook: ${event}`, result);
    
    res.json({ received: true, forwarded: true });
  } catch (err: any) {
    console.error(`❌ Failed to forward GitHub webhook: ${err.message}`);
    res.status(500).json({ 
      received: true, 
      forwarded: false,
      error: err.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Webhook Validator running on port ${PORT}`);
  console.log(`📍 Forward URL: ${FORWARD_URL}`);
  console.log(`🔐 Stripe webhook secret: ${STRIPE_WEBHOOK_SECRET ? 'configured' : 'NOT SET'}`);
});
