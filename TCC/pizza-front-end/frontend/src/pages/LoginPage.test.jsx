import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from './LoginPage';
import { useAuth } from '../auth/AuthContext';
import api from '../api/api';

jest.mock('../auth/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../api/api', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));

const renderPage = async () => {
  const view = render(<MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}><LoginPage /></MemoryRouter>);
  await act(async () => { await Promise.resolve(); });
  return view;
};
const preencherLogin = (senha = 'SenhaTeste123!') => {
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'novo@teste.com' } });
  fireEvent.change(screen.getByLabelText('Senha'), { target: { value: senha } });
};
const cadastro = () => {
  fireEvent.click(screen.getByRole('button', { name: 'Criar meu login' }));
  preencherLogin();
  fireEvent.change(screen.getByLabelText('Repetir senha'), { target: { value: 'SenhaTeste123!' } });
};

beforeEach(() => {
  jest.clearAllMocks();
  api.get.mockResolvedValue({ data: { precisaAdministrador: false } });
  api.post.mockResolvedValue({ data: {} });
  useAuth.mockReturnValue({ usuario: null, loading: false, entrar: jest.fn().mockResolvedValue(), carregar: jest.fn() });
});

test('cadastro mostra aprovação, impede senhas diferentes e preserva o contrato da API', async () => {
  await renderPage();
  cadastro();
  expect(screen.getByText(/O cadastro cria uma conta de atendente/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Repetir senha'), { target: { value: 'OutraSenha' } });
  fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }));
  expect(screen.getByText('As senhas não coincidem.')).toBeInTheDocument();
  expect(screen.getByLabelText('Repetir senha')).toHaveAttribute('aria-invalid', 'true');
  expect(screen.getByLabelText('Repetir senha')).toHaveFocus();
  expect(api.post).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Repetir senha'), { target: { value: 'SenhaTeste123!' } });
  fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Conta criada! Aguarde a aprovação do administrador');
  expect(screen.getByRole('status')).toHaveTextContent('Seu acesso será de atendente.');
  expect(api.post).toHaveBeenCalledWith('/auth/registro', { email: 'novo@teste.com', senha: 'SenhaTeste123!', confirmarSenha: 'SenhaTeste123!' });
  expect(screen.getByLabelText('Senha')).toHaveValue('');
  expect(screen.queryByLabelText('Repetir senha')).not.toBeInTheDocument();
});

test('login usa as credenciais sem mostrar detalhes internos do servidor', async () => {
  const entrar = jest.fn().mockRejectedValue({ response: { status: 500, data: { message: 'SQL: senha; detalhes privados' } } });
  useAuth.mockReturnValue({ usuario: null, loading: false, entrar });
  await renderPage();
  preencherLogin();
  fireEvent.click(screen.getByRole('button', { name: /Entrar no sistema/ }));
  expect(await screen.findByRole('alert')).toHaveTextContent('O servidor não conseguiu concluir a operação.');
  expect(screen.queryByText(/SQL:/)).not.toBeInTheDocument();
  expect(entrar).toHaveBeenCalledWith('novo@teste.com', 'SenhaTeste123!');
  expect(screen.getByLabelText('E-mail')).toHaveValue('novo@teste.com');
});

test('login não trata credencial inválida como sessão expirada', async () => {
  useAuth.mockReturnValue({ usuario: null, loading: false, entrar: jest.fn().mockRejectedValue({ response: { status: 401 } }) });
  await renderPage(); preencherLogin();
  fireEvent.click(screen.getByRole('button', { name: /Entrar no sistema/ }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Confira o e-mail e a senha');
  expect(screen.getByRole('alert')).toHaveTextContent('aprovação do administrador');
});

test('orienta criação local do primeiro administrador sem cadastro público', async () => {
  api.get.mockResolvedValue({ data: { precisaAdministrador: true } });
  await renderPage();
  expect(await screen.findByText(/O administrador inicial ainda não foi criado/)).toBeInTheDocument();
  expect(screen.getByText('.\\start.ps1 -CriarAdministrador')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Cadastrar administrador/ })).not.toBeInTheDocument();
});

test('mostra e oculta a senha sem alterar o valor ou enviar o formulário', async () => {
  await renderPage(); preencherLogin();
  const input = screen.getByLabelText('Senha');
  expect(input).toHaveAttribute('type', 'password');
  fireEvent.click(screen.getByRole('button', { name: 'Mostrar senha' }));
  expect(input).toHaveAttribute('type', 'text');
  expect(input).toHaveValue('SenhaTeste123!');
  fireEvent.click(screen.getByRole('button', { name: 'Ocultar senha' }));
  expect(input).toHaveAttribute('type', 'password');
  expect(api.post).not.toHaveBeenCalled();
  expect(useAuth.mock.results[0].value.entrar).not.toHaveBeenCalled();
});

test('campos inválidos têm mensagem e foco antes de qualquer requisição', async () => {
  await renderPage();
  fireEvent.submit(screen.getByRole('form', { name: 'Entrar no sistema' }));
  expect(screen.getByText('Informe seu e-mail.')).toBeInTheDocument();
  expect(screen.getByText('Informe sua senha.')).toBeInTheDocument();
  expect(screen.getByLabelText('E-mail')).toHaveFocus();
  expect(useAuth.mock.results[0].value.entrar).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'sem-arroba' } });
  fireEvent.submit(screen.getByRole('form', { name: 'Entrar no sistema' }));
  expect(screen.getByText('Informe um e-mail válido.')).toBeInTheDocument();
});

test.each([
  ['curta', /Use uma senha com pelo menos 8 caracteres/],
  ['á'.repeat(37), /limite de 72 bytes/],
  [' '.repeat(8), /apenas espaços/],
])('cadastro valida a política de senha do backend para %p', async (senha, mensagem) => {
  await renderPage(); cadastro();
  fireEvent.change(screen.getByLabelText('Senha'), { target: { value: senha } });
  fireEvent.change(screen.getByLabelText('Repetir senha'), { target: { value: senha } });
  fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }));
  expect(screen.getByText(mensagem)).toBeInTheDocument();
  expect(screen.getByLabelText('Senha')).toHaveFocus();
  expect(api.post).not.toHaveBeenCalled();
});

test('trocar entre entrar e cadastrar limpa senhas e erros, mantendo o e-mail', async () => {
  await renderPage(); cadastro();
  expect(document.title).toBe('Criar acesso · Modelos Pizza');
  fireEvent.change(screen.getByLabelText('Repetir senha'), { target: { value: 'outra' } });
  fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }));
  expect(screen.getByText('As senhas não coincidem.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Entrar', exact: true }));
  expect(document.title).toBe('Entrar · Modelos Pizza');
  expect(screen.getByLabelText('Senha')).toHaveValue('');
  expect(screen.getByLabelText('E-mail')).toHaveValue('novo@teste.com');
  expect(screen.queryByText('As senhas não coincidem.')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Entrar', exact: true })).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(screen.getByRole('button', { name: 'Criar meu login' }));
  expect(screen.getByLabelText('Repetir senha')).toHaveValue('');
  expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'password');
});

test('login também impede chamadas repetidas enquanto autentica', async () => {
  let concluir;
  const entrar = jest.fn().mockImplementation(() => new Promise((resolve) => { concluir = resolve; }));
  useAuth.mockReturnValue({ usuario: null, loading: false, entrar });
  await renderPage(); preencherLogin();
  const form = screen.getByRole('form', { name: 'Entrar no sistema' });
  fireEvent.submit(form); fireEvent.submit(form);
  expect(entrar).toHaveBeenCalledTimes(1);
  expect(screen.getByLabelText('Senha')).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Criar meu login' })).toBeDisabled();
  await act(async () => concluir());
  expect(screen.getByLabelText('Senha')).toHaveValue('');
  expect(screen.getByRole('button', { name: 'Entrar no sistema' })).not.toBeDisabled();
});

test('envio duplicado é bloqueado e os campos ficam desabilitados enquanto cadastra', async () => {
  let concluir;
  api.post.mockImplementation(() => new Promise((resolve) => { concluir = resolve; }));
  await renderPage(); cadastro();
  const form = screen.getByRole('form', { name: 'Criar conta de atendente' });
  fireEvent.submit(form); fireEvent.submit(form);
  expect(api.post).toHaveBeenCalledTimes(1);
  expect(screen.getByLabelText('E-mail')).toBeDisabled();
  expect(screen.getByLabelText('Senha')).toBeDisabled();
  expect(screen.getByLabelText('Repetir senha')).toBeDisabled();
  expect(screen.getAllByRole('button', { name: 'Mostrar senha' }).every((button) => button.disabled)).toBe(true);
  expect(screen.getByRole('button', { name: 'Entrar', exact: true })).toBeDisabled();
  await act(async () => concluir({ data: {} }));
  expect(await screen.findByRole('status')).toHaveTextContent('Conta criada!');
  expect(screen.getByLabelText('E-mail')).not.toBeDisabled();
});

test('falha no cadastro mantém os dados e permite uma nova tentativa', async () => {
  api.post.mockRejectedValueOnce({ response: { status: 400, data: { message: 'E-mail já cadastrado.' } } });
  await renderPage(); cadastro();
  fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('E-mail já cadastrado.');
  expect(screen.getByLabelText('Senha')).toHaveValue('SenhaTeste123!');
  expect(screen.getByLabelText('Repetir senha')).toHaveValue('SenhaTeste123!');
  expect(screen.getByRole('button', { name: 'Criar conta' })).not.toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }));
  await waitFor(() => expect(api.post).toHaveBeenCalledTimes(2));
  expect(await screen.findByRole('status')).toHaveTextContent('Conta criada!');
});

test('carregamento de sessão bloqueia envio e mantém a opção de tentar conexão', async () => {
  const carregar = jest.fn(); const entrar = jest.fn();
  useAuth.mockReturnValue({ usuario: null, loading: true, erro: 'Servidor indisponível.', carregar, entrar });
  const view = await renderPage();
  expect(screen.getByRole('status')).toHaveTextContent('Verificando sua sessão');
  expect(screen.getByLabelText('E-mail')).toBeDisabled();
  fireEvent.submit(screen.getByRole('form', { name: 'Entrar no sistema' }));
  expect(entrar).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Tentar conexão novamente' })).toBeDisabled();
  useAuth.mockReturnValue({ usuario: null, loading: false, erro: 'Servidor indisponível.', carregar, entrar });
  view.rerender(<MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}><LoginPage /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Tentar conexão novamente' }));
  expect(carregar).toHaveBeenCalledTimes(1);
});
