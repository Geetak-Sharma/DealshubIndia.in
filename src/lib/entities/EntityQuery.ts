import { EntityRegistry } from './EntityRegistry';
import { DealEntity, BlogEntity, CouponEntity, StoreEntity } from './types';

export class EntityQuery {
  private static get all() {
    return EntityRegistry.getAll() as any[];
  }

  static findDealsByMerchant(merchantId: string): DealEntity[] {
    return this.all.filter(e => e.type === 'Deal' && e.merchantId === merchantId);
  }

  static findDealsByCategory(categoryId: string): DealEntity[] {
    return this.all.filter(e => e.type === 'Deal' && e.categoryId === categoryId);
  }

  static findBlogsByCategory(categoryId: string): BlogEntity[] {
    // Requires a Blog -> Category relationship extension, or via Deals.
    // For now, if Blog has a relatedCategories array:
    return this.all.filter(e => e.type === 'Blog' && e.relatedCategories?.includes(categoryId));
  }

  static findCouponsByMerchant(merchantId: string): CouponEntity[] {
    return this.all.filter(e => e.type === 'Coupon' && e.merchantId === merchantId);
  }

  static findStoresByBrand(brandId: string): StoreEntity[] {
    return this.all.filter(e => e.type === 'Store' && e.brandId === brandId);
  }
}
