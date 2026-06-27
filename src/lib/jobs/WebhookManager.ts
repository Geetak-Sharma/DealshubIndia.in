import crypto from 'crypto';

export class WebhookManager {
  static verifyIncoming(payload: string, signature: string, secret: string): boolean {
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    return expected === signature;
  }

  static async dispatchOutgoing(url: string, payload: any, secret: string) {
    const body = JSON.stringify(payload);
    const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');
    
    // In production, dispatch via WorkerPool/JobScheduler to ensure retries
    // JobScheduler.enqueue(new WebhookDispatchJob({ url, body, signature }))
    return { dispatched: true, signature };
  }
}
