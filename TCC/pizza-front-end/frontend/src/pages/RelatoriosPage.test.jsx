import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import RelatoriosPage from './RelatoriosPage';
import api from '../api/api';

jest.mock('../api/api', () => ({ __esModule: true, default: { get: jest.fn() } }));
const resultado = { titulo: 'Entradas de estoque', periodo: 'Período de teste', observacao: 'Histórico registrado.', colunas: ['Data', 'Item', 'Categoria', 'Movimento', 'Quantidade', 'Unidade'], linhas: [{ celulas: ['06/10/2026', 'Pizza teste', 'Produto', 'ENTRADA', '10', 'un'] }], indicadores: [{ titulo: 'Registros', valor: '1' }] };
beforeEach(() => { api.get.mockReset(); api.get.mockResolvedValue({ data: resultado }); });

test('consulta o backend e apresenta os cinco modelos', async () => {
  render(<RelatoriosPage />);
  expect(await screen.findByText('Pizza teste')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Saídas de estoque/ })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Contas a pagar/ })).toBeInTheDocument();
  expect(api.get.mock.calls[0][0]).toBe('/relatorios/estoque-entradas/dados');
});
test('filtros alterados bloqueiam exportações até nova consulta', async () => {
  render(<RelatoriosPage />); await screen.findByText('Pizza teste');
  fireEvent.change(screen.getByLabelText('Buscar'), { target: { value: 'queijo' } });
  expect(screen.getByRole('button', { name: 'Baixar PDF' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: /Consultar/ }));
  await waitFor(() => expect(api.get).toHaveBeenLastCalledWith('/relatorios/estoque-entradas/dados', expect.objectContaining({ params: expect.objectContaining({ busca: 'queijo' }) })));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Baixar PDF' })).not.toBeDisabled());
});
test('posição atual desativa datas e remove período da requisição', async () => {
  render(<RelatoriosPage />); await screen.findByText('Pizza teste');
  fireEvent.click(screen.getByRole('button', { name: /Posição do estoque/ }));
  expect(screen.getByLabelText('Data inicial')).toBeDisabled();
  await waitFor(() => expect(api.get).toHaveBeenLastCalledWith('/relatorios/estoque-posicao/dados', expect.objectContaining({ params: {} })));
});
test('datas invertidas não consultam e mostram mensagem', async () => {
  render(<RelatoriosPage />); await screen.findByText('Pizza teste');
  fireEvent.change(screen.getByLabelText('Data inicial'), { target: { value: '2026-10-10' } });
  fireEvent.change(screen.getByLabelText('Data final'), { target: { value: '2026-10-01' } });
  fireEvent.click(screen.getByRole('button', { name: /Consultar/ }));
  expect(screen.getByRole('alert')).toHaveTextContent('A data inicial'); expect(api.get).toHaveBeenCalledTimes(1);
});
test('registros vazios podem ser exportados e falhas são exibidas', async () => {
  api.get.mockResolvedValueOnce({ data: { ...resultado, linhas: [] } });
  render(<RelatoriosPage />);
  expect(await screen.findByText('Nenhum registro encontrado')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Baixar PDF' })).not.toBeDisabled();
  api.get.mockRejectedValueOnce(new Error('offline'));
  fireEvent.click(screen.getByRole('button', { name: /Consultar/ }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível consultar');
});
