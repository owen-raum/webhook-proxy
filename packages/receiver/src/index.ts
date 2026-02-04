import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import dotenv from 'dotenv';
import { WebhookPayload, ReceiverResponse } from '@webhook-proxy/shared';

dotenv.config();

const execAsync = promisify(exec);

const app = express();
const PORT = process.env.PORT || 9010;
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || '';

if (!INTERNAL_API_KEY) {
  console.error('❌ INTERNAL_API_KEY required');
  process.exit(1);
}

// Middleware: Parse JSON
app.use(express.json());

// Middleware: IP Whitelist (Tailscale range)
app.use((req, res, next) => {
  const ip = req.ip || req.socket.remoteAddress || '';
  
  // Allow Tailscale (100.64.0.0/10) and local private networks (10.0.0.0/8)
  const isTailscale = ip.startsWith('100.') || ip.includes('::ffff:100.');
  const isPrivate = ip.startsWith('10.') || ip.includes('::ffff:10.') || ip === '::1' || ip === '127.0.0.1';
  
  if (!isTailscale && !isPrivate) {
    console.warn(`⚠️  Rejected request from non-whitelisted IP: ${ip}`);
    return res.status(403).json({ success: false, error: 'Forbidden' });
  }
  
  next();
});

// Middleware: API Key Validation
app.use((req, res, next) => {
  const apiKey = req.headers['x-internal-key'];
  
  if (apiKey !== INTERNAL_API_KEY) {
    console.warn(`⚠️  Invalid API key from ${req.ip}`);
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  
  next();
});

// Format webhook message for OpenClaw
function formatWebhookMessage(payload: WebhookPayload): string {
  const { provider, event, data } = payload;
  
  if (provider === 'stripe') {
    return formatStripeMessage(event, data);
  } else if (provider === 'github') {
    return formatGitHubMessage(event, data);
  }
  
  return `🔔 Webhook: ${provider}\nEvent: ${event}`;
}

function formatStripeMessage(event: string, data: any): string {
  let message = `🔔 Stripe: ${event}\n`;
  
  if (event === 'checkout.session.completed') {
    const email = data.customer_details?.email || data.customer_email || 'unknown';
    const amount = data.amount_total ? `${data.amount_total / 100}${data.currency?.toUpperCase() || ''}` : 'N/A';
    message += `Kunde: ${email}\n`;
    message += `Betrag: ${amount}\n`;
    message += `Status: ${data.payment_status}`;
  } else if (event === 'payment_intent.succeeded') {
    const amount = data.amount ? `${data.amount / 100}${data.currency?.toUpperCase() || ''}` : 'N/A';
    message += `Betrag: ${amount}\n`;
    message += `Status: succeeded`;
  } else if (event === 'customer.subscription.created') {
    message += `Customer: ${data.customer}\n`;
    message += `Plan: ${data.items?.data?.[0]?.price?.id || 'unknown'}`;
  } else {
    message += `ID: ${data.id || 'unknown'}`;
  }
  
  return message;
}

function formatGitHubMessage(event: string, data: any): string {
  let message = `🔔 GitHub: ${event}\n`;
  
  if (event === 'push') {
    message += `Repo: ${data.repository?.full_name || 'unknown'}\n`;
    message += `Branch: ${data.ref?.replace('refs/heads/', '') || 'unknown'}\n`;
    message += `Commits: ${data.commits?.length || 0}`;
  } else if (event === 'pull_request') {
    message += `Repo: ${data.repository?.full_name || 'unknown'}\n`;
    message += `Action: ${data.action || 'unknown'}\n`;
    message += `PR: #${data.number || '?'} - ${data.pull_request?.title || 'unknown'}`;
  } else if (event === 'issues') {
    message += `Repo: ${data.repository?.full_name || 'unknown'}\n`;
    message += `Action: ${data.action || 'unknown'}\n`;
    message += `Issue: #${data.issue?.number || '?'} - ${data.issue?.title || 'unknown'}`;
  } else {
    message += `Repo: ${data.repository?.full_name || 'unknown'}`;
  }
  
  return message;
}

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    service: 'webhook-receiver',
    timestamp: Date.now()
  });
});

// Webhook endpoint
app.post('/webhook', async (req, res) => {
  const { payload } = req.body as { payload: WebhookPayload };
  
  if (!payload || !payload.provider || !payload.event) {
    console.error('❌ Invalid payload structure');
    return res.status(400).json({ 
      success: false, 
      error: 'Invalid payload' 
    } as ReceiverResponse);
  }
  
  console.log(`📨 Received webhook: ${payload.provider}/${payload.event}`);
  
  // Format message
  const message = formatWebhookMessage(payload);
  
  // Call openclaw system event
  try {
    const command = `openclaw system event "${message.replace(/"/g, '\\"')}"`;
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr) {
      console.warn('⚠️  OpenClaw stderr:', stderr);
    }
    
    console.log('✅ OpenClaw event sent:', stdout.trim());
    
    res.json({ 
      success: true,
      message: 'Webhook processed'
    } as ReceiverResponse);
  } catch (err: any) {
    console.error('❌ Failed to call openclaw:', err.message);
    res.status(500).json({ 
      success: false,
      error: err.message 
    } as ReceiverResponse);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Webhook Receiver running on port ${PORT}`);
  console.log(`🔐 API key: ${INTERNAL_API_KEY ? 'configured' : 'NOT SET'}`);
  console.log(`📍 Listening for webhooks from Tailscale network`);
});
