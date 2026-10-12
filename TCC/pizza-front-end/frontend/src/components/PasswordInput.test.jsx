import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import FormField from './FormField';
import PasswordInput from './PasswordInput';

test('mostrar e ocultar preserva a senha, descrição e ref do input', () => {
  const ref = createRef();
  render(<FormField label="Senha" hint="Use uma senha pessoal." required><PasswordInput name="senha" value="teste123" onChange={() => {}} ref={ref} /></FormField>);
  const input = screen.getByLabelText('Senha');
  expect(ref.current).toBe(input);
  expect(input).toHaveAttribute('type', 'password');
  expect(input).toHaveAccessibleDescription('Use uma senha pessoal.');
  const toggle = screen.getByRole('button', { name: 'Mostrar senha' });
  fireEvent.click(toggle);
  expect(input).toHaveAttribute('type', 'text');
  expect(input).toHaveValue('teste123');
  expect(screen.getByRole('button', { name: 'Ocultar senha' })).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(screen.getByRole('button', { name: 'Ocultar senha' }));
  expect(input).toHaveAttribute('type', 'password');
});

test('fieldset desabilitado também impede revelar a senha', () => {
  render(<fieldset disabled><FormField label="Senha"><PasswordInput value="teste123" onChange={() => {}} /></FormField></fieldset>);
  const toggle = screen.getByRole('button', { name: 'Mostrar senha' });
  expect(toggle).toBeDisabled();
  fireEvent.click(toggle);
  expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'password');
});
