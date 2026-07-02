import { Outlet } from 'react-router-dom';

/**
 * Layout raiz da aplicação. Layouts específicos de uma feature devem viver
 * dentro da própria feature (ex: `features/home/components`).
 */
export function MainLayout() {
  return (
    <div className="flex min-h-svh flex-col">
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
