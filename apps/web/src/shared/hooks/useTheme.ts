import { useCallback, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

const KEY = 'ewp.theme';

/**
 * Writes the choice onto <html data-theme>, which is what the token file keys
 * off. "system" removes the attribute entirely so prefers-color-scheme wins.
 */
function apply(theme: Theme): void {
  const root = document.documentElement;
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      return (localStorage.getItem(KEY) as Theme | null) ?? 'system';
    } catch {
      // Private windows can throw on access; the default is still correct.
      return 'system';
    }
  });

  useEffect(() => {
    apply(theme);
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* preference simply will not persist */
    }
  }, [theme]);

  const cycle = useCallback(() => {
    setTheme((current) => (current === 'light' ? 'dark' : current === 'dark' ? 'system' : 'light'));
  }, []);

  return { theme, setTheme, cycle };
}
