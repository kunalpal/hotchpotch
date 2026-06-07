/**
 * Bootstrap script for the Chat module
 *
 * Seeds the dev database with realistic chat conversations and messages.
 * Each conversation exercises a different widget domain (travel, finance, notes).
 */

import { loadEnvConfig } from '@next/env';
import { createDb } from '../connection';
import { conversation, message } from '../index';
import { logger } from './logger';
import { DEV_USER_ID } from './constants';
import type { DbInstance, SeedResult } from './module-registry';

type TextPart = { type: 'text'; text: string };
type StepStartPart = { type: 'step-start' };
type MessagePart = TextPart | StepStartPart;

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
