/**
 * Utility functions for normalizing and constructing store URLs
 * Handles both old format (full domain) and new format (subdomain only)
 */

const BASE_DOMAIN = 'storee.io';

/**
 * Extract just the subdomain part from publishedDomain
 * Handles: "my-store" → "my-store"
 *          "my-store.storee.io" → "my-store"
 */
export function getSubdomainOnly(domain: string | undefined): string {
  if (!domain) return '';
  return domain.replace(`.${BASE_DOMAIN}`, '').replace('.storee.io', '');
}

/**
 * Get full store URL from publishedDomain
 * Handles both old and new format
 */
export function getStoreUrl(domain: string | undefined): string {
  if (!domain) return '';
  const subdomain = getSubdomainOnly(domain);
  return `${subdomain}.${BASE_DOMAIN}`;
}

/**
 * Get full HTTPS URL from publishedDomain
 */
export function getStoreHttpsUrl(domain: string | undefined): string {
  if (!domain) return '';
  return `https://${getStoreUrl(domain)}`;
}

/**
 * Get subdomain for use as fixedSubdomain in PublishModal
 * Always returns just the subdomain part (no .storee.io)
 */
export function getFixedSubdomain(domain: string | undefined): string {
  return getSubdomainOnly(domain);
}
