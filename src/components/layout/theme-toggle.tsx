'use client';
import { useTheme } from '@/components/providers/theme-provider';
import { Icon } from '@/components/ui/icon';
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <button
      className="icon-button"
      type="button"
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
      aria-label="Dark theme"
      aria-pressed={theme === 'dark'}
    >
      <span className="theme-light-icon">
        <Icon name="moon" />
      </span>
      <span className="theme-dark-icon">
        <Icon name="sun" />
      </span>
    </button>
  );
}
