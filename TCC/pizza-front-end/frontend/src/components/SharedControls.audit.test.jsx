import React, { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfirmDialog from './ConfirmDialog';
import Modal from './Modal';
import Select from './Select';

function Exclusao() {
  const [registro, setRegistro] = useState(true);
  const [confirmacao, setConfirmacao] = useState(false);
  return <main id="main-content" tabIndex={-1}>
    {registro && <button onClick={() => setConfirmacao(true)}>Excluir registro</button>}
    {confirmacao && <ConfirmDialog title="Excluir?" description="Confirme a exclusão." onCancel={() => setConfirmacao(false)} onConfirm={() => { setRegistro(false); setConfirmacao(false); }} />}
  </main>;
}

test('confirmação devolve foco ao conteúdo quando o botão de origem foi removido', async () => {
  render(<Exclusao />);
  userEvent.click(screen.getByRole('button', { name: 'Excluir registro' }));
  userEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
  await waitFor(() => expect(document.getElementById('main-content')).toHaveFocus());
});

test('confirmação cancelada devolve foco ao botão de origem conectado', async () => {
  render(<Exclusao />);
  const origem = screen.getByRole('button', { name: 'Excluir registro' });
  userEvent.click(origem);
  userEvent.click(screen.getByRole('button', { name: 'Voltar' }));
  await waitFor(() => expect(origem).toHaveFocus());
});

test('opções atualizadas não mantêm referência ARIA para uma opção que deixou de existir', () => {
  const { rerender } = render(<Select aria-label="Mesa" value="3"><option value="1">Mesa 1</option><option value="2">Mesa 2</option><option value="3">Mesa 3</option></Select>);
  userEvent.click(screen.getByRole('combobox', { name: 'Mesa' }));
  rerender(<Select aria-label="Mesa" value="1"><option value="1">Mesa 1</option></Select>);
  const referencia = screen.getByRole('combobox', { name: 'Mesa' }).getAttribute('aria-activedescendant');
  expect(!referencia || document.getElementById(referencia)).toBeTruthy();
});

test('fieldset desabilitado também impede abrir lista por teclado', () => {
  render(<fieldset disabled><Select aria-label="Perfil"><option value="A">Atendente</option><option value="G">Gerente</option></Select></fieldset>);
  const controle = screen.getByRole('combobox', { name: 'Perfil' });
  expect(controle).toBeDisabled();
  fireEvent.keyDown(controle, { key: 'ArrowDown' });
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
});

test('Escape fecha primeiro a lista pesquisável e não o modal', () => {
  const fechar = jest.fn();
  render(<Modal title="Cadastrar pedido" onClose={fechar}><Select aria-label="Cliente">{Array.from({ length: 8 }, (_, index) => <option value={index} key={index}>Cliente {index}</option>)}</Select></Modal>);
  userEvent.click(screen.getByRole('combobox', { name: 'Cliente' }));
  const pesquisa = screen.getByRole('combobox', { name: 'Buscar em Cliente' });
  expect(pesquisa).toHaveFocus();
  fireEvent.keyDown(pesquisa, { key: 'Escape' });
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  expect(fechar).not.toHaveBeenCalled();
  expect(screen.getByRole('combobox', { name: 'Cliente' })).toHaveFocus();
  fireEvent.keyDown(document.activeElement, { key: 'Escape' });
  expect(fechar).toHaveBeenCalledTimes(1);
});

test('Tab fecha a lista e deixa o foco de volta no controle para prosseguir no formulário', () => {
  render(<Modal title="Cadastro" onClose={jest.fn()}><Select aria-label="Cliente">{Array.from({ length: 8 }, (_, index) => <option value={index} key={index}>Cliente {index}</option>)}</Select><input aria-label="Contato" /></Modal>);
  userEvent.click(screen.getByRole('combobox', { name: 'Cliente' }));
  fireEvent.keyDown(screen.getByRole('combobox', { name: 'Buscar em Cliente' }), { key: 'Tab' });
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  expect(screen.getByRole('combobox', { name: 'Cliente' })).toHaveFocus();
  userEvent.tab();
  expect(screen.getByRole('textbox', { name: 'Contato' })).toHaveFocus();
});

test('modal prende navegação por Tab e Shift+Tab no conteúdo', () => {
  render(<><button>Fora do modal</button><Modal title="Cadastro" onClose={jest.fn()}><input aria-label="Nome" /><button>Salvar</button></Modal></>);
  expect(screen.getByRole('button', { name: 'Fechar' })).toHaveFocus();
  userEvent.tab();
  expect(screen.getByRole('textbox', { name: 'Nome' })).toHaveFocus();
  userEvent.tab();
  expect(screen.getByRole('button', { name: 'Salvar' })).toHaveFocus();
  userEvent.tab();
  expect(screen.getByRole('button', { name: 'Fechar' })).toHaveFocus();
  userEvent.tab({ shift: true });
  expect(screen.getByRole('button', { name: 'Salvar' })).toHaveFocus();
});
