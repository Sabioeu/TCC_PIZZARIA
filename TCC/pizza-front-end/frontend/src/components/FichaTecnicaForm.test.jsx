import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import FichaTecnicaForm from './FichaTecnicaForm';
import api from '../api/api';

jest.mock('../api/api', () => ({ __esModule: true, default: { get: jest.fn(), put: jest.fn() } }));

const produto = { id: 8, nome: 'Pizza Margherita' };
const insumos = [{ id: 1, nome: 'Farinha', unidade: 'kg', quantidade: 8 }, { id: 2, nome: 'Queijo', unidade: 'kg', quantidade: 3 }];
const componente = { insumoId: 1, nome: 'Farinha', unidade: 'kg', quantidadePorUnidade: 0.2, saldo: 8, reservado: 1, disponivel: 7 };
const config = (ficha = { produtoId: 8, porIngredientes: false, componentes: [] }) => {
  api.get.mockImplementation((url) => Promise.resolve({ data: url === '/insumos' ? insumos : ficha }));
};
const carregar = async (props = {}) => {
  render(<FichaTecnicaForm produto={produto} {...props} />);
  await screen.findByRole('button', { name: 'Salvar ficha técnica' });
};
const ativar = () => fireEvent.change(screen.getByLabelText('Controle de estoque', { selector: 'select' }), { target: { value: 'ingredientes' } });
const adicionar = (id = '1', value = '0,2') => {
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar insumo' }));
  fireEvent.change(screen.getByLabelText('Insumo 1', { selector: 'select' }), { target: { value: id } });
  fireEvent.change(screen.getByLabelText('Quantidade por unidade 1'), { target: { value } });
};

beforeEach(() => { jest.clearAllMocks(); config(); });

test('carrega a ficha e insumos, mantendo o modo padrão sem ativar receita automaticamente', async () => {
  await carregar();
  expect(api.get).toHaveBeenCalledWith('/produtos/8/ficha-tecnica');
  expect(api.get).toHaveBeenCalledWith('/insumos');
  expect(screen.getByLabelText('Controle de estoque', { selector: 'select' })).toHaveValue('produto');
  expect(screen.queryByRole('button', { name: 'Adicionar insumo' })).not.toBeInTheDocument();
  expect(api.put).not.toHaveBeenCalled();
});

test('ativa uma composição com quantidade decimal e envia apenas o contrato da API', async () => {
  api.put.mockResolvedValue({ data: { produtoId: 8, porIngredientes: true, componentes: [componente] } });
  const onSuccess = jest.fn();
  await carregar({ onSuccess });
  ativar(); adicionar();
  expect(screen.getByRole('complementary', { name: 'Resumo da composição' })).toHaveTextContent('0,2 kg');
  expect(screen.getByText(/Não há conversão automática de unidades/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Salvar ficha técnica' }));
  await waitFor(() => expect(onSuccess).toHaveBeenCalledWith({ produtoId: 8, porIngredientes: true, componentes: [componente] }));
  expect(api.put).toHaveBeenCalledWith('/produtos/8/ficha-tecnica', { porIngredientes: true, componentes: [{ insumoId: 1, quantidadePorUnidade: 0.2 }] });
});

test('composição vazia não ativa o modo por ingredientes e foca Adicionar insumo', async () => {
  await carregar(); ativar();
  fireEvent.click(screen.getByRole('button', { name: 'Salvar ficha técnica' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Adicione pelo menos um insumo');
  expect(screen.getByRole('button', { name: 'Adicionar insumo' })).toHaveFocus();
  expect(api.put).not.toHaveBeenCalled();
});

test.each(['0', '-1', '0,0000001', '1e3', 'abc'])('rejeita quantidade inválida %s sem arredondar nem gravar', async (value) => {
  await carregar(); ativar(); adicionar('1', value);
  fireEvent.click(screen.getByRole('button', { name: 'Salvar ficha técnica' }));
  expect(screen.getByLabelText('Quantidade por unidade 1')).toHaveAttribute('aria-invalid', 'true');
  expect(screen.getByLabelText('Quantidade por unidade 1')).toHaveValue(value);
  expect(screen.getByLabelText('Quantidade por unidade 1')).toHaveFocus();
  expect(api.put).not.toHaveBeenCalled();
});

test('uma linha sem insumo foca o seletor e não envia o formulário', async () => {
  await carregar(); ativar(); adicionar('', '0.2');
  fireEvent.click(screen.getByRole('button', { name: 'Salvar ficha técnica' }));
  expect(screen.getByRole('combobox', { name: 'Insumo 1' })).toHaveFocus();
  expect(screen.getByLabelText('Insumo 1', { selector: 'select' })).toHaveAttribute('aria-invalid', 'true');
  expect(api.put).not.toHaveBeenCalled();
});

test('evita selecionar o mesmo insumo em duas linhas e valida dados duplicados', async () => {
  await carregar(); ativar(); adicionar();
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar insumo' }));
  expect(screen.getByLabelText('Insumo 2', { selector: 'select' }).querySelector('option[value="1"]')).toBeDisabled();
  // Mesmo uma mudança sintética deve ser revalidada antes de enviar.
  fireEvent.change(screen.getByLabelText('Insumo 2', { selector: 'select' }), { target: { value: '1' } });
  fireEvent.change(screen.getByLabelText('Quantidade por unidade 2'), { target: { value: '0.1' } });
  fireEvent.click(screen.getByRole('button', { name: 'Salvar ficha técnica' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Este insumo já foi adicionado');
  expect(api.put).not.toHaveBeenCalled();
});

test('desativar mantém a composição já salva, sem salvar um rascunho incompleto', async () => {
  config({ produtoId: 8, porIngredientes: true, componentes: [componente] });
  api.put.mockResolvedValue({ data: { produtoId: 8, porIngredientes: false, componentes: [componente] } });
  await carregar();
  fireEvent.change(screen.getByLabelText('Quantidade por unidade 1'), { target: { value: '' } });
  fireEvent.change(screen.getByLabelText('Controle de estoque', { selector: 'select' }), { target: { value: 'produto' } });
  expect(screen.getByLabelText('Quantidade por unidade 1')).toHaveValue('0.2');
  expect(screen.getByLabelText('Quantidade por unidade 1')).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Salvar ficha técnica' }));
  await waitFor(() => expect(api.put).toHaveBeenCalledWith('/produtos/8/ficha-tecnica', { porIngredientes: false, componentes: [{ insumoId: 1, quantidadePorUnidade: 0.2 }] }));
});

test('remove a linha correta e mantém a outra quantidade sem reaproveitar o campo', async () => {
  await carregar(); ativar(); adicionar();
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar insumo' }));
  fireEvent.change(screen.getByLabelText('Insumo 2', { selector: 'select' }), { target: { value: '2' } });
  fireEvent.change(screen.getByLabelText('Quantidade por unidade 2'), { target: { value: '0.35' } });
  fireEvent.click(screen.getByRole('button', { name: 'Remover ingrediente 1' }));
  expect(screen.getByLabelText('Insumo 1', { selector: 'select' })).toHaveValue('2');
  expect(screen.getByLabelText('Quantidade por unidade 1')).toHaveValue('0.35');
  expect(screen.getByRole('button', { name: 'Adicionar insumo' })).toHaveFocus();
});

test('erro de conflito preserva a ficha e mostra a orientação devolvida pelo backend', async () => {
  const message = 'Conclua ou cancele as comandas abertas antes de alterar a ficha técnica.';
  api.put.mockRejectedValue({ response: { status: 409, data: { message } } });
  await carregar(); ativar(); adicionar();
  fireEvent.click(screen.getByRole('button', { name: 'Salvar ficha técnica' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(message);
  expect(screen.getByLabelText('Quantidade por unidade 1')).toHaveValue('0,2');
  expect(screen.getByRole('button', { name: 'Salvar ficha técnica' })).toBeEnabled();
});

test('bloqueia envio duplicado, cancelamento e campos durante o salvamento', async () => {
  let resolver;
  api.put.mockImplementation(() => new Promise((resolve) => { resolver = resolve; }));
  const onSavingChange = jest.fn(); const onCancel = jest.fn();
  await carregar({ onSavingChange, onCancel }); ativar(); adicionar();
  const form = screen.getByRole('form');
  fireEvent.submit(form); fireEvent.submit(form);
  expect(api.put).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Voltar' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Salvando…' })).toBeDisabled();
  expect(screen.getByLabelText('Quantidade por unidade 1')).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));
  expect(onCancel).not.toHaveBeenCalled();
  expect(onSavingChange).toHaveBeenLastCalledWith(true);
  await act(async () => resolver({ data: { produtoId: 8, porIngredientes: true, componentes: [componente] } }));
  expect(onSavingChange).toHaveBeenLastCalledWith(false);
});

test('falha de carregamento não permite gravar, oferece nova tentativa e Voltar', async () => {
  api.get.mockRejectedValueOnce({ response: { status: 500 } });
  const onCancel = jest.fn();
  render(<FichaTecnicaForm produto={produto} onCancel={onCancel} />);
  expect(await screen.findByRole('alert')).toHaveTextContent('O servidor não conseguiu concluir a operação. Tente novamente mais tarde.');
  expect(screen.queryByRole('button', { name: 'Salvar ficha técnica' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
  await screen.findByRole('button', { name: 'Salvar ficha técnica' });
  fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));
  expect(onCancel).toHaveBeenCalledTimes(1);
  expect(api.put).not.toHaveBeenCalled();
});
