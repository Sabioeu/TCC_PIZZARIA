import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import Select from './Select';

test('valor removido das opções não diverge entre interface e FormData', () => {
  render(<form aria-label="Valor ausente"><Select aria-label="Produto ausente" name="produto" value="99"><option value="1">Pizza</option></Select></form>);
  expect(screen.getByRole('combobox', { name: 'Produto ausente' })).toHaveTextContent('Selecione uma opção');
  expect(new FormData(screen.getByRole('form', { name: 'Valor ausente' })).get('produto')).toBe('');
});
function Formulario() {
  const [valor, setValor] = useState('');
  return <form aria-label="Teste"><label htmlFor="cliente">Cliente</label><Select id="cliente" name="clienteId" required value={valor} onChange={(e) => setValor(e.target.value)}><option value="">Selecione...</option><option value="1">Davi</option><option value="2">Maria</option></Select></form>;
}
test('seleciona, destaca a opção e mantém os dados do formulário', () => {
  render(<Formulario />);
  fireEvent.click(screen.getByRole('combobox', { name: 'Cliente' }));
  fireEvent.click(screen.getByRole('option', { name: 'Maria' }));
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  expect(screen.getByRole('combobox', { name: 'Cliente' })).toHaveTextContent('Maria');
  expect(new FormData(screen.getByRole('form')).get('clienteId')).toBe('2');
  fireEvent.click(screen.getByRole('combobox', { name: 'Cliente' }));
  expect(screen.getByRole('option', { name: 'Maria' })).toHaveAttribute('aria-selected', 'true');
});
test('navega com teclado e fecha com Escape sem trocar a seleção', () => {
  render(<Formulario />); const controle = screen.getByRole('combobox', { name: 'Cliente' });
  fireEvent.keyDown(controle, { key: 'ArrowDown' });
  fireEvent.keyDown(controle, { key: 'ArrowDown' });
  fireEvent.keyDown(controle, { key: 'Enter' });
  expect(controle).toHaveTextContent('Davi');
  fireEvent.click(controle); fireEvent.keyDown(controle, { key: 'Escape' });
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument(); expect(controle).toHaveTextContent('Davi');
});
test('busca em listas grandes sem diferenciar acentos e informa lista vazia', () => {
  render(<Select aria-label="Fornecedor" value="" onChange={() => {}}><option value="">Selecione</option>{['Água', 'Queijo', 'Tomate', 'Farinha', 'Molho', 'Sal', 'Óleo'].map((label, i) => <option key={label} value={i}>{label}</option>)}</Select>);
  fireEvent.click(screen.getByRole('combobox', { name: 'Fornecedor' }));
  const busca=screen.getByRole('combobox', { name: 'Buscar em Fornecedor' });
  fireEvent.change(busca, { target: { value: 'agua' } });
  expect(screen.getByRole('option', { name: 'Água' })).toBeInTheDocument(); expect(screen.queryByRole('option', { name: 'Queijo' })).not.toBeInTheDocument();
  fireEvent.change(busca, { target: { value: 'inexistente' } }); expect(screen.getByText('Nenhuma opção encontrada')).toBeInTheDocument();
});
test('fecha ao clicar fora e não abre quando desabilitado', () => {
  const { rerender } = render(<Select aria-label="Perfil" value="A"><option value="A">Atendente</option></Select>);
  fireEvent.click(screen.getByRole('combobox', { name: 'Perfil' })); fireEvent.pointerDown(document.body);
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  rerender(<Select aria-label="Perfil" value="A" disabled><option value="A">Atendente</option></Select>);
  expect(screen.getByRole('combobox', { name: 'Perfil' })).toBeDisabled();
});
test('required apresenta orientação e impede seleção de opção desabilitada', () => {
  render(<Formulario />);
  fireEvent.invalid(screen.getByLabelText('Cliente', { selector: 'select' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Selecione uma opção');
  fireEvent.click(screen.getByRole('option', { name: 'Davi' }));
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
test('seletor não controlado funciona com FormData e reset', () => {
  render(<form aria-label="Não controlado"><Select aria-label="Fornecedor" name="fornecedorId" defaultValue=""><option value="">Selecione</option><option value="1">Fornecedor A</option></Select><button type="reset">Limpar</button></form>);
  fireEvent.click(screen.getByRole('combobox', { name: 'Fornecedor' })); fireEvent.click(screen.getByRole('option', { name: 'Fornecedor A' }));
  expect(new FormData(screen.getByRole('form')).get('fornecedorId')).toBe('1');
  fireEvent.click(screen.getByRole('button', { name: 'Limpar' }));
  expect(new FormData(screen.getByRole('form')).get('fornecedorId')).toBe('');
});
