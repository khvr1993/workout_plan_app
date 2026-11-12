import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Vitest runs with the project root as cwd, including in CI.
function read(relative: string): string {
  return readFileSync(resolve(process.cwd(), relative), 'utf8');
}

/**
 * The theme is applied before paint by an inline script. A CSP hash is the only
 * way to allow exactly that script, and it silently breaks whenever the snippet
 * changes — so the test recomputes it from index.html.
 */
describe('deployment security headers', () => {
  const html = read('index.html');
  const inline = html.match(/<script>([\s\S]*?)<\/script>/);
  const vercel = JSON.parse(read('vercel.json')) as {
    headers: Array<{ headers: Array<{ key: string; value: string }> }>;
  };
  const headers = vercel.headers[0].headers;
  const csp = headers.find((h) => h.key === 'Content-Security-Policy')?.value ?? '';
  const scriptSrc = csp.split(';').find((d) => d.trim().startsWith('script-src')) ?? '';

  it('has exactly one inline script to account for', () => {
    expect(inline).not.toBeNull();
    expect(html.match(/<script>/g)).toHaveLength(1);
  });

  it('allows the inline theme script by hash', () => {
    const hash = createHash('sha256').update(inline![1], 'utf8').digest('base64');
    expect(scriptSrc).toContain(`'sha256-${hash}'`);
  });

  it('does not allow inline or remote scripts', () => {
    expect(scriptSrc).not.toContain('unsafe-inline');
    expect(scriptSrc).not.toContain('unsafe-eval');
    expect(scriptSrc).not.toMatch(/https?:/);
  });

  it('locks down framing, plugins, base URLs and network access', () => {
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'none'");
    expect(csp).toContain("connect-src 'none'");
    expect(headers.map((h) => h.key)).toEqual(
      expect.arrayContaining(['X-Content-Type-Options', 'Referrer-Policy', 'Permissions-Policy']),
    );
  });
});
