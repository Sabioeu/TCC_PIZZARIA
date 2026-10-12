import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ToastProvider, useToast } from './ToastProvider';
function Button() { const { notify } = useToast(); return <button type="button" onClick={() => notify('Entrada registrada.', { type: 'success' })}>Avisar</button>; }
test('feedback pode ser dispensado sem bloquear a operação', async () => {
  render(<ToastProvider><Button /></ToastProvider>);
  fireEvent.click(screen.getByRole('button', { name: 'Avisar' }));
  expect(screen.getByText('Tudo certo')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Dispensar aviso' }));
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Dispensar aviso' })).not.toBeInTheDocument());
  expect(screen.getByRole('button', { name: 'Avisar' })).toBeEnabled();
});
test('fila de avisos limita mensagens simultâneas', () => {
  render(<ToastProvider><Button /></ToastProvider>);
  const button = screen.getByRole('button', { name: 'Avisar' });
  for (let i = 0; i < 5; i += 1) fireEvent.click(button);
  expect(screen.getAllByRole('button', { name: 'Dispensar aviso' })).toHaveLength(3);
});
