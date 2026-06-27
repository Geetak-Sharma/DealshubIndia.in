import { SearchIndexSchema } from './SearchIndex';
import { SearchQuery } from './SearchQuery';

export class RankingEngine {
  static calculateScore(document: SearchIndexSchema, query: SearchQuery): number {
    let score = 0;
    const lowerQuery = query.rawString.toLowerCase();
    const lowerTitle = document.title.toLowerCase();

    // Heuristic 1: Exact Match
    if (lowerTitle === lowerQuery) {
      score += 100;
    }
    
    // Heuristic 2: Prefix Match
    if (lowerTitle.startsWith(lowerQuery)) {
      score += 50;
    } else if (lowerTitle.includes(lowerQuery)) {
      score += 20; // Partial Match
    }

    // Heuristic 3: Keyword Match
    if (document.keywords && document.keywords.some(k => k.toLowerCase() === lowerQuery)) {
      score += 30;
    }

    // Heuristic 4: Taxonomy Boost (e.g. searching "shoes" and the category is shoes)
    if (document.taxonomy && document.taxonomy.some(t => t.toLowerCase().includes(lowerQuery))) {
      score += 15;
    }

    // Future Heuristic: AI Embeddings Semantic Similarity (requires VectorDB hook)

    return score;
  }
}
