import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import MesasPage from './MesasPage';
import api from '../api/api';

jest.mock('../api/api', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), put: jest.fn() } }));
const mesas = [
  { id: 1, numero: 1, ativo: true, status: 'DISPONIVEL' },
  { id: 2, numero: 2, ativo: true, status: 'OCUPADA' },
  { id: 3, numero: 3, ativo: false, status: 'DISPONIVEL' },
];
beforeEach(() => { jest.clearAllMocks(); api.get.mockResolvedValue({ data: mesas }); });
const montar = async () => { render(<MesasPage />); await screen.findByRole('button', { name: 'Mesa 1, disponivel' }); };

test('filtros de busca e disponibilidade não alteram o resumo do salão', async () => {
  await montar();
  fireEvent.change(screen.getByLabelText('Disponibilidade', { selector: 'select' }), { target: { value: 'OCUPADA' } });
  expect(screen.queryByRole('button', { name: 'Mesa 1, disponivel' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Mesa 2, ocupada' })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Buscar mesa'), { target: { value: '99' } });
  expect(screen.getByText('Nenhuma mesa encontrada')).toBeInTheDocument();
  fireEvent.click(screen.getAllByRole('button', { name: 'Limpar filtros' })[0]);
  expect(screen.getByRole('button', { name: 'Mesa 3, inativa' })).toBeInTheDocument();
});

test('mesa ocupada não abre desativação e explica o motivo', async () => {
  await montar();
  fireEvent.click(screen.getByRole('button', { name: 'Mesa 2, ocupada' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveTextContent('não pode ser desativada durante o atendimento');
  expect(api.put).not.toHaveBeenCalled();
});

test('criação usa trava síncrona para não repetir requisição', async () => {
  let concluir;
  api.post.mockImplementation(() => new Promise((resolve) => { concluir = resolve; }));
  await montar();
  fireEvent.change(screen.getByLabelText('Número da nova mesa'), { target: { value: '4' } });
  const form = screen.getByRole('form', { name: 'Adicionar mesa' });
  fireEvent.submit(form);
  fireEvent.submit(form);
  expect(api.post).toHaveBeenCalledTimes(1);
  expect(api.post).toHaveBeenCalledWith('/mesas', { numero: 4, status: 'DISPONIVEL', ativo: true });
  expect(screen.getByLabelText('Número da nova mesa')).toBeDisabled();
  await act(async () => concluir({ data: {} }));
  await waitFor(() => expect(screen.getByLabelText('Número da nova mesa')).toHaveValue(null));
});

test('desativação mantém erro no modal e permite nova tentativa sem cliques duplicados', async () => {
  const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  api.put.mockRejectedValueOnce({ response: { data: { message: 'Mesa vinculada a uma comanda.' } } });
  await montar();
  fireEvent.click(screen.getByRole('button', { name: 'Mesa 1, disponivel' }));
  const modal = screen.getByRole('dialog');
  fireEvent.click(within(modal).getByRole('button', { name: 'Desativar mesa' }));
  expect(await within(modal).findByRole('alert')).toHaveTextContent('Mesa vinculada a uma comanda.');
  let concluir;
  api.put.mockImplementation(() => new Promise((resolve) => { concluir = resolve; }));
  const desativar = within(modal).getByRole('button', { name: 'Desativar mesa' });
  act(() => { desativar.click(); desativar.click(); });
  expect(api.put).toHaveBeenCalledTimes(2);
  expect(within(modal).getByRole('button', { name: 'Cancelar' })).toBeDisabled();
  await act(async () => concluir({ data: {} }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  consoleError.mockRestore();
});
