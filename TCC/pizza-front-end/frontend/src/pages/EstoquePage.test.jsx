import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import EstoquePage from './EstoquePage';
import api from '../api/api';
jest.mock('../api/api', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));
const produto = { id: 1, nome: 'Pizza teste', quantidade: 10 };
beforeEach(() => { jest.resetAllMocks(); api.get.mockImplementation((url) => Promise.resolve({ data: url === '/produtos' ? [produto] : [{ produtoId: 1, estoque: 10, reservado: 7, disponivel: 3 }] })); });
test('estoque distingue saldo físico reservado e disponível', async () => {
  render(<EstoquePage />); await screen.findByText('Pizza teste');
  const row = screen.getByRole('row', { name: /Pizza teste/ });
  expect(row).toHaveTextContent('10.00'); expect(row).toHaveTextContent('7.00'); expect(row).toHaveTextContent('3.00'); expect(row).toHaveTextContent('Baixo');
});
test('entrada bloqueia envio duplicado e limpa quantidade após sucesso', async () => {
  let resolve; api.post.mockImplementation(() => new Promise((done) => { resolve = done; }));
  render(<EstoquePage />); await screen.findByText('Pizza teste');
  fireEvent.change(screen.getByLabelText('Produto', { selector: 'select' }), { target: { value: '1' } });
  fireEvent.change(screen.getByLabelText('Quantidade da entrada'), { target: { value: '5' } });
  fireEvent.submit(screen.getByRole('form', { name: 'Registrar entrada de estoque' })); fireEvent.submit(screen.getByRole('form', { name: 'Registrar entrada de estoque' }));
  expect(api.post).toHaveBeenCalledTimes(1);
  resolve({});
  await waitFor(() => expect(screen.getByLabelText('Quantidade da entrada')).toHaveValue(null));
});
test('refresh falho após entrada salva não sugere repetir lançamento', async () => {
  api.post.mockResolvedValue({});
  render(<EstoquePage />); await screen.findByText('Pizza teste');
  fireEvent.change(screen.getByLabelText('Produto', { selector: 'select' }), { target: { value: '1' } });
  fireEvent.change(screen.getByLabelText('Quantidade da entrada'), { target: { value: '5' } });
  api.get.mockRejectedValue(new Error('offline'));
  fireEvent.submit(screen.getByRole('form', { name: 'Registrar entrada de estoque' }));
  expect(await screen.findByText(/Não repita o lançamento/)).toBeInTheDocument();
  expect(api.post).toHaveBeenCalledTimes(1);
});

test('capacidade de preparo não aumenta totais de estoque físico nem recebe entrada direta', async () => {
  api.get.mockImplementation((url) => Promise.resolve({ data: url === '/produtos'
    ? [produto, { id: 2, nome: 'Pizza por ingredientes', quantidade: 999 }]
    : [{ produtoId: 1, estoque: 10, reservado: 7, disponivel: 3, modoEstoque: 'PRODUTO' }, { produtoId: 2, estoque: 100, reservado: 4, disponivel: 70, modoEstoque: 'INGREDIENTES' }] }));
  render(<EstoquePage />);
  await screen.findByText('Pizza por ingredientes');
  const fisico = screen.getByRole('group', { name: 'Saldo físico total' });
  expect(within(fisico).getByText('10.00')).toBeInTheDocument();
  const reservado = screen.getByRole('group', { name: 'Unidades reservadas' });
  expect(within(reservado).getByText('7.00')).toBeInTheDocument();
  const row = screen.getByRole('row', { name: /Pizza por ingredientes/ });
  expect(row).toHaveTextContent('Saldo nos insumos');
  expect(row).toHaveTextContent('70.00');
  expect(row).not.toHaveTextContent('100.00');
  const options = within(screen.getByLabelText('Produto', { selector: 'select' })).getAllByRole('option', { hidden: true });
  expect(options.some((option) => option.value === '2')).toBe(false);
  expect(screen.getByText(/Reponha os ingredientes/)).toBeInTheDocument();
});

test('controle de estoque filtra unidades e preparos sem alterar os totais', async () => {
  api.get.mockImplementation((url) => Promise.resolve({ data: url === '/produtos'
    ? [produto, { id: 2, nome: 'Pizza por ingredientes', quantidade: 999 }]
    : [{ produtoId: 1, estoque: 10, reservado: 7, disponivel: 3 }, { produtoId: 2, estoque: 5, reservado: 0, disponivel: 5, modoEstoque: 'INGREDIENTES' }] }));
  render(<EstoquePage />);
  await screen.findByText('Pizza por ingredientes');
  fireEvent.change(screen.getByLabelText('Tipo de controle', { selector: 'select' }), { target: { value: 'INGREDIENTES' } });
  expect(screen.queryByText('Pizza teste')).not.toBeInTheDocument();
  expect(screen.getByText('Pizza por ingredientes')).toBeInTheDocument();
  expect(screen.getByRole('group', { name: 'Saldo físico total' })).toHaveTextContent('10.00');
  expect(api.post).not.toHaveBeenCalled();
});
