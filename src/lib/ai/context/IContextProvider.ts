export interface IContextProvider<T = any> {
  name: string;
  buildContext(entityId: string): Promise<Record<string, any>>;
}
