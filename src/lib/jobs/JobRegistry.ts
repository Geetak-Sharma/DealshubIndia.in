import { Job } from './Job';

export class JobRegistry {
  private static handlers: Map<string, (payload: any) => Job> = new Map();

  static register(type: string, factory: (payload: any) => Job) {
    if (this.handlers.has(type)) {
      throw new Error(`Job type ${type} is already registered.`);
    }
    this.handlers.set(type, factory);
  }

  static getFactory(type: string) {
    return this.handlers.get(type);
  }
}
