import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject, signal, computed } from '@angular/core';

type Theme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private preference: Theme | null = null;
  private initialized = false;
  private readonly theme = signal<Theme>('light');

  readonly isDark = computed(() => this.theme() === 'dark');

  initialize(): void {
    if (this.initialized) return;
    this.initialized = true;
    const window = this.document.defaultView;
    if (!window) return;
    try {
      const saved = window.localStorage.getItem('bookmonkey-theme');
      this.preference = saved === 'light' || saved === 'dark' ? saved : null;
    } catch {
      // Storage may be unavailable in restricted browsing contexts.
    }
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    this.apply(this.preference ?? (media.matches ? 'dark' : 'light'));
    const onChange = (event: MediaQueryListEvent) => {
      if (this.preference === null) this.apply(event.matches ? 'dark' : 'light');
    };
    media.addEventListener('change', onChange);
    this.destroyRef.onDestroy(() => media.removeEventListener('change', onChange));
  }

  toggle(): void {
    this.preference = this.isDark() ? 'light' : 'dark';
    this.apply(this.preference);
    try {
      this.document.defaultView?.localStorage.setItem('bookmonkey-theme', this.preference);
    } catch {
      // Keep the explicit session preference even if persistence fails.
    }
  }

  private apply(theme: Theme): void {
    this.theme.set(theme);
    this.document.documentElement.dataset['theme'] = theme;
  }
}
