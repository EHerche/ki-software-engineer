import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeService } from './theme.service';

describe('Unit: theme preference and lifecycle', () => {
  let media: EventTarget & { matches: boolean };
  beforeEach(() => {
    localStorage.clear();
    media = Object.assign(new EventTarget(), { matches: false });
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => media)
    );
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    localStorage.clear();
    delete document.documentElement.dataset['theme'];
  });

  it.each([false, true])('follows device preference %s and device changes until an explicit choice', dark => {
    media.matches = dark;
    const theme = TestBed.inject(ThemeService);
    theme.initialize();
    expect(theme.isDark()).toBe(dark);
    media.dispatchEvent(Object.assign(new Event('change'), { matches: !dark }));
    expect(theme.isDark()).toBe(!dark);
    theme.toggle();
    expect(localStorage.getItem('bookmonkey-theme')).toBe(dark ? 'dark' : 'light');
    media.dispatchEvent(Object.assign(new Event('change'), { matches: !dark }));
    expect(theme.isDark()).toBe(dark);
    expect(document.documentElement.dataset['theme']).toBe(dark ? 'dark' : 'light');
  });

  it.each(['light', 'dark'])('restores explicit %s despite a conflicting device setting', saved => {
    media.matches = saved === 'light';
    localStorage.setItem('bookmonkey-theme', saved);
    const theme = TestBed.inject(ThemeService);
    theme.initialize();
    expect(theme.isDark()).toBe(saved === 'dark');
  });

  it('ignores invalid saved values and follows the device', () => {
    localStorage.setItem('bookmonkey-theme', 'invalid');
    media.matches = true;
    const theme = TestBed.inject(ThemeService);
    theme.initialize();
    expect(theme.isDark()).toBe(true);
  });

  it('keeps explicit session state when storage reads/writes throw', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Blocked');
    });
    const theme = TestBed.inject(ThemeService);
    theme.initialize();
    theme.toggle();
    media.dispatchEvent(Object.assign(new Event('change'), { matches: false }));
    expect(theme.isDark()).toBe(true);
  });

  it('registers one listener and removes it on application destruction', () => {
    const add = vi.spyOn(media, 'addEventListener');
    const remove = vi.spyOn(media, 'removeEventListener');
    const theme = TestBed.inject(ThemeService);
    theme.initialize();
    theme.initialize();
    expect(add).toHaveBeenCalledTimes(1);
    TestBed.resetTestingModule();
    expect(remove).toHaveBeenCalledWith('change', add.mock.calls[0][1]);
  });
});
