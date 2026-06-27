import { z } from 'zod';

export interface PromptDefinition {
  id: string;
  version: string;
  owner: string;
  description: string;
  systemTemplate: string;
  userTemplate: string;
  expectedOutputSchema?: z.ZodTypeAny;
}

export class PromptRegistryImpl {
  private prompts: Map<string, PromptDefinition> = new Map();

  register(prompt: PromptDefinition) {
    const key = `${prompt.id}:${prompt.version}`;
    if (this.prompts.has(key)) {
      throw new Error(`Prompt ${key} is already registered.`);
    }
    this.prompts.set(key, prompt);
  }

  get(id: string, version: string): PromptDefinition {
    const key = `${id}:${version}`;
    const prompt = this.prompts.get(key);
    if (!prompt) throw new Error(`Prompt ${key} not found.`);
    return prompt;
  }

  list(): PromptDefinition[] {
    return Array.from(this.prompts.values());
  }

  // Builder utility to compile the prompt
  compile(promptDef: PromptDefinition, data: Record<string, any>): { system: string; user: string } {
    let system = promptDef.systemTemplate;
    let user = promptDef.userTemplate;
    
    Object.entries(data).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      const replacement = typeof value === 'object' ? JSON.stringify(value) : String(value);
      system = system.replace(regex, replacement);
      user = user.replace(regex, replacement);
    });

    return { system, user };
  }
}

export const PromptRegistry = new PromptRegistryImpl();

// Register Default Prompts for architecture demo
import { z as zod } from 'zod';
PromptRegistry.register({
  id: 'deal-summary',
  version: 'v1.0.0',
  owner: 'platform-team',
  description: 'Generates a 2-sentence summary for a deal.',
  systemTemplate: 'You are an expert commerce editor. Output JSON only. Format: {"summary": "..."}',
  userTemplate: 'Deal Data: {{deal}}\nContext: {{context}}',
  expectedOutputSchema: zod.object({ summary: zod.string() })
});
