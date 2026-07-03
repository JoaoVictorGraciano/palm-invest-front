import { createBrowserRouter } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { HomePage } from '@/features/home/HomePage';
import { PortfolioPage } from '@/features/portfolio/PortfolioPage';

export const router = createBrowserRouter([
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
    ],
  },
]);
