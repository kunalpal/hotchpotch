import { createLogger } from '@/utils/logger';

const log = createLogger('link-metadata');

export interface LinkMetadata {
  title?: string;
  description?: string;
  image?: string;
  favicon?: string;
}

export async function fetchLinkMetadata(url: string): Promise<LinkMetadata> {
  try {
    const response = await fetch('/api/link-metadata', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      let errorMessage = `Status Code: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
        // Fallback to response status if not JSON
      }
      throw new Error(`Failed to fetch metadata: ${errorMessage}`);
    }

    return await response.json();
  } catch (error) {
    log.error(
      { err: error, operation: 'fetchLinkMetadata' },
      'Failed to fetch metadata'
    );
    return {};
  }
}

export function getFaviconUrl(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
  } catch {
    return '';
  }
}

export function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}
