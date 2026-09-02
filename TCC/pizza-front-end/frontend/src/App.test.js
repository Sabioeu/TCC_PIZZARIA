import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock('./api/api', () => ({
  __esModule: true,
  default: {
    get: () => Promise.resolve({
      data: {
        faturamentoHoje: 0,
        faturamentoMes: 0,
        comandasAbertas: 0,
        ticketMedioMes: 0,
        mesasDisponiveis: 0,
        mesasOcupadas: 0,
        produtosCadastrados: 0,
        clientesCadastrados: 0,
        itensEstoqueBaixo: 0,
        contasPendentes: 0,
        contasVencidas: 0,
        faturamentoSemanal: [],
        meiosPagamento: [],
        atividadesRecentes: [],
      },
    }),
  },
}));

test('renderiza a navegação e o dashboard principal', async () => {
  window.scrollTo = jest.fn();
  render(<App />);
  expect(screen.getByText('Modelos Pizza')).toBeInTheDocument();
  expect(await screen.findByText('Central de operações')).toBeInTheDocument();
  expect(screen.getByText('Faturamento de hoje')).toBeInTheDocument();
});
