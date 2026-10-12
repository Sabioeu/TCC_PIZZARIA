import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HomePage from './HomePage';
import api from '../api/api';

jest.mock('../api/api', () => ({ __esModule: true, default: { get: jest.fn() } }));
jest.mock('../auth/AuthContext', () => ({ useAuth: () => ({ usuario: { id: 7, nome: 'Davi Fernandes', perfil: 'ADMINISTRADOR' } }) }));
const dashboard = {
  faturamentoHoje: 100, faturamentoMes: 300, comandasAbertas: 2, ticketMedioMes: 75,
  mesasDisponiveis: 3, mesasOcupadas: 2,
  faturamentoSemanal: [
    { data: '2026-10-10', rotulo: 'Sáb.', valor: 200 },
    { data: '2026-10-11', rotulo: 'Dom.', valor: 100 },
  ],
  meiosPagamento: [{ tipo: 'PIX', valor: 300, quantidade: 4 }], atividadesRecentes: [],
};
beforeEach(() => { jest.clearAllMocks(); api.get.mockResolvedValue({ data: dashboard }); });
const montar = () => render(<MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}><HomePage /></MemoryRouter>);

test('saudação usa o nome do usuário e mostra a atualização manual', async () => {
  montar();
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Davi!');
  await screen.findByText('Atualização manual');
  expect(screen.getByText(/Atualizado em/)).toBeInTheDocument();
  expect(screen.getByText('2/5')).toBeInTheDocument();
  expect(api.get).toHaveBeenCalledWith('/dashboard/resumo');
});

test('barras de receita exibem valor acessível por foco e toque', async () => {
  montar();
  const chart = await screen.findByRole('group', { name: 'Gráfico de faturamento semanal' });
  const dias = within(chart).getAllByRole('button');
  expect(dias[0]).toHaveAccessibleName(/200,00/);
  act(() => dias[0].focus());
  expect(dias[0]).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('status')).toHaveTextContent(/200,00/);
  fireEvent.click(dias[1]);
  expect(dias[1]).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('status')).toHaveTextContent(/100,00/);
});

test('meios de pagamento mostram valores e recebimentos, além da porcentagem', async () => {
  montar();
  const pagamentos = await screen.findByRole('group', { name: 'Valores por meio de pagamento' });
  const pix = within(pagamentos).getByRole('button', { name: /Pix.*4 recebimentos.*300,00.*100%/ });
  act(() => pix.focus());
  expect(pix).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(screen.getByRole('button', { name: 'Ver total de recebimentos' }));
  expect(pix).toHaveAttribute('aria-pressed', 'false');
});

test('refresh pendente bloqueia novas requisições e preserva resultado em caso de erro', async () => {
  montar();
  await screen.findByText('Atualização manual');
  let rejeitar;
  api.get.mockImplementation(() => new Promise((resolve, reject) => { rejeitar = reject; }));
  const atualizar = screen.getByRole('button', { name: 'Atualizar indicadores' });
  act(() => { atualizar.click(); atualizar.click(); });
  expect(api.get).toHaveBeenCalledTimes(2);
  expect(atualizar).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Atualizar painel' })).toBeDisabled();
  await act(async () => rejeitar(new Error('Sem conexão')));
  expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível atualizar os indicadores.');
  expect(screen.getByText('2/5')).toBeInTheDocument();
  expect(screen.getByText('Atualização manual')).toBeInTheDocument();
  api.get.mockResolvedValue({ data: dashboard });
  fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
  await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
});

test('listas ausentes no resumo são tratadas sem inventar dados para os gráficos', async () => {
  api.get.mockResolvedValue({ data: { faturamentoSemanal: null, meiosPagamento: null, atividadesRecentes: null } });
  montar();
  expect(await screen.findByText('Sem dados de faturamento no período')).toBeInTheDocument();
  expect(screen.getByText('Sem vendas registradas neste mês')).toBeInTheDocument();
  expect(screen.getByText('Nenhuma atividade recente')).toBeInTheDocument();
});
