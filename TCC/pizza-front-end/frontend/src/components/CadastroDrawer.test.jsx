import React, { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CadastroDrawer from './CadastroDrawer';
import Select from './Select';

test('painel identifica cadastro e começa no primeiro campo', () => {
  render(<CadastroDrawer title="Novo cliente" subtitle="Dados do atendimento" onClose={jest.fn()}><input aria-label="Nome completo" /><button>Salvar</button></CadastroDrawer>);
  expect(screen.getByRole('dialog')).toHaveAccessibleName('Novo cliente');
  expect(screen.getByRole('dialog')).toHaveAccessibleDescription('Dados do atendimento');
  expect(screen.getByRole('textbox', { name: 'Nome completo' })).toHaveFocus();
  userEvent.tab();
  expect(screen.getByRole('button', { name: 'Salvar' })).toHaveFocus();
  userEvent.tab();
  expect(screen.getByRole('button', { name: 'Fechar cadastro' })).toHaveFocus();
  userEvent.tab();
  expect(screen.getByRole('textbox', { name: 'Nome completo' })).toHaveFocus();
});

test('busy bloqueia Escape e botão de fechar', () => {
  const close = jest.fn();
  render(<CadastroDrawer busy title="Cliente" onClose={close}><input aria-label="Nome" /></CadastroDrawer>);
  expect(screen.getByRole('dialog')).toHaveAttribute('aria-busy', 'true');
  expect(screen.getByRole('button', { name: 'Fechar cadastro' })).toBeDisabled();
  fireEvent.keyDown(document.activeElement, { key: 'Escape' });
  expect(close).not.toHaveBeenCalled();
});

test('Escape fecha lista antes do cadastro', () => {
  const close = jest.fn();
  render(<CadastroDrawer title="Insumo" onClose={close}><Select aria-label="Fornecedor">{Array.from({ length: 8 }, (_, index) => <option value={index} key={index}>Fornecedor {index}</option>)}</Select></CadastroDrawer>);
  userEvent.click(screen.getByRole('combobox', { name: 'Fornecedor' }));
  fireEvent.keyDown(screen.getByRole('combobox', { name: 'Buscar em Fornecedor' }), { key: 'Escape' });
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  expect(close).not.toHaveBeenCalled();
  fireEvent.keyDown(document.activeElement, { key: 'Escape' });
  expect(close).toHaveBeenCalledTimes(1);
});

test('fechar retorna foco ao botão que abriu o painel', async () => {
  function Harness() {
    const [open, setOpen] = useState(false);
    return <><button onClick={() => setOpen(true)}>Novo cadastro</button>{open && <CadastroDrawer title="Produto" onClose={() => setOpen(false)}><input aria-label="Nome" /></CadastroDrawer>}</>;
  }
  render(<Harness />);
  const trigger = screen.getByRole('button', { name: 'Novo cadastro' });
  userEvent.click(trigger);
  userEvent.click(screen.getByRole('button', { name: 'Fechar cadastro' }));
  await waitFor(() => expect(trigger).toHaveFocus());
});
