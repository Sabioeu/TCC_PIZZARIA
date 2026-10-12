import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PedidosPage from './PedidosPage';
import api from '../api/api';
jest.mock('../api/api', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), put: jest.fn() } }));
jest.mock('../auth/AuthContext', () => ({ useAuth: () => ({ usuario: { id: 7, perfil: 'ATENDENTE' } }) }));
beforeEach(() => {
  jest.clearAllMocks();
  api.get.mockImplementation((url) => Promise.resolve({ data: url === '/clientes' ? [{ id: 1, nome: 'Cliente teste' }] : url === '/produtos' ? [{ id: 2, nome: 'Pizza teste', preco: 20, quantidade: 10 }] : url === '/mesas' ? [{ id: 3, numero: 1, ativo: true, status: 'DISPONIVEL' }] : [] }));
  api.post.mockResolvedValue({ data: {} });
});
const montar = async () => {
  render(<MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}><PedidosPage /></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button', { name: /Pizza teste/ }));
};

const carregarIngredientes = (disponivel = 1) => {
  api.get.mockImplementation((url) => Promise.resolve({ data: url === '/clientes'
    ? [{ id: 1, nome: 'Cliente teste' }]
    : url === '/produtos'
      ? [{ id: 2, nome: 'Pizza teste', preco: 20, quantidade: 99 }, { id: 4, nome: 'Pizza queijo', preco: 25, quantidade: 99 }]
      : url === '/produtos/disponibilidade'
        ? [2, 4].map((produtoId) => ({ produtoId, modoEstoque: 'INGREDIENTES', estoque: 2, reservado: 0, disponivel, ingredientes: [{ insumoId: 10, nome: 'Queijo', unidade: 'KG', quantidadePorUnidade: 0.2, saldo: 0.4, reservado: 0.2, disponivel: disponivel * 0.2 }] }))
        : [] }));
};

test('pizza preparada usa capacidade dos ingredientes, não quantidade física do cadastro', async () => {
  carregarIngredientes(0);
  render(<MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}><PedidosPage /></MemoryRouter>);
  expect(await screen.findByRole('button', { name: /Pizza teste/ })).toBeDisabled();
  expect(screen.getAllByText('Sem ingredientes disponíveis')).toHaveLength(2);
  expect(screen.getAllByText('Produzido com ingredientes')).toHaveLength(2);
});

test('pizzas diferentes não somam a capacidade de um ingrediente compartilhado', async () => {
  carregarIngredientes();
  await montar();
  fireEvent.click(screen.getByRole('button', { name: /Pizza queijo/ }));
  expect(screen.getByRole('alert')).toHaveTextContent('Ingredientes compartilhados insuficientes: Queijo');
  expect(screen.getByRole('alert')).toHaveTextContent('0,4 KG');
  expect(screen.queryByRole('button', { name: 'Remover uma unidade de Pizza queijo' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Remover uma unidade de Pizza teste' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Remover uma unidade de Pizza teste' }));
  fireEvent.click(screen.getByRole('button', { name: /Pizza queijo/ }));
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Remover uma unidade de Pizza queijo' })).toBeInTheDocument();
});

test('atualizar ingredientes detecta consumo conjunto insuficiente mesmo com capacidade individual', async () => {
  carregarIngredientes(2);
  await montar();
  fireEvent.click(screen.getByRole('button', { name: /Pizza queijo/ }));
  fireEvent.change(screen.getByLabelText('Tipo de atendimento', { selector: 'select' }), { target: { value: 'RETIRADA' } });
  fireEvent.change(screen.getByLabelText('Cliente', { selector: 'select' }), { target: { value: '1' } });
  carregarIngredientes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Atualizar estoque' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Ingredientes compartilhados insuficientes');
  await waitFor(() => expect(screen.getByRole('button', { name: /Abrir pedido/ })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: /Abrir pedido/ }));
  expect(api.post).not.toHaveBeenCalled();
  expect(screen.getByRole('alert')).toHaveTextContent('Reduza a quantidade do pedido');
  expect(screen.getByRole('button', { name: 'Remover uma unidade de Pizza queijo' })).toBeEnabled();
});
test('produto sem disponibilidade não pode ser adicionado', async () => {
  api.get.mockImplementation((url) => Promise.resolve({ data: url === '/produtos' ? [{ id: 2, nome: 'Pizza teste', preco: 20, quantidade: 10 }] : url === '/produtos/disponibilidade' ? [{ produtoId: 2, disponivel: 0, reservado: 10 }] : [] }));
  render(<MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}><PedidosPage /></MemoryRouter>);
  expect(await screen.findByRole('button', { name: /Pizza teste/ })).toBeDisabled();
  expect(screen.getByText('Sem estoque disponível')).toBeInTheDocument();
});
test('carrinho impede quantidade maior que saldo e atualiza após outro pedido reservar', async () => {
  api.get.mockImplementation((url) => Promise.resolve({ data: url === '/produtos' ? [{ id: 2, nome: 'Pizza teste', preco: 20, quantidade: 1 }] : url === '/produtos/disponibilidade' ? [{ produtoId: 2, disponivel: 1 }] : [] }));
  await montar();
  expect(screen.getByRole('button', { name: 'Adicionar uma unidade de Pizza teste' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: /Pizza teste.*Disponível/ }));
  expect(screen.getByText(/Estoque insuficiente para Pizza teste/)).toBeInTheDocument();
  api.get.mockResolvedValue({ data: [{ produtoId: 2, disponivel: 0 }] });
  fireEvent.click(screen.getByRole('button', { name: 'Atualizar estoque' }));
  await waitFor(() => expect(screen.getByRole('button', { name: /Pizza teste.*Sem estoque/ })).toBeDisabled());
  fireEvent.click(screen.getByRole('button', { name: /Abrir comanda/ }));
  expect(screen.getByText(/Reduza a quantidade/)).toBeInTheDocument();
  expect(api.post).not.toHaveBeenCalled();
});
test('delivery envia endereço, contato e taxa sem exigir mesa', async () => {
  await montar();
  fireEvent.change(screen.getByLabelText('Tipo de atendimento', { selector: 'select' }), { target: { value: 'DELIVERY' } });
  fireEvent.change(screen.getByLabelText('Cliente', { selector: 'select' }), { target: { value: '1' } });
  fireEvent.change(screen.getByLabelText('Endereço de entrega'), { target: { value: 'Rua Teste, 10' } });
  fireEvent.change(screen.getByLabelText('Telefone de contato'), { target: { value: '44999999999' } });
  fireEvent.change(screen.getByLabelText('Taxa de entrega (R$)'), { target: { value: '5.50' } });
  fireEvent.click(screen.getByRole('button', { name: /Abrir (comanda|pedido)/ }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith('/comandas', expect.objectContaining({ tipoAtendimento: 'DELIVERY', mesaId: null, taxaEntrega: 5.5, enderecoEntrega: 'Rua Teste, 10', telefoneContato: '44999999999', usuarioId: 7 })));
});
test('retirada não envia endereço nem taxa e não exige mesa', async () => {
  await montar();
  fireEvent.change(screen.getByLabelText('Tipo de atendimento', { selector: 'select' }), { target: { value: 'RETIRADA' } });
  fireEvent.change(screen.getByLabelText('Cliente', { selector: 'select' }), { target: { value: '1' } });
  expect(screen.queryByLabelText('Endereço de entrega')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Abrir (comanda|pedido)/ }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith('/comandas', expect.objectContaining({ tipoAtendimento: 'RETIRADA', mesaId: null, enderecoEntrega: null, taxaEntrega: 0 })));
});
test('presencial exige mesa e delivery exige endereço e contato', async () => {
  await montar();
  fireEvent.change(screen.getByLabelText('Cliente', { selector: 'select' }), { target: { value: '1' } });
  fireEvent.click(screen.getByRole('button', { name: /Abrir (comanda|pedido)/ }));
  expect(api.post).not.toHaveBeenCalled();
  expect(screen.getByText(/informe uma mesa/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Tipo de atendimento', { selector: 'select' }), { target: { value: 'DELIVERY' } });
  fireEvent.click(screen.getByRole('button', { name: /Abrir (comanda|pedido)/ }));
  expect(api.post).not.toHaveBeenCalled();
  expect(screen.getByText(/Informe endereço, telefone/)).toBeInTheDocument();
});

test('envio em processamento bloqueia cliques duplicados e edição do pedido', async () => {
  let concluir;
  api.post.mockImplementation(() => new Promise((resolve) => { concluir = resolve; }));
  await montar();
  fireEvent.change(screen.getByLabelText('Tipo de atendimento', { selector: 'select' }), { target: { value: 'RETIRADA' } });
  fireEvent.change(screen.getByLabelText('Cliente', { selector: 'select' }), { target: { value: '1' } });
  const enviar = screen.getByRole('button', { name: /Abrir pedido/ });
  act(() => { enviar.click(); enviar.click(); });
  expect(api.post).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: /Processando/ })).toBeDisabled();
  expect(screen.getByRole('combobox', { name: 'Tipo de atendimento' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Remover uma unidade de Pizza teste' })).toBeDisabled();
  await act(async () => concluir({ data: {} }));
});

test('erro no envio mantém itens e permite nova tentativa consciente', async () => {
  const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  api.post.mockRejectedValueOnce({ response: { data: { message: 'Estoque atualizado por outro atendimento.' } } });
  await montar();
  fireEvent.change(screen.getByLabelText('Tipo de atendimento', { selector: 'select' }), { target: { value: 'RETIRADA' } });
  fireEvent.change(screen.getByLabelText('Cliente', { selector: 'select' }), { target: { value: '1' } });
  fireEvent.click(screen.getByRole('button', { name: /Abrir pedido/ }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Estoque atualizado por outro atendimento.');
  expect(screen.getByRole('button', { name: 'Remover uma unidade de Pizza teste' })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: /Abrir pedido/ }));
  await waitFor(() => expect(api.post).toHaveBeenCalledTimes(2));
  consoleError.mockRestore();
});
