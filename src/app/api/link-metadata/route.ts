import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ensureAuthApi } from '@/utils/auth';
import { fetchLinkMetadata } from '@/lib/link-metadata';
import { createLogger } from '@/utils/logger';
import { sanitizeErrorMessage } from '@/lib/security/error-sanitizer';

export type { LinkMetadata } from '@/lib/link-metadata';

const log = createLogger('link-metadata');

const linkMetadataSchema = z.object({
  url: z.url('Invalid URL format').min(1, 'URL is required'),
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  log.info({ method: 'POST' }, 'Request started');

  try {
    const authResult = await ensureAuthApi();
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();
    const parsed = linkMetadataSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const metadata = await fetchLinkMetadata(parsed.data.url);

    const durationMs = Date.now() - startTime;
    log.info({ method: 'POST', status: 200, durationMs }, 'Request completed');
    return NextResponse.json(metadata);
  } catch (error) {
    const durationMs = Date.now() - startTime;
    log.error({ err: error, method: 'POST', durationMs }, 'Request failed');

    // Return 400 for SSRF validation errors and bad fetch responses
    if (
      error instanceof Error &&
      (error.message === 'Only HTTPS URLs are permitted' ||
        error.message === 'Unable to resolve hostname' ||
        error.message === 'URL targets a restricted address' ||
        error.message === 'Invalid URL format' ||
        error.message.startsWith('Failed to fetch URL:'))
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: sanitizeErrorMessage(error, log) },
      { status: 500 }
    );
  }
}
