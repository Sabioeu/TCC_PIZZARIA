import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock('./api/api', () => ({
  __esModule: true,
  default: {
    get: (url) => url === '/auth/me' ? Promise.resolve({ data: { id: 1, nome: 'Administrador teste', email: 'admin@teste.com', perfil: 'ADMINISTRADOR' } }) : url === '/auth/config' ? Promise.resolve({ data: { precisaAdministrador: false } }) : Promise.resolve({
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
  limparCsrf: jest.fn(),
}));

test('renderiza a navegação e o dashboard principal', async () => {
  window.scrollTo = jest.fn();
  render(<App />);
  expect(await screen.findByText('Modelos Pizza')).toBeInTheDocument();
  expect(await screen.findByText('Central de operações')).toBeInTheDocument();
  expect(screen.getByText('Faturamento de hoje')).toBeInTheDocument();
});
