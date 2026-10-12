import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FormField from './FormField';
import Select from './Select';
import PasswordInput from './PasswordInput';

test('erro externo e dica do campo também são anunciados pela lista personalizada', () => {
  const { rerender } = render(<FormField label="Unidade" error="Selecione a unidade." hint="Use a unidade do estoque." required><Select name="unidade" required><option value="">Selecione...</option><option value="kg">Quilogramas</option></Select></FormField>);
  const combo = screen.getByRole('combobox', { name: 'Unidade' });
  expect(combo).toHaveAttribute('aria-invalid', 'true');
  expect(combo).toHaveAccessibleDescription('Use a unidade do estoque. Selecione a unidade.');
  expect(combo).toHaveAttribute('aria-required', 'true');
  rerender(<FormField label="Unidade" hint="Use a unidade do estoque." required><Select name="unidade" required><option value="">Selecione...</option><option value="kg">Quilogramas</option></Select></FormField>);
  expect(combo).not.toHaveAttribute('aria-invalid', 'true');
});

test('validação nativa da lista mantém a descrição do campo e a explicação local', () => {
  const { container } = render(<FormField label="Perfil" hint="Define as áreas permitidas."><Select required><option value="">Selecione...</option><option value="A">Atendente</option></Select></FormField>);
  fireEvent.invalid(container.querySelector('select'));
  const combo = screen.getByRole('combobox', { name: 'Perfil' });
  const description = combo.getAttribute('aria-describedby');
  expect(description.split(' ')).toHaveLength(2);
  description.split(' ').forEach((id) => expect(document.getElementById(id)).toBeInTheDocument());
});

test('revelar senha mantém rótulo e valor, e fieldset bloqueia o controle', () => {
  const { rerender } = render(<fieldset><FormField label="Senha"><PasswordInput name="senha" defaultValue="Valor de teste" /></FormField></fieldset>);
  const input = screen.getByLabelText('Senha');
  userEvent.click(screen.getByRole('button', { name: 'Mostrar senha' }));
  expect(input).toHaveAttribute('type', 'text');
  expect(input).toHaveValue('Valor de teste');
  rerender(<fieldset disabled><FormField label="Senha"><PasswordInput name="senha" defaultValue="Valor de teste" /></FormField></fieldset>);
  expect(input).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Ocultar senha' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Ocultar senha' }));
  expect(input).toHaveAttribute('type', 'text');
});
