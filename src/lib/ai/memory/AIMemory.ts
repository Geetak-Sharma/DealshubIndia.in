// AI Memory Architecture Interfaces (No implementation required yet per Phase 5)

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ConversationMemory {
  sessionId: string;
  history: AIMessage[];
}

export interface EntityMemory {
  entityId: string;
  summary: string;
  embeddingsPlaceholder?: string;
}

export interface SessionMemory {
  userId: string;
  shortTermContext: Record<string, any>;
}

export interface LongTermMemory {
  // Future Vector Database Hooks
  store(vector: number[], metadata: Record<string, any>): Promise<void>;
  retrieve(vector: number[]): Promise<any[]>;
}
