export interface NotificationPayload {
  title: string;
  body: string;
  link?: string;
  type: 'DEAL_ALERT' | 'PRICE_DROP' | 'SYSTEM';
}

export interface INotificationProvider {
  name: string;
  send(userId: string, payload: NotificationPayload): Promise<boolean>;
}

export class NotificationManagerImpl {
  private providers: INotificationProvider[] = [];

  registerProvider(provider: INotificationProvider) {
    this.providers.push(provider);
  }

  async dispatch(userId: string, payload: NotificationPayload) {
    // In production, user preferences dictate which providers to use (e.g. Push vs Email)
    const results = await Promise.all(this.providers.map(p => p.send(userId, payload)));
    return results.some(r => r === true);
  }
}

export const NotificationManager = new NotificationManagerImpl();
