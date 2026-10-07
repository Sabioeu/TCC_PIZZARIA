import { podeAcessar } from './AuthContext';
jest.mock('../api/api', () => ({ __esModule: true, default: { get: jest.fn() }, limparCsrf: jest.fn() }));
test('perfis restringem áreas gerenciais sem bloquear atendimento', () => {
  const atendente = { perfil: 'ATENDENTE' };
  expect(podeAcessar(null, '/pedidos')).toBe(false);
  expect(podeAcessar(atendente, '/pedidos')).toBe(true);
  expect(podeAcessar(atendente, '/comandas')).toBe(true);
  expect(podeAcessar(atendente, '/relatorios')).toBe(false);
  expect(podeAcessar(atendente, '/')).toBe(false);
  expect(podeAcessar({ perfil: 'GERENTE' }, '/relatorios')).toBe(true);
  expect(podeAcessar({ perfil: 'GERENTE' }, '/cadastro-usuario')).toBe(false);
  expect(podeAcessar({ perfil: 'ADMINISTRADOR' }, '/cadastro-usuario')).toBe(true);
});
