const VERSION = 'v1';

export const CacheKey = {
  entity: (id: string) => `${VERSION}:entity:${id}`,
  query: (type: string, param: string) => `${VERSION}:query:${type}:${param}`,
  api: (endpoint: string) => `${VERSION}:api:${endpoint}`
};
