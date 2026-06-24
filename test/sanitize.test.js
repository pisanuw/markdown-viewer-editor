// Exercises the real renderMarkdown() extracted from index.html against the
// marked + DOMPurify versions the app loads from the CDN. Guards finding F1:
// markdown opened from an untrusted .md file must never reach innerHTML with
// active content (scripts, event handlers, javascript: URLs) intact.
import { describe, it, expect } from 'vitest';
import { marked } from 'marked';
import createDOMPurify from 'dompurify';
import { buildRenderMarkdown } from './helpers.js';

const DOMPurify = createDOMPurify(window);
const escapeHtml = (str) => {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
};

const renderMarkdown = buildRenderMarkdown({ marked, DOMPurify, escapeHtml });

// Parse rendered output the way the app does (assign to innerHTML) and inspect
// the resulting DOM. Raw substring checks give false positives on escaped text
// like "&lt;svg/onload=...&gt;", which is inert.
function dom(out) {
  const el = document.createElement('div');
  el.innerHTML = out;
  return el;
}
function eventHandlerAttrs(el) {
  return [...el.querySelectorAll('*')]
    .flatMap((n) => [...n.attributes].map((a) => a.name))
    .filter((name) => /^on/i.test(name));
}

describe('renderMarkdown sanitization (F1)', () => {
  it('renders benign markdown', () => {
    const el = dom(
      renderMarkdown('# Hello world\n\nSome **bold** text and a [link](https://example.com).'),
    );
    expect(el.querySelector('h1')?.textContent).toContain('Hello world');
    expect(el.querySelector('strong')?.textContent).toBe('bold');
    expect(el.querySelector('a')?.getAttribute('href')).toBe('https://example.com');
  });

  it('strips inline event-handler XSS (<img onerror>)', () => {
    const el = dom(renderMarkdown('<img src=x onerror="alert(1)">'));
    expect(eventHandlerAttrs(el)).toEqual([]);
  });

  it('removes <script> elements', () => {
    const el = dom(renderMarkdown('text\n\n<script>alert(document.cookie)</script>'));
    expect(el.querySelectorAll('script').length).toBe(0);
  });

  it('strips javascript: URLs from links', () => {
    const el = dom(renderMarkdown('[click me](javascript:alert(1))'));
    const hrefs = [...el.querySelectorAll('a')].map((a) => (a.getAttribute('href') || '').toLowerCase());
    expect(hrefs.some((h) => h.startsWith('javascript:'))).toBe(false);
  });

  it('neutralizes svg/onload vectors', () => {
    const el = dom(renderMarkdown('<svg/onload=alert(1)>'));
    expect(el.querySelectorAll('svg').length).toBe(0);
    expect(eventHandlerAttrs(el)).toEqual([]);
  });

  it('fails closed when DOMPurify is unavailable (escapes instead of injecting HTML)', () => {
    const failClosed = buildRenderMarkdown({ marked, DOMPurify: undefined, escapeHtml });
    const out = failClosed('<img src=x onerror="alert(1)">');
    const el = dom(out);
    expect(el.querySelectorAll('img').length).toBe(0);
    expect(eventHandlerAttrs(el)).toEqual([]);
    expect(out).toContain('&lt;img');
  });
});
