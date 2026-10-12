import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ComandasPage from './ComandasPage';
import api from '../api/api';
jest.mock('../api/api', () => ({ __esModule: true, default: { get: jest.fn(), patch: jest.fn(), delete: jest.fn() } }));
let mockPerfil = 'ATENDENTE';
jest.mock('../auth/AuthContext', () => ({ useAuth: () => ({ usuario: { id: 7, perfil: mockPerfil } }) }));
const delivery = { id: 1, numero: 10, total: 25, tipoAtendimento: 'DELIVERY', etapaAtendimento: 'RECEBIDO', enderecoEntrega: 'Rua Teste, 10', telefoneContato: '44999999999', taxaEntrega: 5, cliente: { nome: 'Cliente teste' }, mesa: { numero: 2 } };
beforeEach(() => { jest.clearAllMocks(); mockPerfil = 'ATENDENTE'; api.get.mockResolvedValue({ data: [delivery] }); });
test('mostra referência curta e usa ID interno ao avançar atendimento', async () => {
  const diaria={ ...delivery, id: 77, numero: 1760834260, numeroDiario: 3, dataNumeracao: '2026-10-11', dataHoraAbertura: '2026-10-11T14:23:00' };
  api.get.mockResolvedValue({ data: [diaria] });
  api.patch.mockResolvedValue({ data: { ...diaria, etapaAtendimento: 'EM_PREPARO' } });
  render(<MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}><ComandasPage /></MemoryRouter>);
  await screen.findByText('Comanda #003');
  expect(screen.queryByText('Comanda #1760834260')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Avançar: Em preparo/ }));
  await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/comandas/77/etapa', { etapa: 'EM_PREPARO' }));
});
const montar = async () => {
  render(<MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}><ComandasPage /></MemoryRouter>);
  await screen.findByText('Comanda #10');
};
test('mostra dados do delivery e impede faturar antes da conclusão', async () => {
  await montar();
  expect(screen.getByText('Rua Teste, 10')).toBeInTheDocument();
  expect(screen.getByText(/Mesa 2 \(referência\)/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Faturar comanda/ })).toBeDisabled();
  expect(screen.queryByRole('button', { name: /Cancelar atendimento/ })).not.toBeInTheDocument();
});
test('avança etapa pela API e atualiza a próxima ação', async () => {
  await montar(); api.patch.mockResolvedValue({ data: { ...delivery, etapaAtendimento: 'EM_PREPARO' } });
  fireEvent.click(screen.getByRole('button', { name: /Avançar: Em preparo/ }));
  expect(await screen.findByRole('button', { name: /Avançar: Pronto/ })).toBeInTheDocument();
  await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/comandas/1/etapa', { etapa: 'EM_PREPARO' }));
});
test('filtro separa tipos sem remover os atendimentos da lista original', async () => {
  await montar();
  fireEvent.change(screen.getByLabelText('Tipo de atendimento', { selector: 'select' }), { target: { value: 'RETIRADA' } });
  expect(screen.queryByText('Comanda #10')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Tipo de atendimento', { selector: 'select' }), { target: { value: 'DELIVERY' } });
  expect(screen.getByText('Comanda #10')).toBeInTheDocument();
});

test('busca e etapa filtram a lista e podem ser limpas', async () => {
  await montar();
  fireEvent.change(screen.getByLabelText('Buscar atendimento'), { target: { value: 'inexistente' } });
  expect(screen.getByText('Nenhum atendimento encontrado')).toBeInTheDocument();
  fireEvent.click(screen.getAllByRole('button', { name: 'Limpar filtros' })[0]);
  fireEvent.change(screen.getByLabelText('Buscar atendimento'), { target: { value: 'cliente' } });
  expect(screen.getByText('Comanda #10')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Etapa do pedido', { selector: 'select' }), { target: { value: 'CONCLUIDO' } });
  expect(screen.queryByText('Comanda #10')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Etapa do pedido', { selector: 'select' }), { target: { value: 'RECEBIDO' } });
  expect(screen.getByText('Comanda #10')).toBeInTheDocument();
  expect(within(screen.getByRole('list', { name: 'Etapas da comanda #10' })).getAllByRole('listitem')[0]).toHaveAttribute('aria-current', 'step');
});

test('avanço pendente envia uma única requisição e bloqueia outras ações', async () => {
  let concluir;
  api.patch.mockImplementation(() => new Promise((resolve) => { concluir = resolve; }));
  await montar();
  const avancar = screen.getByRole('button', { name: /Avançar: Em preparo/ });
  act(() => { avancar.click(); avancar.click(); });
  expect(api.patch).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Atualizar' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Atualizando...' })).toBeDisabled();
  await act(async () => concluir({ data: { ...delivery, etapaAtendimento: 'EM_PREPARO' } }));
  expect(screen.getByRole('button', { name: /Avançar: Pronto/ })).toBeEnabled();
});

test('erro de faturamento aparece dentro do modal e permite tentar novamente', async () => {
  const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  api.get.mockResolvedValue({ data: [{ ...delivery, etapaAtendimento: 'CONCLUIDO' }] });
  api.patch.mockRejectedValueOnce({ response: { data: { message: 'Estoque insuficiente.' } } });
  await montar();
  fireEvent.click(screen.getByRole('button', { name: 'Faturar comanda' }));
  let modal = screen.getByRole('dialog');
  fireEvent.click(within(modal).getByLabelText('Pix'));
  fireEvent.click(within(modal).getByRole('button', { name: 'Confirmar faturamento' }));
  expect(await within(modal).findByRole('alert')).toHaveTextContent('Estoque insuficiente.');
  let concluir;
  api.patch.mockImplementation(() => new Promise((resolve) => { concluir = resolve; }));
  const confirmar = within(modal).getByRole('button', { name: 'Confirmar faturamento' });
  act(() => { confirmar.click(); confirmar.click(); });
  expect(api.patch).toHaveBeenCalledTimes(2);
  expect(within(modal).getByRole('button', { name: 'Cancelar' })).toBeDisabled();
  await act(async () => concluir({ data: {} }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  consoleError.mockRestore();
});

test('cancelamento administrativo confirma a intenção e mostra falhas no dialog', async () => {
  mockPerfil = 'ADMINISTRADOR';
  api.delete.mockRejectedValueOnce({ response: { data: { message: 'Não foi possível cancelar agora.' } } });
  await montar();
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar atendimento' }));
  const modal = screen.getByRole('alertdialog');
  expect(api.delete).not.toHaveBeenCalled();
  fireEvent.click(within(modal).getByRole('button', { name: 'Cancelar atendimento' }));
  expect(await within(modal).findByRole('alert')).toHaveTextContent('Não foi possível cancelar agora.');
  api.delete.mockResolvedValue({ data: {} });
  fireEvent.click(within(modal).getByRole('button', { name: 'Cancelar atendimento' }));
  await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  expect(api.delete).toHaveBeenCalledTimes(2);
  expect(screen.getByText('Nenhuma comanda aberta')).toBeInTheDocument();
});
