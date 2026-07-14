import { NavLink, Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useCallback, useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

function getInitialTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'light';
  const persisted = localStorage.getItem('theme');
  if (persisted === 'dark' || persisted === 'light') return persisted;
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

function useTheme(): [string, () => void] {
  const [theme, setTheme] = useState<'dark' | 'light'>(getInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  return [theme, toggleTheme];
}

function ThemeToggleButton() {
  const [theme, toggleTheme] = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="ml-auto flex h-9 w-9 items-center justify-center rounded hover:bg-accent transition-colors"
      title={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
      aria-label="Alternar tema"
      type="button"
    >
      {theme === 'dark' ? (
        <Sun className="h-5 w-5 text-foreground" />
      ) : (
        <Moon className="h-5 w-5 text-foreground" />
      )}
    </button>
  );
}

const NAV_ITEMS = [
  { to: '/', label: 'Início' },
  { to: '/carteira', label: 'Carteira' },
  { to: '/historico', label: 'Histórico' },
];

export function MainLayout() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b">
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-6">
            <span className="font-semibold tracking-tight">Palm Invest</span>
            <div className="flex gap-4">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    cn(
                      'text-sm text-muted-foreground transition-colors hover:text-foreground',
                      isActive && 'font-medium text-foreground',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
          
          {/* O Botão da IA renderizado aqui */}
          <ThemeToggleButton />
          
        </nav>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
