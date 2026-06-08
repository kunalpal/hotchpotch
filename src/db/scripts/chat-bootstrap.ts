/**
 * Bootstrap script for the Chat module
 *
 * Seeds the dev database with realistic chat conversations and messages.
 * Covers single-widget and multi-widget scenarios with persisted snapshots.
 */

import { loadEnvConfig } from '@next/env';
import { createDb } from '../connection';
import { conversation, message, widgetSnapshot } from '../index';
import { logger } from './logger';
import { DEV_USER_ID } from './constants';
import type { DbInstance, SeedResult } from './module-registry';

type TextPart = { type: 'text'; text: string };
type StepStartPart = { type: 'step-start' };
type ToolRenderWidgetPart = {
  type: 'tool-render_widget';
  input: {
    widget_id: string;
    payload: unknown;
    update_strategy?: 'mount' | 'replace';
  };
};
type MessagePart = TextPart | StepStartPart | ToolRenderWidgetPart;

function userParts(text: string): MessagePart[] {
  return [{ type: 'text', text }];
}

function assistantParts(text: string): MessagePart[] {
  return [{ type: 'step-start' }, { type: 'text', text }];
}

const SEED_CONVERSATIONS: Array<{
  id: string;
  title: string;
  messages: Array<{
    id: string;
    role: 'user' | 'assistant';
    parts: MessagePart[];
  }>;
}> = [
  {
    id: 'seed-conv-travel-001',
    title: 'Planning a Tokyo trip',
    messages: [
      {
        id: 'seed-msg-t-001',
        role: 'user',
        parts: userParts(
          'I want to plan a 7-day trip to Tokyo in March. Can you help me build an itinerary?'
        ),
      },
      {
        id: 'seed-msg-t-002',
        role: 'assistant',
        parts: assistantParts(
          "I'd love to help you plan your Tokyo trip! March is a fantastic time to visit — the cherry blossoms (sakura) typically begin blooming in late March, making it one of the most scenic periods.\n\nI've put together a 7-day itinerary in the side panel. Here's a quick overview:\n\n**Days 1–2**: Explore central Tokyo — Shinjuku, Shibuya crossing, Harajuku\n**Days 3–4**: Culture and history — Asakusa, Ueno museums, Akihabara\n**Day 5**: Day trip to Nikko or Hakone (Mt. Fuji views)\n**Days 6–7**: Tokyo neighborhoods — Shimokitazawa, Yanaka, teamLab Planets\n\nWant me to adjust any of the days or add specific activities?"
        ),
      },
      {
        id: 'seed-msg-t-003',
        role: 'user',
        parts: userParts(
          'Can you add a day in Kyoto? I can extend the trip to 8 days.'
        ),
      },
      {
        id: 'seed-msg-t-004',
        role: 'assistant',
        parts: assistantParts(
          "Great call — Kyoto is well worth it. I've updated the itinerary to 8 days and added a Kyoto day (Day 5) via bullet train. The shinkansen from Tokyo to Kyoto takes about 2h 15min.\n\nFor your Kyoto day I've included:\n- **Fushimi Inari** (iconic torii gates — best early morning)\n- **Arashiyama bamboo grove**\n- **Gion district** in the evening for a chance to spot maiko\n\nNote: if you're travelling in late March, book the Kyoto day early in the week — weekends get very crowded during cherry blossom season. Let me know if you'd like hotel suggestions too."
        ),
      },
    ],
  },
  {
    id: 'seed-conv-finance-001',
    title: 'Q1 budget review',
    messages: [
      {
        id: 'seed-msg-f-001',
        role: 'user',
        parts: userParts(
          'Help me set up a monthly budget. I earn around $5,500/month take-home and want to save 20%.'
        ),
      },
      {
        id: 'seed-msg-f-002',
        role: 'assistant',
        parts: assistantParts(
          "I've loaded a budget breakdown in the side panel. Based on a $5,500 take-home with a 20% savings target ($1,100/month), here's how I'd suggest allocating the rest:\n\n| Category | Amount | % |\n|---|---|---|\n| Savings | $1,100 | 20% |\n| Rent/housing | $1,650 | 30% |\n| Food | $550 | 10% |\n| Transport | $275 | 5% |\n| Utilities | $165 | 3% |\n| Health | $220 | 4% |\n| Entertainment | $330 | 6% |\n| Clothing | $110 | 2% |\n| Misc/buffer | $1,100 | 20% |\n\nThis follows a modified 50/30/20 rule. The \"misc/buffer\" gives you flexibility. Want to adjust any category?"
        ),
      },
      {
        id: 'seed-msg-f-003',
        role: 'user',
        parts: userParts(
          'My rent is $1,800 which is a bit over. Can you recalculate and trim entertainment and misc?'
        ),
      },
      {
        id: 'seed-msg-f-004',
        role: 'assistant',
        parts: assistantParts(
          "Updated! With rent at $1,800 (32.7%), I've trimmed entertainment to $220 and misc to $855 to keep the total balanced. Savings stays at $1,100.\n\nThe revised budget is reflected in the panel. One tip: if rent is a stretch, look at whether your employer offers any commuter benefits — even $50–100/month in pre-tax transport can help offset the overage. Want me to add a debt repayment line or an emergency fund split?"
        ),
      },
    ],
  },
  {
    id: 'seed-conv-notes-001',
    title: 'React performance notes',
    messages: [
      {
        id: 'seed-msg-n-001',
        role: 'user',
        parts: userParts(
          'Can you help me take some notes on React performance optimisation techniques? I want to capture the key patterns.'
        ),
      },
      {
        id: 'seed-msg-n-002',
        role: 'assistant',
        parts: assistantParts(
          "I've created a note in the panel with the key patterns. Here's a summary:\n\n**Rendering**\n- `React.memo` for components that receive stable props\n- `useMemo` for expensive derived values, not for every value\n- `useCallback` only when passing callbacks to memoized children\n\n**State**\n- Lift state only as high as needed — keep it close to its consumers\n- Prefer multiple small state atoms over one big object when parts update independently\n- `useReducer` for complex state machines\n\n**Lists**\n- Virtualise lists over ~100 items (`react-window` or `tanstack-virtual`)\n- Always provide stable `key` props — never use array index for dynamic lists\n\n**Profiling**\n- Use React DevTools Profiler before optimising — measure first\n- `why-did-you-render` library for spotting unnecessary re-renders in development\n\nWant me to expand on any of these or add more sections?"
        ),
      },
      {
        id: 'seed-msg-n-003',
        role: 'user',
        parts: userParts('Add a section on code splitting and lazy loading.'),
      },
      {
        id: 'seed-msg-n-004',
        role: 'assistant',
        parts: assistantParts(
          "Added a \"Code Splitting\" section to the note. Key points:\n\n**Code Splitting**\n- `React.lazy` + `Suspense` for route-level splits — keeps initial bundle small\n- Dynamic `import()` for heavy, conditionally-used modules (e.g. chart libraries, PDF renderers)\n- In Next.js: `next/dynamic` wraps `React.lazy` with SSR control (`{ ssr: false }` for client-only code)\n- Analyse bundle with `@next/bundle-analyzer` to find what's worth splitting\n\n**Prefetching**\n- `<Link prefetch>` in Next.js prefetches the route chunk on hover\n- For non-link lazy components, call `import('./HeavyComponent')` early (e.g. on page focus) to warm the cache before it's needed\n\nThe note panel has the full formatted version."
        ),
      },
    ],
  },
];

// ─── Multi-widget conversations ───────────────────────────────────────────────

const JAPAN_ITINERARY_PAYLOAD = {
  days: [
    {
      date: '2025-04-01',
      location: 'Tokyo — Shinjuku & Shibuya',
      activities: [
        'Explore Shinjuku Gyoen',
        'Shibuya Crossing at night',
        'Dinner in Kabukicho',
      ],
    },
    {
      date: '2025-04-02',
      location: 'Tokyo — Asakusa & Akihabara',
      activities: [
        'Senso-ji Temple',
        'Nakamise shopping street',
        'Akihabara electronics district',
      ],
    },
    {
      date: '2025-04-03',
      location: 'Nikko',
      activities: ['Toshogu Shrine', 'Kegon Falls', 'Lake Chuzenji'],
    },
    {
      date: '2025-04-04',
      location: 'Kyoto — Arashiyama',
      activities: ['Bamboo grove', 'Tenryu-ji garden', 'Boat ride on Oi River'],
    },
    {
      date: '2025-04-05',
      location: 'Kyoto — Gion & Fushimi',
      activities: [
        'Fushimi Inari torii gates',
        'Nishiki Market',
        'Gion evening walk',
      ],
    },
    {
      date: '2025-04-06',
      location: 'Osaka',
      activities: [
        'Dotonbori street food',
        'Osaka Castle',
        'Kuromon Ichiba Market',
      ],
    },
    {
      date: '2025-04-07',
      location: 'Hiroshima & Miyajima',
      activities: [
        'Peace Memorial Park',
        'Floating torii gate at Itsukushima',
        'Local oysters',
      ],
    },
    {
      date: '2025-04-08',
      location: 'Hakone',
      activities: [
        'Mt. Fuji views across the lake',
        'Hakone Open-Air Museum',
        'Onsen ryokan stay',
      ],
    },
    {
      date: '2025-04-09',
      location: 'Tokyo — Harajuku & Shimokitazawa',
      activities: [
        'Takeshita Street',
        'Meiji Shrine',
        'Vintage shops in Shimokitazawa',
      ],
    },
    {
      date: '2025-04-10',
      location: 'Tokyo — teamLab & departure',
      activities: [
        'teamLab Planets',
        'Last-minute shopping in Ginza',
        'Narita Airport',
      ],
    },
  ],
};

const BERLIN_ITINERARY_PAYLOAD = {
  days: [
    {
      date: '2025-09-15',
      location: 'Berlin Mitte — Arrival',
      activities: [
        'Check in to conference hotel',
        'Welcome reception at venue',
      ],
    },
    {
      date: '2025-09-16',
      location: 'Berlin — Conference Day 1',
      activities: [
        'Keynote: Future of AI',
        'Workshop: Distributed Systems at Scale',
        'Networking dinner in Prenzlauer Berg',
      ],
    },
    {
      date: '2025-09-17',
      location: 'Berlin — Conference Day 2',
      activities: [
        'Keynote: Open Source Futures',
        'Talk: WebAssembly Component Model',
        'Evening at East Side Gallery',
      ],
    },
    {
      date: '2025-09-18',
      location: 'Berlin — Sightseeing & Departure',
      activities: [
        'Brandenburg Gate',
        'Museum Island morning visit',
        'Return flight',
      ],
    },
  ],
};

function renderWidgetPart(
  widgetId: string,
  payload: unknown
): ToolRenderWidgetPart {
  return {
    type: 'tool-render_widget',
    input: { widget_id: widgetId, payload, update_strategy: 'mount' },
  };
}

const MULTI_WIDGET_CONVERSATIONS: Array<{
  id: string;
  title: string;
  messages: Array<{
    id: string;
    role: 'user' | 'assistant';
    parts: MessagePart[];
  }>;
  snapshots: Array<{ widgetId: string; state: Record<string, unknown> }>;
}> = [
  {
    id: 'seed-conv-japan-001',
    title: 'Japan 10-day trip — map, itinerary & budget',
    messages: [
      {
        id: 'seed-msg-j-001',
        role: 'user',
        parts: userParts(
          "I want to plan a 10-day Japan trip in early April. Can you build a full itinerary with a map and a day-by-day budget? I'm flying in and out of Tokyo."
        ),
      },
      {
        id: 'seed-msg-j-002',
        role: 'assistant',
        parts: [
          { type: 'step-start' },
          renderWidgetPart('travel.map', JAPAN_ITINERARY_PAYLOAD),
          renderWidgetPart('travel.itinerary', JAPAN_ITINERARY_PAYLOAD),
          renderWidgetPart('finance.budget', JAPAN_ITINERARY_PAYLOAD),
          {
            type: 'text',
            text: "Here's your 10-day Japan itinerary — I've opened three panels:\n\n- **Map** — all 10 locations pinned in order\n- **Itinerary** — day-by-day breakdown with activities\n- **Budget** — estimated $200/day baseline; switch to JPY in the budget panel for local costs\n\nHighlights: cherry blossoms in Kyoto on days 4–5, Mt. Fuji views from Hakone on day 8, and teamLab Planets on the last morning. The Nikko day trip (day 3) is optional — drop it if you'd rather spend more time in Tokyo. Want me to add accommodation suggestions or adjust any leg?",
          },
        ],
      },
      {
        id: 'seed-msg-j-003',
        role: 'user',
        parts: userParts(
          "Drop the Nikko day — I'd rather have a slower Tokyo day. Can you also add a Nara deer park visit instead of the Osaka day?"
        ),
      },
      {
        id: 'seed-msg-j-004',
        role: 'assistant',
        parts: [
          { type: 'step-start' },
          renderWidgetPart('travel.map', {
            ...JAPAN_ITINERARY_PAYLOAD,
            days: JAPAN_ITINERARY_PAYLOAD.days
              .filter((d) => d.location !== 'Nikko')
              .map((d) =>
                d.location === 'Osaka'
                  ? {
                      ...d,
                      location: 'Nara — Deer Park & Todai-ji',
                      activities: [
                        'Nara Park deer',
                        'Todai-ji Great Buddha',
                        'Naramachi historic quarter',
                      ],
                    }
                  : d
              ),
          }),
          renderWidgetPart('travel.itinerary', {
            ...JAPAN_ITINERARY_PAYLOAD,
            days: JAPAN_ITINERARY_PAYLOAD.days
              .filter((d) => d.location !== 'Nikko')
              .map((d) =>
                d.location === 'Osaka'
                  ? {
                      ...d,
                      location: 'Nara — Deer Park & Todai-ji',
                      activities: [
                        'Nara Park deer',
                        'Todai-ji Great Buddha',
                        'Naramachi historic quarter',
                      ],
                    }
                  : d
              ),
          }),
          {
            type: 'text',
            text: "Done — Nikko is removed and Osaka is replaced with Nara. The freed-up day becomes a relaxed second Tokyo day (Harajuku / Shimokitazawa). Nara is actually ideal from Kyoto: it's only 45 min by Kintetsu express, so you can do it as a half-day and return to Kyoto for the Gion evening. The map and itinerary panels are updated. Budget is unchanged since we kept the same number of days.",
          },
        ],
      },
    ],
    snapshots: [
      {
        widgetId: 'travel.map',
        state: { removedLocations: ['Nikko'] },
      },
      {
        widgetId: 'finance.budget',
        state: {
          currency: 'JPY',
          rate: 149.5,
          userAmounts: {
            'Day 1 — Tokyo — Shinjuku & Shibuya': '180',
            'Day 2 — Tokyo — Asakusa & Akihabara': '160',
            'Day 3 — Kyoto — Arashiyama': '220',
            'Day 4 — Kyoto — Gion & Fushimi': '195',
            'Day 5 — Nara — Deer Park & Todai-ji': '140',
            'Day 6 — Hiroshima & Miyajima': '230',
            'Day 7 — Hakone': '350',
            'Day 8 — Tokyo — Harajuku & Shimokitazawa': '175',
            'Day 9 — Tokyo — teamLab & departure': '150',
          },
        },
      },
    ],
  },
  {
    id: 'seed-conv-berlin-001',
    title: 'Berlin tech conference — notes & venue map',
    messages: [
      {
        id: 'seed-msg-b-001',
        role: 'user',
        parts: userParts(
          "I'm attending a 3-day tech conference in Berlin in September. Can you set me up with a venue map and a notes panel to capture highlights?"
        ),
      },
      {
        id: 'seed-msg-b-002',
        role: 'assistant',
        parts: [
          { type: 'step-start' },
          renderWidgetPart('travel.map', BERLIN_ITINERARY_PAYLOAD),
          renderWidgetPart('data.notes', {
            notes: [
              {
                id: 'note-seed-01',
                title: 'Sessions to prioritise',
                body: 'Keynote Day 1 (AI), WebAssembly Component Model talk, Distributed Systems workshop.',
                pinned: true,
              },
            ],
          }),
          {
            type: 'text',
            text: "Two panels are open:\n\n- **Map** — conference hotel (Mitte), venue, East Side Gallery, and main sightseeing stops\n- **Notes** — starter note with the sessions worth prioritising; add more as you go\n\nThe conference runs Mon–Wed (15–17 Sep). I've added a sightseeing half-day on the 18th before your return flight. Want me to look up the talk schedule or add hotel suggestions near the venue?",
          },
        ],
      },
      {
        id: 'seed-msg-b-003',
        role: 'user',
        parts: userParts(
          'Add note: WebAssembly Component Model talk — speaker Lin Clark, key takeaway: interface types enable cross-language composition'
        ),
      },
      {
        id: 'seed-msg-b-004',
        role: 'assistant',
        parts: [
          { type: 'step-start' },
          {
            type: 'text',
            text: "Got it — I've added a note to the panel:\n\n**WebAssembly Component Model**\nSpeaker: Lin Clark\nKey takeaway: interface types enable cross-language composition\n\nYou can pin it in the Notes panel to keep it surfaced for follow-up questions. Want me to find resources on the wasm-component-model RFC or related tooling?",
          },
        ],
      },
    ],
    snapshots: [
      {
        widgetId: 'data.notes',
        state: {
          notes: [
            {
              id: 'note-seed-01',
              title: 'Sessions to prioritise',
              body: 'Keynote Day 1 (AI), WebAssembly Component Model talk, Distributed Systems workshop.',
              pinned: true,
            },
            {
              id: 'note-seed-02',
              title: 'WebAssembly Component Model',
              body: 'Speaker: Lin Clark. Key takeaway: interface types enable cross-language composition. See wasm-component-model RFC.',
              pinned: true,
            },
            {
              id: 'note-seed-03',
              title: 'Contact: Sarah from Vercel',
              body: 'sarah@vercel.com — Edge Runtime caching improvements. Follow up re: potential collab.',
              pinned: false,
            },
            {
              id: 'note-seed-04',
              title: 'Zur Letzten Instanz',
              body: 'Oldest restaurant in Berlin, near conference. Schnitzel recommended. Need reservations.',
              pinned: false,
            },
          ],
        },
      },
    ],
  },
];

export async function bootstrapChat(db: DbInstance): Promise<SeedResult> {
  let inserted = 0;
  let skipped = 0;

  for (const conv of SEED_CONVERSATIONS) {
    logger.detail(`Processing conversation: ${conv.title}`);

    const convResult = await db
      .insert(conversation)
      .values({
        id: conv.id,
        userId: DEV_USER_ID,
        title: conv.title,
      })
      .onConflictDoNothing();

    if (convResult.rowCount && convResult.rowCount > 0) {
      inserted++;
      logger.detail(`  Inserted conversation "${conv.title}"`);
    } else {
      skipped++;
      logger.detail(`  Skipped conversation "${conv.title}" (already exists)`);
      continue;
    }

    for (const msg of conv.messages) {
      const msgResult = await db
        .insert(message)
        .values({
          id: msg.id,
          conversationId: conv.id,
          role: msg.role,
          parts: msg.parts,
        })
        .onConflictDoNothing();

      if (msgResult.rowCount && msgResult.rowCount > 0) {
        inserted++;
      } else {
        skipped++;
      }
    }
  }

  // Multi-widget conversations with snapshot seeding
  for (const conv of MULTI_WIDGET_CONVERSATIONS) {
    logger.detail(`Processing multi-widget conversation: ${conv.title}`);

    const convResult = await db
      .insert(conversation)
      .values({ id: conv.id, userId: DEV_USER_ID, title: conv.title })
      .onConflictDoNothing();

    if (convResult.rowCount && convResult.rowCount > 0) {
      inserted++;
      logger.detail(`  Inserted conversation "${conv.title}"`);
    } else {
      skipped++;
      logger.detail(`  Skipped conversation "${conv.title}" (already exists)`);
      continue;
    }

    for (const msg of conv.messages) {
      const msgResult = await db
        .insert(message)
        .values({
          id: msg.id,
          conversationId: conv.id,
          role: msg.role,
          parts: msg.parts,
        })
        .onConflictDoNothing();

      if (msgResult.rowCount && msgResult.rowCount > 0) {
        inserted++;
      } else {
        skipped++;
      }
    }

    for (const snap of conv.snapshots) {
      logger.detail(`  Seeding snapshot for widget "${snap.widgetId}"`);
      const snapResult = await db
        .insert(widgetSnapshot)
        .values({
          conversationId: conv.id,
          widgetId: snap.widgetId,
          state: snap.state,
        })
        .onConflictDoNothing();

      if (snapResult.rowCount && snapResult.rowCount > 0) {
        inserted++;
      } else {
        skipped++;
      }
    }
  }

  return { inserted, skipped };
}

// If run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  loadEnvConfig(process.cwd());

  const connectionString = process.env.NEON_DATABASE_URL;
  if (!connectionString) throw new Error('NEON_DATABASE_URL is required');

  const { db, pool } = createDb(connectionString);
  logger.startOperation('chat bootstrap');
  bootstrapChat(db)
    .then((r) => {
      logger.success(
        `Chat bootstrap: ${r.inserted} inserted, ${r.skipped} skipped`
      );
      pool.end();
      process.exit(0);
    })
    .catch((err) => {
      logger.error(`Bootstrap failed: ${err}`);
      pool.end();
      process.exit(1);
    });
}
