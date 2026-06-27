export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  region: string;
  language: string;
  notificationsEnabled: boolean;
  preferredCategories: string[];
  preferredMerchants: string[];
}

export class UserPreferenceEngine {
  // In production, this pulls from PostgreSQL or a fast Redis KV
  static async getPreferences(userId: string): Promise<UserPreferences> {
    return {
      theme: 'system',
      region: 'IN',
      language: 'en',
      notificationsEnabled: true,
      preferredCategories: ['electronics', 'fashion'],
      preferredMerchants: ['amazon', 'flipkart']
    };
  }
}
