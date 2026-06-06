import * as cheerio from 'cheerio';
import { validateUrlForFetch } from '@/lib/security/url-validator';

export interface LinkMetadata {
  title?: string;
  description?: string;
  image?: string;
  favicon?: string;
}

/**
 * Fetches Open Graph and HTML metadata for a URL.
 *
 * Validates against SSRF before fetching. Only HTTPS URLs are permitted.
 *
 * @throws {Error} If the URL fails SSRF validation or the fetch returns a non-OK status.
 */
export async function fetchLinkMetadata(url: string): Promise<LinkMetadata> {
  const cleanedUrl = url.trim();
  await validateUrlForFetch(cleanedUrl);

  const response = await fetch(cleanedUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; Baseraa/1.0)',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status}`);
  }

  const content = await response.text();
  const $ = cheerio.load(content);
  const head = $('head');

  const title = head.find('title').text().trim() || undefined;
  const description =
    head.find('meta[name=description]').attr('content') ||
    head.find('meta[name="og:description"]').attr('content') ||
    head.find('meta[property="og:description"]').attr('content') ||
    undefined;
  const image =
    head.find('meta[name="og:image"]').attr('content') ||
    head.find('meta[property="og:image"]').attr('content') ||
    undefined;

  let favicon =
    head.find('link[rel="icon"]').attr('href') ||
    head.find('link[rel="shortcut icon"]').attr('href') ||
    undefined;

  if (favicon && !favicon.startsWith('http')) {
    const urlObj = new URL(cleanedUrl);
    favicon = favicon.startsWith('/')
      ? urlObj.origin + favicon
      : new URL(favicon, cleanedUrl).href;
  }

  const metadata: LinkMetadata = {};
  if (title) metadata.title = title;
  if (description) metadata.description = description;
  if (image) metadata.image = image;
  if (favicon) metadata.favicon = favicon;

  return metadata;
}
