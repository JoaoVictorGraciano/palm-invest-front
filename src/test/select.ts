import { screen, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';

/**
 * Ajudantes para o `Select` do projeto (Radix) nos testes: as opções só
 * existem no DOM com a lista aberta, num portal fora do gatilho.
 */

/** Abre o Select, devolve os textos das opções e fecha de novo. */
export async function optionLabels(user: UserEvent, trigger: HTMLElement): Promise<string[]> {
  await user.click(trigger);
  const listbox = await screen.findByRole('listbox');
  const labels = within(listbox)
    .getAllByRole('option')
    .map((option) => option.textContent ?? '');
  await user.keyboard('{Escape}');
  return labels;
}

/** Abre o Select e escolhe a opção com este texto. */
export async function chooseOption(user: UserEvent, trigger: HTMLElement, name: string): Promise<void> {
  await user.click(trigger);
  await user.click(await screen.findByRole('option', { name }));
}
