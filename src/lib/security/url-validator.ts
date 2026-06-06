import dns from 'node:dns';

/**
 * Checks if an IPv4 address falls within private or reserved ranges.
 *
 * Covered ranges:
 * - 0.0.0.0/8        (current network)
 * - 10.0.0.0/8       (RFC 1918 private)
 * - 100.64.0.0/10    (carrier-grade NAT)
 * - 127.0.0.0/8      (loopback)
 * - 169.254.0.0/16   (link-local)
 * - 172.16.0.0/12    (RFC 1918 private)
 * - 192.0.0.0/24     (IETF protocol assignments)
 * - 192.0.2.0/24     (TEST-NET-1)
 * - 192.88.99.0/24   (6to4 relay anycast)
 * - 192.168.0.0/16   (RFC 1918 private)
 * - 198.18.0.0/15    (benchmark testing)
 * - 198.51.100.0/24  (TEST-NET-2)
 * - 203.0.113.0/24   (TEST-NET-3)
 * - 224.0.0.0/4      (multicast)
 * - 240.0.0.0/4      (reserved for future use)
 * - 255.255.255.255  (broadcast)
 */
export function isPrivateOrReservedIP(ip: string): boolean {
  const parts = ip.split('.');
  if (parts.length !== 4) return false;

  const octets = parts.map(Number);
  if (octets.some((o) => isNaN(o) || o < 0 || o > 255)) return false;

  const [a, b] = octets;

  if (a === 0) return true;
  if (a === 10) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 0 && octets[2] === 0) return true;
  if (a === 192 && b === 0 && octets[2] === 2) return true;
  if (a === 192 && b === 88 && octets[2] === 99) return true;
  if (a === 192 && b === 168) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a === 198 && b === 51 && octets[2] === 100) return true;
  if (a === 203 && b === 0 && octets[2] === 113) return true;
  if (a >= 224 && a <= 239) return true;
  if (a >= 240) return true;

  return false;
}

/**
 * Validates a URL is safe for server-side fetching.
 *
 * Enforces:
 * 1. HTTPS-only protocol
 * 2. DNS resolution must succeed
 * 3. All resolved IPs must be public (non-private, non-reserved)
 *
 * @throws {Error} "Only HTTPS URLs are permitted" — non-https protocol
 * @throws {Error} "Unable to resolve hostname" — DNS lookup failure
 * @throws {Error} "URL targets a restricted address" — private/reserved IP
 * @returns The parsed URL object if validation passes
 */
export async function validateUrlForFetch(url: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('Invalid URL format');
  }

  if (parsed.protocol !== 'https:') {
    throw new Error('Only HTTPS URLs are permitted');
  }

  let addresses: string[];
  try {
    addresses = await dns.promises.resolve4(parsed.hostname);
  } catch {
    throw new Error('Unable to resolve hostname');
  }

  if (addresses.length === 0) {
    throw new Error('Unable to resolve hostname');
  }

  for (const ip of addresses) {
    if (isPrivateOrReservedIP(ip)) {
      throw new Error('URL targets a restricted address');
    }
  }

  return parsed;
}
