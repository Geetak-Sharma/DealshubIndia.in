import { SearchEngine } from './SearchEngine';
import { SearchIndexSchema } from './SearchIndex';

export class IndexBuilder {
  static async add(document: SearchIndexSchema) {
    await SearchEngine.getProvider().index(document);
  }

  static async update(document: SearchIndexSchema) {
    await SearchEngine.getProvider().index(document); // Overwrites by entityId in Memory/Meili
  }

  static async remove(entityId: string) {
    // Architectural hook. Needs implementation in ISearchProvider
  }

  static async rebuild(documents: SearchIndexSchema[]) {
    // In production, this would spawn a background worker
    for (const doc of documents) {
      await this.add(doc);
    }
  }
}
