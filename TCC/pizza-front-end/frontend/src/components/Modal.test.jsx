import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Modal from './Modal';
import ConfirmDialog from './ConfirmDialog';
import Select from './Select';

test('modal tem título, descrição, foco inicial e fecha com Escape', () => {
  const close = jest.fn();
  render(<Modal title="Cadastro" subtitle="Dados do cliente" onClose={close}><input aria-label="Nome" /></Modal>);
  expect(screen.getByRole('dialog', { name: 'Cadastro' })).toHaveAccessibleDescription('Dados do cliente');
  expect(screen.getByRole('button', { name: 'Fechar' })).toHaveFocus();
  fireEvent.keyDown(document.activeElement, { key: 'Escape' });
  expect(close).toHaveBeenCalledTimes(1);
});

test('operação em andamento bloqueia fechar e Escape', () => {
  const close = jest.fn();
  render(<Modal busy title="Pagamento" onClose={close}><button>Processando</button></Modal>);
  expect(screen.getByRole('button', { name: 'Fechar' })).toBeDisabled();
  fireEvent.keyDown(document.activeElement, { key: 'Escape' });
  expect(close).not.toHaveBeenCalled();
});

test('confirmação inicia no botão seguro e exige ação explícita', () => {
  const confirm = jest.fn(); const cancel = jest.fn();
  render(<ConfirmDialog title="Cancelar atendimento?" description="Sem baixa de estoque." onConfirm={confirm} onCancel={cancel} />);
  expect(screen.getByRole('alertdialog')).toHaveAccessibleName('Cancelar atendimento?');
  expect(screen.getByRole('button', { name: 'Voltar' })).toHaveFocus();
  expect(confirm).not.toHaveBeenCalled();
  userEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
  expect(confirm).toHaveBeenCalledTimes(1);
});

test('lista pesquisável funciona dentro do modal sem perder foco', () => {
  render(<Modal title="Fornecedor" onClose={jest.fn()}><Select aria-label="Fornecedor">{Array.from({ length: 8 }, (_, i) => <option key={i} value={i}>Fornecedor {i}</option>)}</Select></Modal>);
  userEvent.click(screen.getByRole('combobox', { name: 'Fornecedor' }));
  expect(screen.getByRole('combobox', { name: /Buscar/ })).toHaveFocus();
  userEvent.click(screen.getByRole('option', { name: 'Fornecedor 3' }));
  expect(screen.getByRole('combobox', { name: 'Fornecedor' })).toHaveTextContent('Fornecedor 3');
  expect(screen.getByRole('dialog')).toBeInTheDocument();
});
