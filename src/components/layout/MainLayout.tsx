import { NavLink, Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';

const NAV_ITEMS = [
  { to: '/', label: 'Início' },
  { to: '/carteira', label: 'Carteira' },
  { to: '/historico', label: 'Histórico' },
];

export function MainLayout() {
  // Garante que o modo dark seja aplicado sempre que o layout carregar
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
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
                      isActive && 'font-medium text-foreground'
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
          
          {/* Botão de Tema Assassinado! 🥷 */}
          
        </nav>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}