import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import MainLayout from './MainLayout';
jest.mock('../auth/AuthContext', () => ({ useAuth: () => ({ usuario: { nome: 'Pessoa Teste', perfil: 'ATENDENTE' }, sair: jest.fn() }), podeAcessar: () => true }));
const montar = () => render(<MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}><Routes><Route element={<MainLayout />} path="/"><Route index element={<h1>Conteúdo</h1>} /></Route></Routes></MemoryRouter>);
beforeEach(() => { Object.defineProperty(window, 'innerWidth', { configurable: true, value: 375 }); window.scrollTo = jest.fn(); });
afterEach(() => { Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 }); });
test('menu móvel abre como dialog e fecha com Escape', async () => {
  montar(); const trigger = screen.getByRole('button', { name: 'Abrir menu' });
  trigger.focus(); fireEvent.click(trigger);
  expect(screen.getByRole('dialog', { name: 'Menu do sistema' })).toBeInTheDocument();
  fireEvent.keyDown(document.activeElement, { key: 'Escape' });
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  await waitFor(() => expect(trigger).toHaveFocus());
});
test('tocar na rota atual também fecha menu e mantém conteúdo', async () => {
  montar(); fireEvent.click(screen.getByRole('button', { name: 'Abrir menu' }));
  fireEvent.click(screen.getByRole('link', { name: 'Dashboard' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(screen.getByRole('heading', { name: 'Conteúdo' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Ir para o conteúdo' })).toHaveAttribute('href', '#main-content');
});
