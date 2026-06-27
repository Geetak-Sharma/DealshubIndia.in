import { SearchQuery } from './SearchQuery';

export class QueryParser {
  static parse(rawString: string): SearchQuery {
    const query: SearchQuery = {
      rawString,
      keywords: [],
      filters: {},
      pagination: { limit: 20, offset: 0 }
    };

    // Very basic filter parsing for architectural demonstration
    // e.g., "sneakers merchant:amazon brand:nike"
    const tokens = rawString.match(/(?:[^\s"]+|"[^"]*")+/g) || [];

    for (const token of tokens) {
      if (token.includes(':')) {
        const [key, value] = token.split(':');
        if (key === 'merchant') query.filters.merchantIds = [value];
        else if (key === 'brand') query.filters.brandIds = [value];
        else if (key === 'category') query.filters.categoryIds = [value];
      } else {
        query.keywords.push(token.replace(/"/g, ''));
      }
    }

    // Reconstruct rawString without the filters for text ranking
    query.rawString = query.keywords.join(' ');
    return query;
  }
}
