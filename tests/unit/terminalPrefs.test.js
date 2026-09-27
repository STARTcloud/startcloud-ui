import { describe, expect, it } from 'vitest';

import {
  FONT_SIZE_BOUNDS,
  SCROLLBACK_BOUNDS,
  TERMINAL_PREF_DEFAULTS,
  boundPrefs,
} from '../../src/features/hosts/utils/terminalPrefs.js';

describe('boundPrefs', () => {
  it('keeps preferences that lie within their bounds', () => {
    const prefs = {
      fontSize: 14,
      fontFamily: 'Menlo, monospace',
      scrollback: 5000,
      cursorStyle: 'bar',
      cursorBlink: false,
    };
    expect(boundPrefs(prefs)).toEqual(prefs);
  });

  it('holds the font size between 6 and 32 and answers 12 for no number', () => {
    expect(FONT_SIZE_BOUNDS).toEqual({ min: 6, max: 32 });
    expect(boundPrefs({ fontSize: 2 }).fontSize).toBe(6);
    expect(boundPrefs({ fontSize: '99' }).fontSize).toBe(32);
    expect(boundPrefs({ fontSize: 'large' }).fontSize).toBe(12);
    expect(boundPrefs({ fontSize: '' }).fontSize).toBe(12);
  });

  it('holds the scrollback between 0 and 200000', () => {
    expect(SCROLLBACK_BOUNDS).toEqual({ min: 0, max: 200000 });
    expect(boundPrefs({ scrollback: -5 }).scrollback).toBe(0);
    expect(boundPrefs({ scrollback: '999999' }).scrollback).toBe(200000);
    expect(boundPrefs({ scrollback: '' }).scrollback).toBe(0);
  });

  it('answers the defaults for an empty font family and an unknown cursor style', () => {
    expect(boundPrefs({ fontFamily: '   ' }).fontFamily).toBe(TERMINAL_PREF_DEFAULTS.fontFamily);
    expect(boundPrefs({ cursorStyle: 'beam' }).cursorStyle).toBe('block');
    expect(boundPrefs({ cursorBlink: 'yes' }).cursorBlink).toBe(false);
    expect(boundPrefs({ cursorBlink: true }).cursorBlink).toBe(true);
  });
});
