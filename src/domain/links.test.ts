import { describe, expect, it } from 'vitest';
import { cleanUrl, linkName, searchLinks } from './links';

describe('links', () => {
  it('accepts a web address, with or without https', () => {
    expect(cleanUrl('investopedia.com')).toBe('https://investopedia.com/');
    expect(cleanUrl('  HTTP://example.org/a b ')).toBe('http://example.org/a%20b');
    expect(cleanUrl('localhost:5173/x')).toBe('https://localhost:5173/x');
  });

  it('refuses anything that is not a web page', () => {
    for (const bad of ['', '   ', 'gizmo', 'not a site', 'javascript:alert(1)', 'mailto:a@b.c', 'ftp://x.y', 'data:text/html,hi', 'https://user:pw@example.org']) expect(cleanUrl(bad), bad).toBeNull();
  });

  it('names a link after its site when no name is given', () => {
    expect(linkName('', 'https://www.investopedia.com/terms')).toBe('investopedia.com');
    expect(linkName('  Gizmo  ', 'https://x.y/')).toBe('Gizmo'); expect(linkName('n'.repeat(60), 'https://x.y/')).toHaveLength(24);
  });

  it('finds links by name', () => {
    const links = [{ id: '1', name: 'Gizmo', url: 'https://g.io/' }, { id: '2', name: 'StockAnalysis', url: 'https://s.co/' }];
    expect(searchLinks(links, 'stock').map((l) => l.id)).toEqual(['2']); expect(searchLinks(links, ' ')).toEqual([]);
  });
});
