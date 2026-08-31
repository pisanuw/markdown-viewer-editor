// Additional coverage for renderMarkdown() (F1) beyond sanitize.test.js:
// more exotic XSS vectors, and checks that legitimate content the app
// specifically supports (fenced code, KaTeX/Mermaid delimiters, task lists,
// GFM line breaks) survives sanitization instead of being over-stripped.
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

describe('renderMarkdown sanitization: more XSS vectors (F1)', () => {
  it('strips <iframe> injection', () => {
    const el = dom(renderMarkdown('<iframe src="javascript:alert(1)"></iframe>'));
    expect(el.querySelectorAll('iframe').length).toBe(0);
  });

  it('strips a data: URI script vector on <img>', () => {
    const el = dom(
      renderMarkdown('<img src="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">'),
    );
    expect(eventHandlerAttrs(el)).toEqual([]);
    expect(el.querySelectorAll('script').length).toBe(0);
  });

  it('strips <style> blocks with expression()/behavior hacks', () => {
    const el = dom(
      renderMarkdown('<style>body { background: url("javascript:alert(1)"); }</style>text'),
    );
    expect(el.querySelectorAll('style').length).toBe(0);
  });

  it('drops the href on a javascript: autolink, leaving only inert text', () => {
    const el = dom(renderMarkdown('<javascript:alert(1)>'));
    const links = [...el.querySelectorAll('a')];
    // marked turns this into <a href="javascript:alert(1)">...</a>; confirm
    // DOMPurify strips the href specifically (rather than merely hoping the
    // browser never navigates it).
    expect(links.every((a) => !a.hasAttribute('href'))).toBe(true);
  });

  it('strips <meta http-equiv=refresh> redirects', () => {
    const el = dom(renderMarkdown('<meta http-equiv="refresh" content="0;url=javascript:alert(1)">'));
    expect(el.querySelectorAll('meta').length).toBe(0);
  });

  it('strips a malformed/unclosed script tag', () => {
    const el = dom(renderMarkdown('<script>alert(1)//'));
    expect(el.querySelectorAll('script').length).toBe(0);
    expect(el.innerHTML).not.toContain('<script>');
  });

  it('strips an XSS vector nested inside an otherwise-safe markdown list', () => {
    const el = dom(renderMarkdown('- item one\n- <img src=x onerror=alert(1)>\n- item three'));
    expect(eventHandlerAttrs(el)).toEqual([]);
    expect(el.querySelectorAll('li').length).toBe(3);
  });

  it('renders fenced code blocks as inert text, even when the code itself looks like an XSS payload', () => {
    const el = dom(renderMarkdown('```html\n<script>alert(document.cookie)</script>\n```'));
    expect(el.querySelectorAll('script').length).toBe(0);
    expect(el.querySelector('code')?.textContent).toContain('<script>alert(document.cookie)</script>');
  });

  it('leaves inline code content escaped, not executed', () => {
    const el = dom(renderMarkdown('Use `<img onerror=alert(1)>` in your markup.'));
    expect(eventHandlerAttrs(el)).toEqual([]);
    expect(el.querySelector('code')?.textContent).toBe('<img onerror=alert(1)>');
  });
});

describe('renderMarkdown: legitimate content is not over-stripped', () => {
  it('renders task list checkboxes', () => {
    const el = dom(renderMarkdown('- [ ] todo\n- [x] done'));
    const boxes = [...el.querySelectorAll('input[type="checkbox"]')];
    expect(boxes.length).toBe(2);
    expect(boxes[1].hasAttribute('checked')).toBe(true);
  });

  it('respects GFM single-newline line breaks (breaks: true)', () => {
    const el = dom(renderMarkdown('line one\nline two'));
    expect(el.querySelector('p')?.innerHTML).toContain('<br');
  });

  it('leaves KaTeX-style $...$ delimiters intact for the post-render math pass', () => {
    const out = renderMarkdown('Einstein: $E = mc^2$ and displayed: $$a^2+b^2=c^2$$');
    expect(out).toContain('$E = mc^2$');
    expect(out).toContain('$$a^2+b^2=c^2$$');
  });

  it('leaves a ```mermaid fenced block intact for the post-render mermaid pass', () => {
    const el = dom(renderMarkdown('```mermaid\ngraph TD; A-->B;\n```'));
    const code = el.querySelector('code.language-mermaid');
    expect(code?.textContent.trim()).toBe('graph TD; A-->B;');
  });

  it('keeps ordinary https links with their href intact', () => {
    const el = dom(renderMarkdown('[docs](https://example.com/path?x=1)'));
    expect(el.querySelector('a')?.getAttribute('href')).toBe('https://example.com/path?x=1');
  });

  it('renders tables', () => {
    const el = dom(renderMarkdown('| A | B |\n| - | - |\n| 1 | 2 |'));
    expect(el.querySelectorAll('table').length).toBe(1);
    expect(el.querySelectorAll('td').length).toBe(2);
  });
});
