import { fireEvent, render, screen, within } from '@testing-library/react';
import DataTable from './DataTable';

const columns = [{ key: 'nome', label: 'Nome' }, { key: 'valor', label: 'Valor', value: (row) => Number(row.valor) }];
const rows = Array.from({ length: 25 }, (_, index) => ({ id: index, nome: `Produto ${index + 1}`, valor: index + 1 }));
test('pagina, altera tamanho e mantém total', () => {
  render(<DataTable title="Produtos" rows={rows} columns={columns} searchKeys={['nome']} />);
  expect(screen.getByText('Produto 10')).toBeInTheDocument();
  expect(screen.queryByText('Produto 11')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Próxima página de Produtos' }));
  expect(screen.getByText('Produto 11')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Registros por página em Produtos', { selector: 'select' }), { target: { value: '20' } });
  expect(screen.getByText('Produto 1')).toBeInTheDocument();
  expect(screen.getByText('Produto 20')).toBeInTheDocument();
  expect(screen.queryByText('Produto 21')).not.toBeInTheDocument();
});
test('busca ignora acentos e aceita campos aninhados sem alterar registros', () => {
  const data = [{ id: 1, nome: 'São João', valor: 1, fornecedor: { nome: 'José' } }, { id: 2, nome: 'Maria', valor: 2 }];
  render(<DataTable title="Pessoas" rows={data} columns={columns} searchKeys={['nome', 'fornecedor.nome']} />);
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'sao jose' } });
  expect(screen.getByText('São João')).toBeInTheDocument();
  expect(screen.queryByText('Maria')).not.toBeInTheDocument();
  expect(data).toHaveLength(2);
});
test('ordenação numérica usa valor real e anuncia sentido', () => {
  render(<DataTable title="Produtos" rows={[{ id: 1, nome: 'A', valor: 2 }, { id: 2, nome: 'B', valor: 10 }]} columns={columns} />);
  fireEvent.click(screen.getByRole('button', { name: 'Ordenar por Valor' }));
  expect(within(screen.getAllByRole('row')[1]).getByText('A')).toBeInTheDocument();
  expect(screen.getByRole('columnheader', { name: 'Valor' })).toHaveAttribute('aria-sort', 'ascending');
  fireEvent.click(screen.getByRole('button', { name: 'Ordenar por Valor' }));
  expect(within(screen.getAllByRole('row')[1]).getByText('B')).toBeInTheDocument();
});
test('remoção na última página volta para uma página válida', () => {
  const { rerender } = render(<DataTable title="Produtos" rows={rows} columns={columns} />);
  fireEvent.click(screen.getByRole('button', { name: 'Próxima página de Produtos' }));
  fireEvent.click(screen.getByRole('button', { name: 'Próxima página de Produtos' }));
  rerender(<DataTable title="Produtos" rows={rows.slice(0, 10)} columns={columns} />);
  expect(screen.getByText('Produto 1')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Próxima página de Produtos' })).toBeDisabled();
});
test('busca vazia pode ser limpa e falha tem nova tentativa', () => {
  const retry = jest.fn();
  render(<DataTable title="Produtos" rows={rows} columns={columns} searchKeys={['nome']} error="Falha de conexão" onRetry={retry} />);
  fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' })); expect(retry).toHaveBeenCalledTimes(1);
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'xxxxx' } });
  expect(screen.getByText('Nenhum resultado para sua busca')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Limpar busca' }));
  expect(screen.getByText('Produto 1')).toBeInTheDocument();
});
