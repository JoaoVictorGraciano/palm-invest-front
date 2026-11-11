import { createBrowserRouter } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { LoginPage } from '@/features/auth/LoginPage';
import { RegisterPage } from '@/features/auth/RegisterPage';
import { HomePage } from '@/features/home/HomePage';
import { HistoryPage } from '@/features/portfolio/HistoryPage';
import { PortfolioPage } from '@/features/portfolio/PortfolioPage';
import { PrivateRoute } from '@/routes/PrivateRoute';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/cadastro',
    element: <RegisterPage />,
  },
  {
    element: <PrivateRoute />,
    children: [
      {
        path: '/',
        element: <MainLayout />,
        children: [
          {
            index: true,
            element: <HomePage />,
          },
          {
            path: 'carteira',
            element: <PortfolioPage />,
          },
          {
            path: 'historico',
            element: <HistoryPage />,
          },
        ],
      },
    ],
  },
]);
