export interface PromptTemplate {
  system: string;
  user: string;
}

export const PromptBuilder = {
  build: (systemPattern: string, userPattern: string, data: Record<string, any>): PromptTemplate => {
    let system = systemPattern;
    let user = userPattern;
    
    Object.entries(data).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      const replacement = typeof value === 'object' ? JSON.stringify(value) : String(value);
      system = system.replace(regex, replacement);
      user = user.replace(regex, replacement);
    });

    return { system, user };
  }
};
