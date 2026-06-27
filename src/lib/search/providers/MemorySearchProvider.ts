import { ISearchProvider } from '../SearchProvider';
import { SearchQuery } from '../SearchQuery';
import { SearchResult, SearchResultItem } from '../SearchResult';
import { SearchIndexSchema } from '../SearchIndex';
import { RankingEngine } from '../RankingEngine';
import { SynonymEngine } from '../SynonymEngine';

export class MemorySearchProvider implements ISearchProvider {
  name = 'MemorySearchProvider';
  private documents: Map<string, SearchIndexSchema> = new Map();
  // True Inverted Index
  private invertedIndex: Map<string, Set<string>> = new Map();

  // Simple Levenshtein distance
  private levenshtein(a: string, b: string): number {
    const matrix = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }
    return matrix[a.length][b.length];
  }

  private tokenize(text: string): string[] {
    return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
  }

  async index(document: SearchIndexSchema): Promise<void> {
    const memDoc = { ...document };
    if (memDoc.description && memDoc.description.length > 500) {
      memDoc.description = memDoc.description.substring(0, 500);
    }
    this.documents.set(document.entityId, memDoc);

    // Build Inverted Index
    const tokens = new Set([
      ...this.tokenize(document.title),
      ...(document.keywords ? document.keywords.flatMap(k => this.tokenize(k)) : []),
      ...(document.taxonomy ? document.taxonomy.flatMap(t => this.tokenize(t)) : [])
    ]);

    tokens.forEach(token => {
      if (!this.invertedIndex.has(token)) {
        this.invertedIndex.set(token, new Set());
      }
      this.invertedIndex.get(token)!.add(document.entityId);
    });
  }

  async search(query: SearchQuery): Promise<SearchResult> {
    const start = performance.now();
    const hits: Map<string, number> = new Map();
    
    // 1. Synonym Expansion
    const expandedString = SynonymEngine.expand(query.rawString);
    const queryTokens = this.tokenize(expandedString);

    // 2. Inverted Index Lookup (O(1) sets)
    let candidateIds = new Set<string>();
    
    // If empty query but has filters, return all docs matching filters
    if (queryTokens.length === 0 && Object.keys(query.filters).length > 0) {
        this.documents.forEach((_, id) => candidateIds.add(id));
    } else {
        queryTokens.forEach(token => {
        // Exact matching
        if (this.invertedIndex.has(token)) {
            this.invertedIndex.get(token)!.forEach(id => candidateIds.add(id));
        }
        });

        // 3. Fuzzy Search Fallback (Zero-Result Catch)
        if (candidateIds.size === 0 && queryTokens.length > 0) {
        queryTokens.forEach(token => {
            for (const indexToken of this.invertedIndex.keys()) {
            if (Math.abs(indexToken.length - token.length) <= 2) {
                if (this.levenshtein(token, indexToken) <= 2) {
                this.invertedIndex.get(indexToken)!.forEach(id => candidateIds.add(id));
                }
            }
            }
        });
        }
    }

    // 4. Scoring and Filtering
    const results: SearchResultItem[] = [];
    candidateIds.forEach(id => {
      const doc = this.documents.get(id)!;
      let isMatch = true;

      if (query.filters.merchantIds && query.filters.merchantIds.length > 0) {
        if (!query.filters.merchantIds.includes(doc.relationships.merchantId || '')) isMatch = false;
      }
      if (query.filters.categoryIds && query.filters.categoryIds.length > 0) {
        if (!query.filters.categoryIds.includes(doc.relationships.categoryId || '')) isMatch = false;
      }

      if (isMatch) {
        const score = RankingEngine.calculateScore(doc, query);
        results.push({ entityId: doc.entityId, entityType: doc.entityType, score });
      }
    });

    results.sort((a, b) => b.score - a.score);

    return {
      items: results.slice(query.pagination.offset, query.pagination.offset + query.pagination.limit),
      totalHits: results.length,
      processingTimeMs: performance.now() - start
    };
  }
}
