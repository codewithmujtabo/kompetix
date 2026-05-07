'use client';

import { useTheme } from '@/lib/theme/context';

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      className="btn btn-ghost"
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{ width: '100%', justifyContent: 'center', fontSize: 12, padding: '6px', marginBottom: 8 }}
    >
      {theme === 'dark' ? '☀ Light' : '☾ Dark'}
    </button>
  );
}
