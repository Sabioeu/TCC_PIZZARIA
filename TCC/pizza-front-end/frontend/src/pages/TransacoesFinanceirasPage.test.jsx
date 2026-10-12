import { fireEvent, render, screen } from '@testing-library/react';
import TransacoesFinanceirasPage from './TransacoesFinanceirasPage';
import api from '../api/api';
jest.mock('../api/api', () => ({ __esModule: true, default: { get: jest.fn() } }));
beforeEach(() => { api.get.mockResolvedValue({ data: [
  { id: 1, descricao: 'Venda antiga', tipo: 'PIX', dataHora: '2026-09-01T12:00:00', valor: 10 },
  { id: 2, descricao: 'Venda atual', tipo: 'DINHEIRO', dataHora: '2026-10-11T12:00:00', valor: 20 },
] }); });
test('filtra por período e pagamento sem remover histórico original', async () => {
  render(<TransacoesFinanceirasPage />); await screen.findByText('Venda atual');
  fireEvent.change(screen.getByLabelText('De'), { target: { value: '2026-10-01' } });
  expect(screen.queryByText('Venda antiga')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Meio de pagamento', { selector: 'select' }), { target: { value: 'PIX' } });
  expect(screen.queryByText('Venda atual')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));
  expect(screen.getByText('Venda antiga')).toBeInTheDocument();
  expect(screen.getByText('Venda atual')).toBeInTheDocument();
});
test('datas invertidas exibem erro e não apresentam registros enganosos', async () => {
  render(<TransacoesFinanceirasPage />); await screen.findByText('Venda atual');
  fireEvent.change(screen.getByLabelText('De'), { target: { value: '2026-10-10' } });
  fireEvent.change(screen.getByLabelText('Até'), { target: { value: '2026-10-01' } });
  expect(screen.getByRole('alert')).toHaveTextContent('A data inicial');
  expect(screen.queryByText('Venda atual')).not.toBeInTheDocument();
});
