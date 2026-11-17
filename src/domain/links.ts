import type { QuickLink } from './types';

export const LINK_LIMITS = { max: 6, name: 24 };

/**
 * A web address as it is stored, or null when what was typed is not one. `https://` is put in front when no scheme
 * was typed. Only http and https pages are links: nothing else is stored by the store's actions, and nothing else
 * is kept from a save when it is opened (`storedLinks`), so nothing else can be opened.
 */
export function cleanUrl(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;
  let url: URL;
  try { url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`); } catch { return null; }
  if ((url.protocol !== 'http:' && url.protocol !== 'https:') || url.username || url.password) return null;
  // a bare word such as "gizmo" parses as a host, and is far more likely a name typed in the wrong box
  if (!url.hostname.includes('.') && url.hostname !== 'localhost') return null;
  return url.href;
}

/** A link's name: what was typed, tidied, or the site's own name when nothing was. */
export function linkName(name: string, url: string): string {
  const clean = name.trim().replace(/\s+/g, ' ').slice(0, LINK_LIMITS.name).trim();
  if (clean) return clean;
  try { return new URL(url).hostname.replace(/^www\./, '').slice(0, LINK_LIMITS.name); } catch { return ''; }
}

/**
 * The links in a save, as Compass would have saved them: only entries with an id and a web address, each id once,
 * six at most. A save can be edited by hand or brought in from elsewhere, so nothing in it is trusted to be a link
 * until it has passed `cleanUrl` again. This is what makes "only http and https are ever stored" true.
 */
export function storedLinks(value: unknown): QuickLink[] {
  if (!Array.isArray(value)) return [];
  const links: QuickLink[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue;
    const { id, name, url } = entry as Record<string, unknown>, clean = typeof url === 'string' ? cleanUrl(url) : null;
    if (typeof id !== 'string' || !id || !clean || links.some((l) => l.id === id)) continue;
    links.push({ id, name: linkName(typeof name === 'string' ? name : '', clean), url: clean });
    if (links.length === LINK_LIMITS.max) break;
  }
  return links;
}

/** Links whose name holds what was typed, in any case. Nothing typed finds nothing. */
export function searchLinks(links: QuickLink[], query: string): QuickLink[] {
  const q = query.trim().toLowerCase();
  return q ? links.filter((l) => l.name.toLowerCase().includes(q)) : [];
}
