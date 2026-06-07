import type {
  LanguageModelV3Prompt,
  LanguageModelV3StreamPart,
} from '@ai-sdk/provider';

// === Payloads ===

const JAPAN_ITINERARY = {
  days: [
    {
      date: '2025-08-01',
      location: 'Tokyo, Japan',
      activities: ['Tsukiji fish market', 'Senso-ji temple', 'Shinjuku walk'],
    },
    {
      date: '2025-08-02',
      location: 'Kyoto, Japan',
      activities: [
        'Fushimi Inari shrine',
        'Arashiyama bamboo grove',
        'Gion district dinner',
      ],
    },
    {
      date: '2025-08-03',
      location: 'Osaka, Japan',
      activities: ['Dotonbori street food', 'Osaka Castle', 'Namba shopping'],
    },
  ],
};

const EUROPE_ITINERARY = {
  days: [
    {
      date: '2025-09-10',
      location: 'Paris, France',
      activities: ['Eiffel Tower', 'Louvre Museum', 'Seine dinner cruise'],
    },
    {
      date: '2025-09-11',
      location: 'Amsterdam, Netherlands',
      activities: ['Anne Frank House', 'Canal boat tour', 'Rijksmuseum'],
    },
    {
      date: '2025-09-12',
      location: 'Berlin, Germany',
      activities: ['Brandenburg Gate', 'Museum Island', 'Checkpoint Charlie'],
    },
  ],
};

// === Trigger detection ===

export type MockTrigger =
  | 'travel-itinerary'
  | 'travel-map'
  | 'budget'
  | 'notes'
  | 'default';

// Order matters: more specific patterns first
const TRIGGER_PATTERNS: Array<{ trigger: MockTrigger; pattern: RegExp }> = [
  {
    trigger: 'budget',
    pattern:
      /\b(budget|finance|cost|expense|money|price|afford|spend|cheap|expensive)\b/,
  },
  {
    trigger: 'notes',
    pattern:
      /\b(note|notes|remember|jot|write(?: down)?|save|remind|keep track)\b/,
  },
  {
    trigger: 'travel-map',
    pattern: /\b(map|locations?|pins?|places? on|where is|geography)\b/,
  },
  {
    trigger: 'travel-itinerary',
    pattern:
      /\b(trip|travel|itinerary|visit|vacation|holiday|flight|hotel|destination|tour|plan a|places?|japan|tokyo|kyoto|paris|europe|asia)\b/,
  },
];

export function detectTrigger(text: string): MockTrigger {
  const lower = text.toLowerCase();
  for (const { trigger, pattern } of TRIGGER_PATTERNS) {
    if (pattern.test(lower)) return trigger;
  }
  return 'default';
}

export function lastUserText(prompt: LanguageModelV3Prompt): string {
  for (let i = prompt.length - 1; i >= 0; i--) {
    const msg = prompt[i];
    if (msg.role === 'user') {
      return msg.content
        .filter((p) => p.type === 'text')
        .map((p) => (p as { type: 'text'; text: string }).text)
        .join(' ');
    }
  }
  return '';
}

// Returns native widget IDs to pre-mount before the model responds
export function mockWidgetIds(trigger: MockTrigger): string[] {
  switch (trigger) {
    case 'travel-itinerary':
      return ['travel.itinerary'];
    case 'travel-map':
      return ['travel.map'];
    case 'budget':
      return ['finance.budget'];
    case 'notes':
      return ['data.notes'];
    default:
      return [];
  }
}

// === Chunk builders ===

function textChunks(id: string, content: string): LanguageModelV3StreamPart[] {
  return [
    { type: 'text-start', id },
    { type: 'text-delta', id, delta: content },
    { type: 'text-end', id },
  ];
}

function renderWidget(
  callId: string,
  widgetId: string,
  payload: unknown
): LanguageModelV3StreamPart {
  return {
    type: 'tool-call',
    toolCallId: callId,
    toolName: 'render_widget',
    input: JSON.stringify({
      widget_id: widgetId,
      update_strategy: 'mount',
      payload,
    }),
  };
}

function finishChunk(toolCalls: boolean): LanguageModelV3StreamPart {
  return {
    type: 'finish',
    finishReason: {
      unified: toolCalls ? 'tool-calls' : 'stop',
      raw: undefined,
    },
    usage: {
      inputTokens: { total: 0, noCache: 0, cacheRead: 0, cacheWrite: 0 },
      outputTokens: { total: 0, text: 0, reasoning: 0 },
    },
  };
}

export function buildMockChunks(
  trigger: MockTrigger
): LanguageModelV3StreamPart[] {
  switch (trigger) {
    case 'travel-itinerary':
      return [
        ...textChunks('t1', '[MOCK] Here is a 3-day itinerary for Japan!'),
        renderWidget('tc1', 'travel.itinerary', JAPAN_ITINERARY),
        finishChunk(true),
      ];
    case 'travel-map':
      return [
        ...textChunks('t1', '[MOCK] Here are the locations on the map.'),
        renderWidget('tc1', 'travel.map', JAPAN_ITINERARY),
        finishChunk(true),
      ];
    case 'budget':
      return [
        ...textChunks(
          't1',
          '[MOCK] Here is a budget breakdown for a 3-day Europe trip.'
        ),
        renderWidget('tc1', 'finance.budget', EUROPE_ITINERARY),
        finishChunk(true),
      ];
    case 'notes':
      return [
        ...textChunks(
          't1',
          '[MOCK] The Notes widget is open — jot things down anytime.'
        ),
        // render_widget with an empty payload so the mount is persisted and
        // can be replayed on reload. DataNotes ignores the MOUNT envelope and
        // manages its own state internally.
        renderWidget('tc1', 'data.notes', {}),
        finishChunk(true),
      ];
    default:
      return [
        ...textChunks(
          't1',
          '[MOCK] Hello! Ask me about travel planning, budgets, or notes.'
        ),
        finishChunk(false),
      ];
  }
}
