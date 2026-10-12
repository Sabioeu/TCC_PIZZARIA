import React, { useId, useMemo, useState } from 'react';
import Icon from './Icon';
import Select from './Select';
import './DataTable.css';

export const normalizeSearch = (value) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
const read = (row, key) => typeof key === 'function' ? key(row) : String(key).split('.').reduce((value, part) => value?.[part], row);
const collator = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });

export default function DataTable({ title, description, rows = [], columns, searchKeys = [], searchPlaceholder = 'Digite para buscar...', loading = false, error, onRetry, emptyTitle = 'Nenhum registro encontrado', emptyDescription = 'Os registros aparecerão aqui.', rowKey = 'id', defaultSort, toolbar, pageSize: initialPageSize = 10 }) {
  const id = useId();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState(defaultSort || { key: '', direction: 'asc' });
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(initialPageSize);
  const data = useMemo(() => {
    const terms = normalizeSearch(query).trim().split(/\s+/).filter(Boolean);
    const filtered = rows.filter((row) => {
      const text = normalizeSearch(searchKeys.map((key) => read(row, key)).join(' '));
      return terms.every((term) => text.includes(term));
    });
    const column = columns.find((item) => item.key === sort.key && item.sortable !== false);
    if (!column) return filtered;
    return filtered.map((row, index) => ({ row, index })).sort((a, b) => {
      const left = read(a.row, column.value || column.key);
      const right = read(b.row, column.value || column.key);
      const comparison = typeof left === 'number' && typeof right === 'number' ? left - right : collator.compare(String(left ?? ''), String(right ?? ''));
      return (sort.direction === 'desc' ? -comparison : comparison) || a.index - b.index;
    }).map(({ row }) => row);
  }, [rows, columns, searchKeys, query, sort]);
  const pages = Math.max(1, Math.ceil(data.length / size));
  const current = Math.min(page, pages);
  const start = (current - 1) * size;
  const selectedRows = data.slice(start, start + size);
  const changeSort = (key) => { setSort((previous) => ({ key, direction: previous.key === key && previous.direction === 'asc' ? 'desc' : 'asc' })); setPage(1); };

  return <section className="panel data-list" aria-labelledby={`${id}-title`} aria-busy={loading}>
    <div className="panel-header data-list-heading"><div><h2 className="panel-title" id={`${id}-title`}>{title}</h2>{description && <p className="panel-subtitle">{description}</p>}</div><span className="data-list-count">{rows.length} registros</span></div>
    {(searchKeys.length > 0 || toolbar) && <div className="data-list-toolbar">
      {searchKeys.length > 0 && <div className="data-list-search"><Icon name="search" size={17} /><input type="search" aria-label={`Buscar em ${title}`} placeholder={searchPlaceholder} value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} /></div>}
      {toolbar && <div className="data-list-filters">{toolbar}</div>}
    </div>}
    {error && <div className="data-list-error"><div className="alert alert-error" role="alert"><Icon name="alert" size={17} /><span>{error}</span>{onRetry && <button className="button button-sm" disabled={loading} onClick={onRetry} type="button">Tentar novamente</button>}</div></div>}
    {loading ? <div className="table-loading" role="status"><span className="sr-only">Carregando {title}...</span>{[0, 1, 2, 3].map((index) => <div className="table-skeleton" key={index}><span /><span /><span /></div>)}</div> : data.length === 0 ? <div className="empty-state"><div><div className="empty-state-icon"><Icon name={query ? 'search' : 'reports'} /></div><strong>{query ? 'Nenhum resultado para sua busca' : emptyTitle}</strong><p>{query ? 'Experimente outro termo ou limpe a busca.' : emptyDescription}</p>{query && <button className="button button-sm" onClick={() => { setQuery(''); setPage(1); }} type="button">Limpar busca</button>}</div></div> : <>
      <div className="table-scroll-hint" aria-hidden="true">Deslize a tabela para consultar todas as colunas →</div>
      <div className="table-wrap" role="region" aria-label={`Tabela ${title}`} tabIndex={0}>
        <table className="data-table"><caption className="sr-only">{title}</caption><thead><tr>{columns.map((column) => <th key={column.key} scope="col" style={{ textAlign: column.align || 'left' }} aria-sort={column.sortable === false ? undefined : sort.key === column.key ? sort.direction === 'asc' ? 'ascending' : 'descending' : 'none'}>
          {column.sortable === false ? column.label : <button type="button" className={`table-sort ${sort.key === column.key ? 'is-sorted' : ''}`} onClick={() => changeSort(column.key)} aria-label={`Ordenar por ${column.label}`}><span>{column.label}</span><span aria-hidden="true">{sort.key === column.key ? sort.direction === 'asc' ? '↑' : '↓' : '↕'}</span></button>}
        </th>)}</tr></thead><tbody>{selectedRows.map((row, index) => <tr key={read(row, rowKey) ?? start + index}>{columns.map((column) => <td key={column.key} data-label={column.label} style={{ textAlign: column.align || 'left' }}>{column.render ? column.render(row) : read(row, column.value || column.key) ?? '—'}</td>)}</tr>)}</tbody></table>
      </div>
      <div className="data-list-pagination"><div className="pagination-summary" role="status">{start + 1}–{Math.min(start + size, data.length)} de {data.length}{query && ` · ${rows.length} no total`}</div><div className="pagination-controls"><Select aria-label={`Registros por página em ${title}`} value={size} onChange={(event) => { setSize(Number(event.target.value)); setPage(1); }}>{[10, 20, 50].map((value) => <option key={value} value={value}>{value} por página</option>)}</Select><button className="button button-sm" aria-label={`Página anterior de ${title}`} disabled={current === 1} onClick={() => setPage(current - 1)} type="button"><span aria-hidden="true">←</span></button><span className="pagination-page">{current} / {pages}</span><button className="button button-sm" aria-label={`Próxima página de ${title}`} disabled={current === pages} onClick={() => setPage(current + 1)} type="button"><span aria-hidden="true">→</span></button></div></div>
    </>}
  </section>;
}
