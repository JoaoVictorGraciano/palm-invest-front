import { LogOutIcon } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/auth-context';
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { to: '/', label: 'Início' },
  { to: '/carteira', label: 'Carteira' },
  { to: '/historico', label: 'Histórico' },
];

export function MainLayout() {
  const { logout } = useAuth();
  const { data: user } = useCurrentUser();

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

          <div className="flex min-w-0 items-center gap-2">
            {user?.nome && (
              <span className="hidden max-w-48 truncate text-sm text-muted-foreground sm:inline" title={user.email}>
                {user.nome}
              </span>
            )}
            <Button type="button" variant="ghost" size="sm" onClick={logout}>
              <LogOutIcon />
              Sair
            </Button>
          </div>
        </nav>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
