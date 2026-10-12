import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import UsuarioForm from './UsuarioForm';
import api from '../api/api';
jest.mock('../api/api', () => ({ __esModule: true, default: { put: jest.fn() } }));
test('administrador pode aprovar usuário sem alterar a senha', async () => {
  const usuario = { id: 2, nome: 'Novo atendente', email: 'novo@teste.com', perfil: 'ATENDENTE', ativo: false };
  const sucesso = jest.fn(); api.put.mockResolvedValue({ data: { ...usuario, ativo: true } });
  render(<UsuarioForm usuarioParaEdicao={usuario} onEdicaoSucesso={sucesso} />);
  fireEvent.change(screen.getByDisplayValue('Bloqueado / aguardando aprovação'), { target: { value: 'ativo' } });
  fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));
  await waitFor(() => expect(api.put).toHaveBeenCalledWith('/usuarios/2', { nome: usuario.nome, email: usuario.email, perfil: 'ATENDENTE', ativo: true }));
  expect(sucesso).toHaveBeenCalledWith(expect.objectContaining({ ativo: true }));
});
