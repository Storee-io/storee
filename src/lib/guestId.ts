const GUEST_ID_KEY = 'storee_guest_id';

/**
 * Returns a persistent anonymous guest ID from localStorage.
 * Creates one on first call and reuses it for all future visits.
 */
export function getGuestId(): string {
  if (typeof window === 'undefined') return '';

  let id = localStorage.getItem(GUEST_ID_KEY);
  if (!id) {
    // crypto.randomUUID() is available in all modern browsers + Node 18+
    id = crypto.randomUUID();
    localStorage.setItem(GUEST_ID_KEY, id);
  }
  return id;
}
