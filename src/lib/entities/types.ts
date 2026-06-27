export type EntityType = 
  | 'Deal' | 'Merchant' | 'Brand' | 'Guide' | 'Blog' 
  | 'Coupon' | 'Tool' | 'Store' 
  | 'Category' | 'Subcategory' | 'Collection' | 'Topic';

export interface BaseEntity {
  id: string;
  slug: string;
  name: string;
  type: EntityType;
  metadata: Record<string, any>;
}

// Taxonomy Hierarchy
export interface CategoryEntity extends BaseEntity { type: 'Category'; subcategoryIds?: string[]; }
export interface SubcategoryEntity extends BaseEntity { type: 'Subcategory'; categoryId: string; collectionIds?: string[]; }
export interface CollectionEntity extends BaseEntity { type: 'Collection'; subcategoryId: string; topicIds?: string[]; }
export interface TopicEntity extends BaseEntity { type: 'Topic'; collectionId: string; }

// Core Entities with strictly typed relationships
export interface DealEntity extends BaseEntity { 
  type: 'Deal'; 
  merchantId: string;
  categoryId: string;
  brandId?: string;
  relatedBlogs?: string[];
  relatedGuides?: string[];
}

export interface MerchantEntity extends BaseEntity { type: 'Merchant'; relatedCoupons?: string[]; }
export interface BrandEntity extends BaseEntity { type: 'Brand'; }
export interface GuideEntity extends BaseEntity { type: 'Guide'; relatedDeals?: string[]; }
export interface BlogEntity extends BaseEntity { type: 'Blog'; relatedDeals?: string[]; }
export interface CouponEntity extends BaseEntity { type: 'Coupon'; merchantId: string; }
export interface ToolEntity extends BaseEntity { type: 'Tool'; }
export interface StoreEntity extends BaseEntity { type: 'Store'; brandId?: string; merchantId?: string; }
