import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import CadastroClientePage from './CadastroClientePage';
import CadastroProdutoPage from './CadastroProdutoPage';
import CadastroInsumoPage from './CadastroInsumoPage';
import CadastroUsuarioPage from './CadastroUsuarioPage';
import CadastroFornecedorPage from './CadastroFornecedorPage';
import api from '../api/api';

jest.mock('../api/api', () => ({ __esModule: true, default: { get: jest.fn(), delete: jest.fn(), post: jest.fn(), put: jest.fn() } }));
beforeEach(() => { jest.clearAllMocks(); });

test.each([
  ['clientes', CadastroClientePage, { cpf: '123', telefone: '44999999999', endereco: 'Rua Central' }],
  ['produtos', CadastroProdutoPage, { preco: 20, quantidade: 5 }],
  ['insumos', CadastroInsumoPage, { quantidade: 10, unidade: 'kg' }],
  ['usuarios', CadastroUsuarioPage, { email: 'teste@example.com', perfil: 'ATENDENTE', ativo: false }],
  ['fornecedores', CadastroFornecedorPage, { cnpjCpf: '123', ativo: true }],
])('cadastro de %s oferece busca sem acentos e restaura a lista ao limpar', async (endpoint, Page, props) => {
  api.get.mockResolvedValue({ data: [{ id: 1, nome: 'Água Mineral', ...props }, { id: 2, nome: 'Outro registro', ...props }] });
  render(<Page />);
  await screen.findByText('Água Mineral');
  expect(api.get).toHaveBeenCalledWith(`/${endpoint}`);
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'agua' } });
  expect(screen.getByText('Água Mineral')).toBeInTheDocument();
  expect(screen.queryByText('Outro registro')).not.toBeInTheDocument();
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'não existe' } });
  expect(screen.getByText('Nenhum resultado para sua busca')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Limpar busca' }));
  expect(screen.getByText('Outro registro')).toBeInTheDocument();
});

test('exclusão pede confirmação, mantém erro para tentar novamente e só remove após sucesso', async () => {
  api.get.mockResolvedValue({ data: [{ id: 1, nome: 'João', cpf: '123', telefone: '4499' }] });
  api.delete.mockRejectedValueOnce({ response: { status: 409, data: { message: 'Cliente associado a pedido.' } } });
  render(<CadastroClientePage />);
  await screen.findByText('João');
  fireEvent.click(screen.getByRole('button', { name: 'Excluir cliente João' }));
  expect(api.delete).not.toHaveBeenCalled();
  fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Excluir cliente' }));
  expect(await screen.findByText('Cliente associado a pedido.')).toBeInTheDocument();
  expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  expect(screen.getByText('João')).toBeInTheDocument();
  api.delete.mockResolvedValueOnce({});
  fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Excluir cliente' }));
  await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  expect(screen.queryByText('João')).not.toBeInTheDocument();
  expect(api.delete).toHaveBeenCalledTimes(2);
});

test('cancelar exclusão não chama a API e edição pode ser cancelada', async () => {
  api.get.mockResolvedValue({ data: [{ id: 1, nome: 'João', cpf: '123', telefone: '4499' }] });
  render(<CadastroClientePage />);
  await screen.findByText('João');
  fireEvent.click(screen.getByRole('button', { name: 'Excluir cliente João' }));
  fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Voltar' }));
  expect(api.delete).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Editar cliente João' }));
  expect(screen.getByLabelText('Nome completo')).toHaveValue('João');
  fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(screen.queryByLabelText('Nome completo')).not.toBeInTheDocument();
});

test('falha ao carregar oferece uma nova tentativa', async () => {
  api.get.mockRejectedValueOnce({ response: { status: 500 } }).mockResolvedValueOnce({ data: [{ id: 1, nome: 'João' }] });
  render(<CadastroClientePage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Tentar novamente' }));
  expect(await screen.findByText('João')).toBeInTheDocument();
  expect(api.get).toHaveBeenCalledTimes(2);
});

test('exclusão em andamento bloqueia cliques repetidos e o fechamento', async () => {
  let concluir;
  api.get.mockResolvedValue({ data: [{ id: 1, nome: 'João' }] });
  api.delete.mockImplementation(() => new Promise((resolve) => { concluir = resolve; }));
  render(<CadastroClientePage />);
  await screen.findByText('João');
  fireEvent.click(screen.getByRole('button', { name: 'Excluir cliente João' }));
  fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Excluir cliente' }));
  const processando = within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Processando...' });
  fireEvent.click(processando);
  expect(processando).toBeDisabled();
  expect(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Voltar' })).toBeDisabled();
  expect(api.delete).toHaveBeenCalledTimes(1);
  concluir({});
  await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
});

test('fornecedor não envia em duplicidade nem troca o registro durante salvamento', async () => {
  let concluir;
  api.get.mockResolvedValue({ data: [{ id: 1, nome: 'Fornecedor existente', cnpjCpf: '123', ativo: true }] });
  api.post.mockImplementation(() => new Promise((resolve) => { concluir = resolve; }));
  render(<CadastroFornecedorPage />);
  await screen.findByText('Fornecedor existente');
  fireEvent.click(screen.getByRole('button', { name: 'Novo fornecedor' }));
  fireEvent.change(screen.getByLabelText('Razão social / nome'), { target: { value: 'Novo parceiro' } });
  fireEvent.change(screen.getByLabelText('CNPJ / CPF'), { target: { value: '456' } });
  fireEvent.submit(screen.getByRole('form', { name: 'Formulário de fornecedor' }));
  fireEvent.submit(screen.getByRole('form', { name: 'Formulário de fornecedor' }));
  expect(api.post).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Editar fornecedor Fornecedor existente', hidden: true })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Voltar' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Fechar cadastro' })).toBeDisabled();
  concluir({ data: { id: 2, nome: 'Novo parceiro', cnpjCpf: '456', ativo: true } });
  expect(await screen.findByText('Novo parceiro')).toBeInTheDocument();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Razão social / nome')).not.toBeInTheDocument();
});

test.each([
  ['cliente', CadastroClientePage, 'Nome completo'],
  ['produto', CadastroProdutoPage, 'Nome do produto'],
  ['insumo', CadastroInsumoPage, 'Nome do insumo'],
  ['usuário', CadastroUsuarioPage, 'Nome'],
  ['fornecedor', CadastroFornecedorPage, 'Razão social / nome'],
])('novo %s abre um painel focado e Voltar devolve o foco sem gravar', async (tipo, Page, fieldLabel) => {
  api.get.mockResolvedValue({ data: [] });
  render(<Page />);
  await waitFor(() => expect(screen.queryByText('Carregando registros...')).not.toBeInTheDocument());
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.queryByLabelText(fieldLabel)).not.toBeInTheDocument();
  const novo = screen.getByRole('button', { name: `Novo ${tipo}` });
  novo.focus();
  fireEvent.click(novo);
  expect(screen.getByRole('dialog', { name: `Novo ${tipo}` })).toBeInTheDocument();
  await waitFor(() => expect(screen.getByLabelText(fieldLabel)).toHaveFocus());
  fireEvent.change(screen.getByLabelText(fieldLabel), { target: { value: 'Cadastro não salvo' } });
  fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(novo).toHaveFocus();
  expect(api.post).not.toHaveBeenCalled();
  expect(api.put).not.toHaveBeenCalled();
});

test('produto criado fecha o painel, atualiza a tabela e abre o próximo cadastro vazio', async () => {
  api.get.mockResolvedValue({ data: [] });
  api.post.mockResolvedValueOnce({ data: { id: 8, nome: 'Pizza Portuguesa', preco: 45, descricao: '', quantidade: 0 } });
  render(<CadastroProdutoPage />);
  await screen.findByText('Nenhum produto cadastrado');
  fireEvent.click(screen.getByRole('button', { name: 'Novo produto' }));
  fireEvent.change(screen.getByLabelText('Nome do produto'), { target: { value: 'Pizza Portuguesa' } });
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Preço de venda' }), { target: { value: '45' } });
  fireEvent.click(screen.getByRole('button', { name: 'Cadastrar produto' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(screen.getByText('Pizza Portuguesa')).toBeInTheDocument();
  expect(api.post).toHaveBeenCalledWith('/produtos', { nome: 'Pizza Portuguesa', preco: 45, descricao: '' });
  fireEvent.click(screen.getByRole('button', { name: 'Novo produto' }));
  expect(screen.getByLabelText('Nome do produto')).toHaveValue('');
});

test('falha ao editar produto mantém os dados no painel e só fecha após salvar com sucesso', async () => {
  api.get.mockResolvedValue({ data: [{ id: 3, nome: 'Pizza Queijo', preco: 30, descricao: 'Original', quantidade: 5 }] });
  api.put.mockRejectedValueOnce({ response: { status: 409, data: { message: 'Produto não pôde ser atualizado.' } } });
  render(<CadastroProdutoPage />);
  await screen.findByText('Pizza Queijo');
  fireEvent.click(screen.getByRole('button', { name: 'Editar produto Pizza Queijo' }));
  expect(screen.getByRole('dialog', { name: 'Editar produto' })).toBeInTheDocument();
  expect(screen.getByLabelText('Descrição')).toHaveValue('Original');
  fireEvent.change(screen.getByLabelText('Nome do produto'), { target: { value: 'Pizza Quatro Queijos' } });
  fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));
  expect(await screen.findByText('Produto não pôde ser atualizado.')).toBeInTheDocument();
  expect(screen.getByLabelText('Nome do produto')).toHaveValue('Pizza Quatro Queijos');
  api.put.mockResolvedValueOnce({ data: { id: 3, nome: 'Pizza Quatro Queijos', preco: 30, descricao: 'Original', quantidade: 5 } });
  fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(screen.getByText('Pizza Quatro Queijos')).toBeInTheDocument();
  expect(screen.queryByText('Pizza Queijo')).not.toBeInTheDocument();
});

test('produto em salvamento bloqueia Escape, fechamento e envios repetidos', async () => {
  let concluir;
  api.get.mockResolvedValue({ data: [] });
  api.post.mockImplementation(() => new Promise((resolve) => { concluir = resolve; }));
  render(<CadastroProdutoPage />);
  await screen.findByText('Nenhum produto cadastrado');
  fireEvent.click(screen.getByRole('button', { name: 'Novo produto' }));
  fireEvent.change(screen.getByLabelText('Nome do produto'), { target: { value: 'Refrigerante' } });
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Preço de venda' }), { target: { value: '6' } });
  fireEvent.submit(screen.getByRole('form', { name: 'Formulário de produto' }));
  fireEvent.submit(screen.getByRole('form', { name: 'Formulário de produto' }));
  expect(api.post).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Fechar cadastro' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Voltar' })).toBeDisabled();
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  concluir({ data: { id: 4, nome: 'Refrigerante', preco: 6, descricao: '', quantidade: 0 } });
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});

test('fornecedor valida os campos, conserva dados legados na edição e mantém falha no painel', async () => {
  api.get.mockResolvedValue({ data: [{ id: 1, nome: 'Parceiro antigo', cnpjCpf: 'AB-123', telefone: '+351 123 456', email: null, endereco: null, ativo: false }] });
  api.put.mockRejectedValueOnce({ response: { status: 409, data: { message: 'Não foi possível atualizar este parceiro.' } } });
  render(<CadastroFornecedorPage />);
  await screen.findByText('Parceiro antigo');
  fireEvent.click(screen.getByRole('button', { name: 'Novo fornecedor' }));
  fireEvent.click(screen.getByRole('button', { name: 'Cadastrar fornecedor' }));
  expect(screen.getByLabelText('Razão social / nome')).toHaveAttribute('aria-invalid', 'true');
  expect(screen.getByLabelText('Razão social / nome')).toHaveFocus();
  expect(api.post).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));
  fireEvent.click(screen.getByRole('button', { name: 'Editar fornecedor Parceiro antigo' }));
  expect(screen.getByLabelText('CNPJ / CPF')).toHaveValue('AB-123');
  expect(screen.getByLabelText('CNPJ / CPF')).toBeDisabled();
  expect(screen.getByLabelText('Telefone')).toHaveValue('+351 123 456');
  fireEvent.change(screen.getByLabelText('Razão social / nome'), { target: { value: 'Parceiro atualizado' } });
  fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));
  expect(await screen.findByText('Não foi possível atualizar este parceiro.')).toBeInTheDocument();
  expect(screen.getByLabelText('Razão social / nome')).toHaveValue('Parceiro atualizado');
  expect(api.put).toHaveBeenCalledWith('/fornecedores/1', { id: 1, nome: 'Parceiro atualizado', cnpjCpf: 'AB-123', telefone: '+351 123 456', email: '', endereco: '', ativo: false });
});

test.each([
  [CadastroClientePage, { id: 1, nome: 'Contato encontrado', cpf: '12345678901', telefone: '(44) 99999-1234', endereco: 'Rua Central' }, '123.456.789-01', '12345678901'],
  [CadastroFornecedorPage, { id: 1, nome: 'Contato encontrado', cnpjCpf: '12345678000199', telefone: '(44) 99999-1234', ativo: true }, '12.345.678/0001-99', '12345678000199'],
])('documento e telefone são encontrados com ou sem pontuação', async (Page, item, formatted, digits) => {
  api.get.mockResolvedValue({ data: [item] });
  render(<Page />);
  await screen.findByText('Contato encontrado');
  expect(screen.getByText(formatted)).toBeInTheDocument();
  for (const search of [formatted, digits, '(44) 99999-1234', '44999991234']) {
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: search } });
    expect(screen.getByText('Contato encontrado')).toBeInTheDocument();
  }
});

test('fornecedor aceita o formato de e-mail local permitido anteriormente pelo formulário', async () => {
  api.get.mockResolvedValue({ data: [] });
  api.post.mockResolvedValue({ data: { id: 5, nome: 'Fornecedor local', cnpjCpf: '123', email: 'contato@local', ativo: true } });
  render(<CadastroFornecedorPage />);
  await screen.findByText('Nenhum fornecedor cadastrado');
  fireEvent.click(screen.getByRole('button', { name: 'Novo fornecedor' }));
  fireEvent.change(screen.getByLabelText('Razão social / nome'), { target: { value: 'Fornecedor local' } });
  fireEvent.change(screen.getByLabelText('CNPJ / CPF'), { target: { value: '123' } });
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'contato@local' } });
  fireEvent.click(screen.getByRole('button', { name: 'Cadastrar fornecedor' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(api.post).toHaveBeenCalledWith('/fornecedores', expect.objectContaining({ email: 'contato@local' }));
});
