// Theme & Accessibility Service - Independent from Business Data
export type ThemeMode = 'light' | 'dark' | 'system';
export type FontSize = 'normal' | 'large' | 'huge';

export interface AccessibilitySettings {
  theme: ThemeMode;
  fontSize: FontSize;
  highContrast: boolean;
  reduceMotion: boolean;
}

const THEME_STORAGE_KEY = 'wf_accessibility_settings_v1';

const DEFAULT_SETTINGS: AccessibilitySettings = {
  theme: 'dark', // default to comfortable dark or system
  fontSize: 'normal', // normal starts at 18px for senior accessibility
  highContrast: false,
  reduceMotion: false,
};

class ThemeService {
  private listeners: Array<(settings: AccessibilitySettings) => void> = [];

  public getSettings(): AccessibilitySettings {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch {
      // fallback
    }
    return DEFAULT_SETTINGS;
  }

  public saveSettings(settings: AccessibilitySettings): void {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // storage failed
    }
    this.applyToDOM(settings);
    this.notify(settings);
  }

  public updateSetting<K extends keyof AccessibilitySettings>(key: K, value: AccessibilitySettings[K]): void {
    const current = this.getSettings();
    const updated = { ...current, [key]: value };
    this.saveSettings(updated);
  }

  public subscribe(listener: (settings: AccessibilitySettings) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify(settings: AccessibilitySettings): void {
    for (const listener of this.listeners) {
      listener(settings);
    }
  }

  // Resolve whether dark mode is active (accounting for system mode)
  public isDarkMode(): boolean {
    const settings = this.getSettings();
    if (settings.theme === 'system') {
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return settings.theme === 'dark';
  }

  // Apply settings to DOM elements (html, body)
  public applyToDOM(settings?: AccessibilitySettings): void {
    const s = settings || this.getSettings();
    const root = document.documentElement;

    // 1. Resolve Theme
    let isDark = s.theme === 'dark';
    if (s.theme === 'system') {
      isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    if (isDark) {
      root.classList.add('dark');
      root.classList.remove('light');
      root.setAttribute('data-theme', 'dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
      root.style.colorScheme = 'light';
    }

    // 2. Font Size Scaling
    root.classList.remove('font-size-normal', 'font-size-large', 'font-size-huge');
    root.classList.add(`font-size-${s.fontSize}`);

    // Set CSS root variables for base font size
    if (s.fontSize === 'huge') {
      root.style.setProperty('--app-font-scale', '1.25');
      root.style.setProperty('--app-base-font-size', '22px');
    } else if (s.fontSize === 'large') {
      root.style.setProperty('--app-font-scale', '1.125');
      root.style.setProperty('--app-base-font-size', '20px');
    } else {
      root.style.setProperty('--app-font-scale', '1.0');
      root.style.setProperty('--app-base-font-size', '18px');
    }

    // 3. High Contrast
    if (s.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
  }

  public init(): void {
    this.applyToDOM();

    // Listen for system preference changes if in system mode
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (this.getSettings().theme === 'system') {
          this.applyToDOM();
          this.notify(this.getSettings());
        }
      });
    }
  }
}

export const themeService = new ThemeService();
