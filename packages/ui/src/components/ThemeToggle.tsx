import { Monitor, Moon, Sun1 } from 'iconsax-reactjs';

import { cn } from '@/lib/utils';
import { nextTheme, type ThemeChoice, useTheme } from '@/lib/theme';

// One button that cycles system → light → dark. The icon shows the state it is
// currently in, and the label says both that and what pressing it will do, so
// the control is legible to a screen reader without a visible caption.

const ICONS: Record<ThemeChoice, typeof Monitor> = {
  system: Monitor,
  light: Sun1,
  dark: Moon,
};

const NAMES: Record<ThemeChoice, string> = {
  system: 'follows your system',
  light: 'light',
  dark: 'dark',
};

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, cycle } = useTheme();
  const Icon = ICONS[theme];

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`Theme: ${NAMES[theme]}. Switch to ${NAMES[nextTheme(theme)]}.`}
      className={cn(
        'grid size-9 place-items-center rounded-full border border-tp-rule-strong text-tp-ink-faint transition-colors hover:border-tp-ink-faint hover:text-tp-ink focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        className,
      )}
    >
      <Icon size={15} variant="Linear" aria-hidden="true" />
    </button>
  );
}
