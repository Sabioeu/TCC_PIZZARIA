import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import CadastroProdutoPage from './CadastroProdutoPage';
import api from '../api/api';

jest.mock('../api/api', () => ({ __esModule: true, default: { get: jest.fn(), delete: jest.fn(), post: jest.fn(), put: jest.fn() } }));
const produto = { id: 8, nome: 'Pizza Margherita', preco: 45, descricao: 'Queijo e manjericão', quantidade: 10, porIngredientes: false };
const ficha = { produtoId: 8, porIngredientes: false, componentes: [] };
beforeEach(() => {
  jest.clearAllMocks();
  api.get.mockImplementation((url) => Promise.resolve({ data: url === '/produtos' ? [produto] : url === '/insumos' ? [{ id: 1, nome: 'Queijo', unidade: 'kg', quantidade: 5 }] : ficha }));
});

test('não consulta fichas e insumos até abrir a ação do produto e devolve o foco ao voltar', async () => {
  render(<CadastroProdutoPage />);
  await screen.findByText('Pizza Margherita');
  expect(api.get).toHaveBeenCalledTimes(1);
  expect(api.get).toHaveBeenCalledWith('/produtos');
  const abrir = screen.getByRole('button', { name: 'Ficha técnica de Pizza Margherita' });
  abrir.focus(); fireEvent.click(abrir);
  expect(screen.getByRole('dialog', { name: 'Ficha técnica' })).toBeInTheDocument();
  await screen.findByRole('button', { name: 'Salvar ficha técnica' });
  expect(api.get).toHaveBeenCalledWith('/produtos/8/ficha-tecnica');
  expect(api.get).toHaveBeenCalledWith('/insumos');
  fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(abrir).toHaveFocus();
  expect(api.put).not.toHaveBeenCalled();
});

test('salvar fecha o painel e atualiza o modo na lista sem perder os dados do produto', async () => {
  api.put.mockResolvedValue({ data: { produtoId: 8, porIngredientes: true, componentes: [{ insumoId: 1, nome: 'Queijo', unidade: 'kg', quantidadePorUnidade: 0.2 }] } });
  render(<CadastroProdutoPage />);
  await screen.findByText('Pizza Margherita');
  fireEvent.click(screen.getByRole('button', { name: 'Ficha técnica de Pizza Margherita' }));
  await screen.findByRole('button', { name: 'Salvar ficha técnica' });
  fireEvent.change(screen.getByLabelText('Controle de estoque', { selector: 'select' }), { target: { value: 'ingredientes' } });
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar insumo' }));
  fireEvent.change(screen.getByLabelText('Insumo 1', { selector: 'select' }), { target: { value: '1' } });
  fireEvent.change(screen.getByLabelText('Quantidade por unidade 1'), { target: { value: '0.2' } });
  fireEvent.click(screen.getByRole('button', { name: 'Salvar ficha técnica' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(screen.getByText('Ingredientes')).toBeInTheDocument();
  expect(screen.getByText('Pelos ingredientes')).toBeInTheDocument();
  expect(screen.getByText('Queijo e manjericão')).toBeInTheDocument();
  expect(screen.getByText(/45,00/)).toBeInTheDocument();
});

test('ficha em salvamento impede fechar por Escape e todas as ações paralelas', async () => {
  let resolver;
  api.put.mockImplementation(() => new Promise((resolve) => { resolver = resolve; }));
  render(<CadastroProdutoPage />);
  await screen.findByText('Pizza Margherita');
  fireEvent.click(screen.getByRole('button', { name: 'Ficha técnica de Pizza Margherita' }));
  await screen.findByRole('button', { name: 'Salvar ficha técnica' });
  fireEvent.submit(screen.getByRole('form'));
  fireEvent.submit(screen.getByRole('form'));
  expect(api.put).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Fechar cadastro' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Novo produto', hidden: true })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Editar produto Pizza Margherita', hidden: true })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Excluir produto Pizza Margherita', hidden: true })).toBeDisabled();
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  await act(async () => resolver({ data: ficha }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});
