import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// Mock dependencies
vi.mock('@/utils/auth', () => ({
  ensureAuthApi: vi.fn(),
}));

vi.mock('@/utils/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  }),
}));

import { ensureAuthApi } from '@/utils/auth';
import { POST } from './route';

const mockEnsureAuthApi = vi.mocked(ensureAuthApi);

function createRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/link-metadata', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/link-metadata', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnsureAuthApi.mockResolvedValue({ userId: 1, user: {} } as any);
  });

  describe('input validation', () => {
    it('returns 400 when body is empty object', async () => {
      const res = await POST(createRequest({}));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe('Validation failed');
      expect(json.details).toBeDefined();
      expect(Array.isArray(json.details)).toBe(true);
    });

    it('returns 400 when url is missing', async () => {
      const res = await POST(createRequest({ notUrl: 'something' }));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe('Validation failed');
    });

    it('returns 400 when url is empty string', async () => {
      const res = await POST(createRequest({ url: '' }));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe('Validation failed');
    });

    it('returns 400 when url is not a valid URL', async () => {
      const res = await POST(createRequest({ url: 'not-a-url' }));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe('Validation failed');
    });

    it('returns 400 when url is a number', async () => {
      const res = await POST(createRequest({ url: 12345 }));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe('Validation failed');
    });

    it('returns 400 with details array containing issue info', async () => {
      const res = await POST(createRequest({ url: 'bad' }));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.details.length).toBeGreaterThan(0);
      expect(json.details[0]).toHaveProperty('message');
    });
  });

  describe('auth', () => {
    it('returns auth error response when not authenticated', async () => {
      const authResponse = NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
      mockEnsureAuthApi.mockResolvedValue(authResponse);

      const res = await POST(createRequest({ url: 'https://example.com' }));
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.error).toBe('Unauthorized');
    });
  });

  describe('successful fetch', () => {
    it('returns metadata for a valid URL', async () => {
      const html = `
        <html>
          <head>
            <title>Test Page</title>
            <meta name="description" content="A test description" />
            <meta property="og:image" content="https://example.com/image.png" />
            <link rel="icon" href="/favicon.ico" />
          </head>
          <body></body>
        </html>
      `;

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(new Response(html, { status: 200 }))
      );

      const res = await POST(createRequest({ url: 'https://example.com' }));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.title).toBe('Test Page');
      expect(json.description).toBe('A test description');
      expect(json.image).toBe('https://example.com/image.png');
      expect(json.favicon).toBe('https://example.com/favicon.ico');

      vi.unstubAllGlobals();
    });

    it('returns 400 when fetched URL returns non-ok status', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(new Response('', { status: 404 }))
      );

      const res = await POST(createRequest({ url: 'https://example.com/404' }));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toContain('Failed to fetch URL');

      vi.unstubAllGlobals();
    });
  });
});
