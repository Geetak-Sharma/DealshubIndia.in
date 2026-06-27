import { SearchEngine } from '../search/SearchEngine';
import { UserPreferenceEngine } from './UserPreferenceEngine';

export class PersonalizationEngine {
  static async getPersonalizedDeals(userId: string) {
    const prefs = await UserPreferenceEngine.getPreferences(userId);
    
    // Natively hook into SearchEngine by piping the user's preferred categories as filters
    const searchRes = await SearchEngine.search('', {
      filters: {
        categoryIds: prefs.preferredCategories,
        merchantIds: prefs.preferredMerchants
      },
      pagination: { limit: 10, offset: 0 }
    });

    return searchRes.items;
  }
}
