import { Moon, Sun } from 'lucide-react';
import { BrandMark } from './Sidebar';
import { useTheme } from '../../context/ThemeContext';

export function MobileHeader() {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-surface px-4 lg:hidden">
      <BrandMark />
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-ink-secondary hover:bg-surface-raised hover:text-ink transition-colors"
      >
        {resolvedTheme === 'dark' ? (
          <Sun className="h-4 w-4" strokeWidth={1.75} />
        ) : (
          <Moon className="h-4 w-4" strokeWidth={1.75} />
        )}
      </button>
    </header>
  );
}

export default MobileHeader;
