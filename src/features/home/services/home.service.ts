import type { HomeStats } from '@/features/home/types';

/**
 * Serviço da feature `home`. Encapsula o acesso a dados específicos dessa
 * feature, mantendo os componentes livres de lógica de infraestrutura.
 */
export function getHomeStats(): HomeStats[] {
  return [
    { label: 'Features', value: 'Modular' },
    { label: 'UI', value: 'shadcn/ui' },
    { label: 'Estilo', value: 'Tailwind CSS' },
  ];
}
