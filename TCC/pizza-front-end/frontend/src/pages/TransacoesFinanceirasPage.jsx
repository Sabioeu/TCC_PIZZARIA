import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Select from '../components/Select';
import DataTable from '../components/DataTable';
import api from '../api/api';
import Icon from '../components/Icon';
import PageHeader from '../components/PageHeader';
import { formatCurrency, formatDate, localDate, comandaReference, comandaNumber } from '../utils/formatters';
import { apiErrorMessage } from '../utils/apiError';

const paymentLabel = (type) => ({ CREDITO: 'Crédito', DEBITO: 'Débito', DINHEIRO: 'Dinheiro', PIX: 'Pix' }[type] || type);
export default function TransacoesFinanceirasPage() {
  const [transacoes, setTransacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tipo, setTipo] = useState('');
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const carregar = useCallback(async () => {
    setLoading(true); setError('');
    try { const response = await api.get('/transacoes'); setTransacoes(response.data || []); }
    catch (error) { setError(apiErrorMessage(error, 'Não foi possível carregar o histórico financeiro.')); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { carregar(); }, [carregar]);
  const tipos = useMemo(() => [...new Set(transacoes.map((item) => item.tipo).filter(Boolean))], [transacoes]);
  const periodoInvalido = inicio && fim && inicio > fim;
  const filtradas = useMemo(() => transacoes.filter((item) => {
    const data = (item.dataHora || '').slice(0, 10);
    return (!tipo || item.tipo === tipo) && (!inicio || data >= inicio) && (!fim || data <= fim);
  }), [tipo, transacoes, inicio, fim]);
  const total = filtradas.reduce((sum, item) => sum + Number(item.valor || 0), 0);
  const hoje = localDate(new Date());
  const totalHoje = transacoes.filter((item) => item.dataHora?.startsWith(hoje)).reduce((sum, item) => sum + Number(item.valor || 0), 0);
  const reset = () => { setTipo(''); setInicio(''); setFim(''); };
  return <div className="page-stack">
    <PageHeader actions={<button className="button" disabled={loading} onClick={carregar} type="button"><Icon name="refresh" size={16} /> Atualizar</button>} description="Consulte os recebimentos de comandas faturadas. Despesas e saldo da operação estão no relatório financeiro." eyebrow="Financeiro" title="Registros financeiros" />
    <section className="summary-grid"><div className="summary-card success"><small>Recebido hoje</small><strong>{formatCurrency(totalHoje)}</strong></div><div className="summary-card"><small>Recebimentos no período filtrado</small><strong>{formatCurrency(total)}</strong></div><div className="summary-card"><small>Registros no período filtrado</small><strong>{filtradas.length}</strong></div></section>
    <DataTable title="Histórico de recebimentos" description="Busque uma descrição ou comanda; clique nos títulos para ordenar." rows={periodoInvalido ? [] : filtradas} loading={loading} error={periodoInvalido ? 'A data inicial deve ser anterior ou igual à final.' : error} onRetry={error ? carregar : undefined} searchKeys={['descricao', 'descricaoExibicao', 'id', 'comanda.numero', (item) => item.comanda ? comandaReference(item.comanda) : '', (item) => paymentLabel(item.tipo)]} searchPlaceholder="Buscar descrição, comanda ou pagamento..." defaultSort={{ key: 'dataHora', direction: 'desc' }} emptyTitle="Nenhuma transação" emptyDescription="Ajuste os filtros ou conclua o faturamento de uma comanda." toolbar={<>
      <div className="compact-field"><label htmlFor="finance-inicio">De</label><input id="finance-inicio" type="date" className="field-control" value={inicio} onChange={(event) => setInicio(event.target.value)} /></div>
      <div className="compact-field"><label htmlFor="finance-fim">Até</label><input id="finance-fim" type="date" className="field-control" value={fim} onChange={(event) => setFim(event.target.value)} /></div>
      <Select aria-label="Meio de pagamento" value={tipo} onChange={(event) => setTipo(event.target.value)}><option value="">Todos os meios</option>{tipos.map((item) => <option key={item} value={item}>{paymentLabel(item)}</option>)}</Select>
      {(tipo || inicio || fim) && <button type="button" className="button button-sm" onClick={reset}>Limpar filtros</button>}
    </>} columns={[
      { key: 'dataHora', label: 'Data e hora', render: (item) => formatDate(item.dataHora, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) },
      { key: 'descricao', label: 'Descrição', render: (item) => <><span className="cell-title">{item.descricaoExibicao || item.descricao || 'Recebimento registrado'}</span><span className="cell-subtitle">Transação #{item.id}</span></> },
      { key: 'tipo', label: 'Pagamento', value: (item) => paymentLabel(item.tipo), render: (item) => <span className="status-badge status-success">{paymentLabel(item.tipo)}</span> },
      { key: 'comanda', label: 'Comanda', value: (item) => item.comanda ? `${item.comanda.dataNumeracao || ''}-${comandaNumber(item.comanda).padStart(10, '0')}` : '', render: (item) => item.comanda ? comandaReference(item.comanda) : '—' },
      { key: 'valor', label: 'Valor', value: (item) => Number(item.valor), align: 'right', render: (item) => <span className="cell-title">{formatCurrency(item.valor)}</span> },
    ]} />
  </div>;
}
