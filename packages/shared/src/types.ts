export interface WebhookPayload {
  provider: 'stripe' | 'github' | 'unknown';
  event: string;
  data: any;
  rawBody?: string;
  timestamp: number;
}

export interface ForwardRequest {
  payload: WebhookPayload;
  signature?: string;
}

export interface ReceiverResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: any;
  };
  created: number;
}
