import { render, screen } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import App from './App';

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('aurora_session', JSON.stringify({ token: 'offline-demo', demo: true, user: { id: 1, branchId: 1, name: 'Davi Fernandes', email: 'admin@aurora.pizza', role: 'ADMIN' } }));
  localStorage.setItem('aurora_branch_id', '1');
  window.scrollTo = vi.fn();
});

test('renderiza a navegação autenticada e o dashboard principal', async () => {
  render(<App />);
  expect(await screen.findByText('Aurora Pizza')).toBeInTheDocument();
  expect(await screen.findByText('Boa tarde, Davi.')).toBeInTheDocument();
  expect(screen.getByText('Faturamento de hoje')).toBeInTheDocument();
  expect(screen.getByText('Compras')).toBeInTheDocument();
});

test('exibe o login quando não existe sessão', async () => {
  localStorage.clear();
  render(<App />);
  expect(await screen.findByText('Bem-vindo de volta')).toBeInTheDocument();
  expect(screen.getByDisplayValue('admin@aurora.pizza')).toBeInTheDocument();
});
