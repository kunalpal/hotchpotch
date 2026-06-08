export const AI_PROVIDERS = ['mock', 'gateway', 'bedrock'] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number];

export const PROVIDER_MODELS: Record<Exclude<AiProvider, 'mock'>, string[]> = {
  gateway: [
    'deepseek/deepseek-v4-flash',
    'anthropic/claude-3-5-sonnet',
    'openai/gpt-4o-mini',
    'google/gemini-2.0-flash',
  ],
  bedrock: [
    'anthropic.claude-3-5-sonnet-20241022-v2:0',
    'anthropic.claude-3-haiku-20240307-v1:0',
    'amazon.nova-pro-v1:0',
    'meta.llama3-1-8b-instruct-v1:0',
  ],
};

export const DEFAULT_MODEL: Record<Exclude<AiProvider, 'mock'>, string> = {
  gateway: 'deepseek/deepseek-v4-flash',
  bedrock: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
};
