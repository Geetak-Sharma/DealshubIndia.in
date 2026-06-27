import { BaseEntity } from '../types';

export interface IEntityProvider {
  upsert(entity: BaseEntity): void | Promise<void>;
  findById(id: string): BaseEntity | undefined | Promise<BaseEntity | undefined>;
  findBySlug(slug: string): BaseEntity | undefined | Promise<BaseEntity | undefined>;
  getAll(): BaseEntity[] | Promise<BaseEntity[]>;
}
