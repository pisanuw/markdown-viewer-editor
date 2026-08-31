// Exercises the small standalone utilities extracted from index.html:
// countWords(), headingToId(), escapeHtml(), escapeAttr(), debounce().
// These back the word-count stat, the scroll-sync heading matcher, and the
// two escaping helpers everything else (TOC, tab titles) relies on to stay
// XSS-safe, so it's worth locking their behaviour down directly rather than
// only indirectly through renderMarkdown().
import { describe, it, expect, vi } from 'vitest';
import { extractFunction, extractLineFunction, build } from './helpers.js';

const countWords = build('countWords', extractFunction);
const headingToId = build('headingToId', extractFunction);
const escapeHtml = build('escapeHtml', extractLineFunction);
const escapeAttr = build('escapeAttr', extractLineFunction);
const debounce = build('debounce', extractLineFunction);

describe('countWords()', () => {
  it('counts simple space-separated words', () => {
    expect(countWords('hello world')).toBe(2);
  });

  it('returns 0 for an empty string', () => {
    expect(countWords('')).toBe(0);
  });

  it('returns 0 for whitespace-only input', () => {
    expect(countWords('   \n\t  ')).toBe(0);
  });

  it('collapses runs of whitespace (spaces, tabs, newlines) between words', () => {
    expect(countWords('one   two\tthree\nfour')).toBe(4);
  });

  it('ignores leading/trailing whitespace', () => {
    expect(countWords('  padded words  ')).toBe(2);
  });

  it('counts a single word', () => {
    expect(countWords('solo')).toBe(1);
  });
});

describe('headingToId()', () => {
  it('lowercases and hyphenates a normal heading', () => {
    expect(headingToId('Hello World')).toBe('hello-world');
  });

  it('strips punctuation', () => {
    expect(headingToId("What's New: v2.0!")).toBe('whats-new-v20');
  });

  it('collapses multiple internal spaces/hyphens into one hyphen', () => {
    expect(headingToId('Foo   Bar -- Baz')).toBe('foo-bar-baz');
  });

  it('trims leading and trailing hyphens', () => {
    expect(headingToId('  -Leading and trailing-  ')).toBe('leading-and-trailing');
  });

  it('keeps underscores (word characters)', () => {
    expect(headingToId('snake_case_heading')).toBe('snake_case_heading');
  });

  it('returns an empty string for punctuation-only input', () => {
    expect(headingToId('!!!')).toBe('');
  });

  it('does not choke on HTML-looking input (used only as an internal id, never re-parsed as HTML)', () => {
    expect(headingToId('<script>alert(1)</script>')).toBe('scriptalert1script');
  });
});

describe('escapeHtml()', () => {
  it('escapes angle brackets and ampersands', () => {
    expect(escapeHtml('<b>bold & "quoted"</b>')).toBe('&lt;b&gt;bold &amp; "quoted"&lt;/b&gt;');
  });

  it('neutralizes a script tag into inert text', () => {
    const out = escapeHtml('<script>alert(1)</script>');
    expect(out).not.toContain('<script>');
    expect(out).toContain('&lt;script&gt;');
  });

  it('round-trips plain text unchanged', () => {
    expect(escapeHtml('just plain text 123')).toBe('just plain text 123');
  });
});

describe('escapeAttr()', () => {
  it('escapes double quotes so they cannot close an attribute early', () => {
    expect(escapeAttr('"onmouseover="alert(1)')).toBe('&quot;onmouseover=&quot;alert(1)');
  });

  it('escapes angle brackets', () => {
    expect(escapeAttr('<tag>')).toBe('&lt;tag&gt;');
  });

  it('leaves single quotes and ampersands untouched (documents current behavior)', () => {
    // escapeAttr only escapes " < > -- callers that interpolate into a
    // single-quoted attribute or need &-escaping must not rely on this alone.
    expect(escapeAttr(`it's & fine`)).toBe(`it's & fine`);
  });
});

describe('debounce()', () => {
  it('only invokes the wrapped function once after the delay, using the last call\'s args', () => {
    vi.useFakeTimers();
    try {
      const fn = vi.fn();
      const debounced = debounce(fn, 200);
      debounced('first');
      debounced('second');
      debounced('third');
      expect(fn).not.toHaveBeenCalled();
      vi.advanceTimersByTime(199);
      expect(fn).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith('third');
    } finally {
      vi.useRealTimers();
    }
  });

  it('fires again for calls made after the previous debounced call resolved', () => {
    vi.useFakeTimers();
    try {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);
      debounced('a');
      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
      debounced('b');
      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(2);
      expect(fn).toHaveBeenLastCalledWith('b');
    } finally {
      vi.useRealTimers();
    }
  });
});
