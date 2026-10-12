import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ClienteForm from './ClienteForm';
import ProdutoForm from './ProdutoForm';
import InsumoForm from './InsumoForm';
import UsuarioForm from './UsuarioForm';
import api from '../api/api';

jest.mock('../api/api', () => ({ __esModule: true, default: { put: jest.fn(), post: jest.fn() } }));
beforeEach(() => { jest.clearAllMocks(); });

test.each([
  ['cliente', ClienteForm, 'clienteParaEdicao', { id: 1, nome: 'João', cpf: '12345678901', telefone: '44999999999', endereco: 'Rua Central' }],
  ['produto', ProdutoForm, 'produtoParaEdicao', { id: 1, nome: 'Pizza', preco: 25, descricao: 'Queijo' }],
  ['insumo', InsumoForm, 'insumoParaEdicao', { id: 1, nome: 'Farinha', quantidade: 10, unidade: 'kg' }],
  ['usuário', UsuarioForm, 'usuarioParaEdicao', { id: 1, nome: 'Ana', email: 'ana@example.com', perfil: 'ATENDENTE', ativo: true }],
])('formulário de %s bloqueia envio duplicado e edição durante processamento', async (label, Form, propName, registro) => {
  let concluir;
  api.put.mockImplementation(() => new Promise((resolve) => { concluir = resolve; }));
  const sucesso = jest.fn();
  render(<Form {...{ [propName]: registro }} onEdicaoSucesso={sucesso} />);
  fireEvent.submit(screen.getByRole('form'));
  fireEvent.submit(screen.getByRole('form'));
  expect(api.put).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Salvando...' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Cancelar edição' })).toBeDisabled();
  concluir({ data: registro });
  await waitFor(() => expect(sucesso).toHaveBeenCalledWith(registro));
  expect(screen.getByRole('button', { name: 'Salvar alterações' })).toBeEnabled();
});

test('erro preserva campos e limpar remove os dados e a mensagem', async () => {
  api.post.mockRejectedValue({ response: { status: 409, data: { message: 'Produto já cadastrado.' } } });
  render(<ProdutoForm />);
  fireEvent.change(screen.getByLabelText('Nome do produto'), { target: { value: 'Pizza' } });
  fireEvent.change(screen.getByLabelText('Preço de venda'), { target: { value: '25' } });
  fireEvent.submit(screen.getByRole('form'));
  expect(await screen.findByRole('alert')).toHaveTextContent('Produto já cadastrado.');
  expect(screen.getByLabelText('Nome do produto')).toHaveValue('Pizza');
  fireEvent.click(screen.getByRole('button', { name: 'Limpar campos' }));
  expect(screen.getByLabelText('Nome do produto')).toHaveValue('');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('cliente exibe máscaras e envia CPF sem pontuação, sem exigir dígito verificador', async () => {
  api.post.mockResolvedValue({ data: { id: 2 } });
  render(<ClienteForm />);
  fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: ' Maria ' } });
  fireEvent.change(screen.getByLabelText('CPF'), { target: { value: '00000000000' } });
  fireEvent.change(screen.getByLabelText('Telefone'), { target: { value: '44999999999' } });
  fireEvent.change(screen.getByLabelText('Endereço'), { target: { value: 'Rua Central, 10' } });
  expect(screen.getByLabelText('CPF')).toHaveValue('000.000.000-00');
  expect(screen.getByLabelText('Telefone')).toHaveValue('(44) 99999-9999');
  fireEvent.submit(screen.getByRole('form'));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith('/clientes', { nome: 'Maria', cpf: '00000000000', telefone: '(44) 99999-9999', endereco: 'Rua Central, 10' }));
});

test('validação de cliente mostra erro por campo e foca primeiro erro antes de qualquer envio', () => {
  render(<ClienteForm />);
  fireEvent.submit(screen.getByRole('form'));
  expect(api.post).not.toHaveBeenCalled();
  const nome = screen.getByLabelText('Nome completo');
  expect(nome).toHaveFocus();
  expect(nome).toHaveAttribute('aria-invalid', 'true');
  expect(nome).toHaveAccessibleDescription('Informe o nome completo.');
  expect(screen.getByLabelText('CPF')).toHaveAccessibleDescription(expect.stringContaining('Informe os 11 números do CPF.'));
  fireEvent.change(nome, { target: { value: 'Cliente' } });
  expect(nome).not.toHaveAttribute('aria-invalid', 'true');
});

test('formulário em painel volta pelo callback e não apaga o registro', () => {
  const cancelar = jest.fn();
  render(<ProdutoForm produtoParaEdicao={{ id: 1, nome: 'Pizza', preco: 30 }} onCancel={cancelar} />);
  fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));
  expect(cancelar).toHaveBeenCalledTimes(1);
  expect(screen.getByLabelText('Nome do produto')).toHaveValue('Pizza');
  expect(api.put).not.toHaveBeenCalled();
});

test('edição de insumo preserva unidade legada e deixa claro ajuste do saldo', async () => {
  api.put.mockResolvedValue({ data: { id: 1 } });
  render(<InsumoForm insumoParaEdicao={{ id: 1, nome: 'Molho', quantidade: 3, unidade: 'ml' }} />);
  expect(screen.getByRole('combobox')).toBeDisabled();
  expect(screen.getByText('A unidade não pode ser trocada para preservar o histórico.')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Quantidade em estoque'), { target: { value: '4' } });
  fireEvent.submit(screen.getByRole('form'));
  await waitFor(() => expect(api.put).toHaveBeenCalledWith('/insumos/1', { nome: 'Molho', quantidade: 4, unidade: 'ml' }));
});

test('usuário não envia senha acima do limite UTF-8 aceito pelo backend', () => {
  render(<UsuarioForm />);
  fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Ana' } });
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'ana@example.com' } });
  fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'é'.repeat(37) } });
  fireEvent.submit(screen.getByRole('form'));
  expect(api.post).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Senha')).toHaveAttribute('aria-invalid', 'true');
  expect(screen.getByLabelText('Senha')).toHaveFocus();
  expect(screen.getByRole('alert')).toHaveTextContent('72 bytes');
});

test('edição de insumo preserva saldo fracionário deixado pela ficha técnica sem arredondar', async () => {
  api.put.mockResolvedValue({ data: { id: 1 } });
  render(<InsumoForm insumoParaEdicao={{ id: 1, nome: 'Queijo', quantidade: 0.099999, unidade: 'kg' }} />);
  expect(screen.getByLabelText('Quantidade em estoque')).toHaveAttribute('step', '0.000001');
  fireEvent.change(screen.getByLabelText('Nome do insumo'), { target: { value: 'Queijo revisado' } });
  fireEvent.submit(screen.getByRole('form'));
  await waitFor(() => expect(api.put).toHaveBeenCalledWith('/insumos/1', { nome: 'Queijo revisado', quantidade: 0.099999, unidade: 'kg' }));
});

test('edição de cliente preserva telefone internacional existente', async () => {
  api.put.mockResolvedValue({ data: { id: 1 } });
  render(<ClienteForm clienteParaEdicao={{ id: 1, nome: 'Ana', cpf: '12345678901', telefone: '+55 44 99999-9999', endereco: 'Rua Central' }} />);
  fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: 'Ana Silva' } });
  fireEvent.submit(screen.getByRole('form'));
  await waitFor(() => expect(api.put).toHaveBeenCalledWith('/clientes/1', expect.objectContaining({ telefone: '+55 44 99999-9999' })));
});

test('produto rejeita fração de centavo sem modificar o valor digitado', () => {
  render(<ProdutoForm />);
  fireEvent.change(screen.getByLabelText('Nome do produto'), { target: { value: 'Pizza' } });
  fireEvent.change(screen.getByLabelText('Preço de venda'), { target: { value: '10.001' } });
  fireEvent.submit(screen.getByRole('form'));
  expect(api.post).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Preço de venda')).toHaveValue(10.001);
  expect(screen.getByRole('alert')).toHaveTextContent('duas casas decimais');
});
