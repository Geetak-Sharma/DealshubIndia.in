export class SynonymEngine {
  private static dictionary: Map<string, string> = new Map([
    ['tv', 'television'],
    ['earbuds', 'tws'],
    ['mobile', 'smartphone'],
    ['phone', 'smartphone'],
    ['ac', 'air conditioner']
  ]);

  static expand(query: string): string {
    let expanded = query.toLowerCase();
    for (const [key, val] of this.dictionary.entries()) {
      const regex = new RegExp(`\\b${key}\\b`, 'gi');
      expanded = expanded.replace(regex, `${key} ${val}`);
    }
    return expanded;
  }
}
