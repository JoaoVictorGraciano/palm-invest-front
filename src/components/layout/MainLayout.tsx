import { NavLink, Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { to: '/', label: 'Início' },
  { to: '/carteira', label: 'Carteira' },
  { to: '/historico', label: 'Histórico' },
];

/**
 * Layout raiz da aplicação. Layouts específicos de uma feature devem viver
 * dentro da própria feature (ex: `features/home/components`).
 */
export function MainLayout() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b">
        <nav className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-4">
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
        </nav>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
