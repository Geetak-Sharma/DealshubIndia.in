import { SearchEngine } from './SearchEngine';

export class AutocompleteEngine {
  static async suggestEntities(partial: string) {
    return SearchEngine.search(partial, { pagination: { limit: 5, offset: 0 } });
  }

  static async getTrendingSearches() {
    return ['samsung s24', 'iphone 15', 'prime day', 'flipkart sale'];
  }

  static async getPopularSearches() {
    return ['laptops', 'earbuds', 'smartphones'];
  }

  static async getRecentSearches(userId?: string) {
    // In future, pull from user profile or local storage
    return ['nike shoes'];
  }

  static async suggestCategories(partial: string) { return []; }
  static async suggestBrands(partial: string) { return []; }
  static async suggestMerchants(partial: string) { return []; }
  static async suggestCoupons(partial: string) { return []; }
}
