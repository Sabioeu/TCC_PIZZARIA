import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api/api';
import Icon from '../components/Icon';
import PageHeader from '../components/PageHeader';
import { formatCurrency, formatDate } from '../utils/formatters';

const TransacoesFinanceirasPage = () => {
  const [transacoes, setTransacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tipo, setTipo] = useState('');

  const carregar = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/transacoes');
      setTransacoes((response.data || []).sort((a, b) => new Date(b.dataHora) - new Date(a.dataHora)));
    } catch (err) {
      console.error('Erro ao buscar transações:', err);
      setError('Não foi possível carregar o histórico financeiro.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const tipos = useMemo(() => [...new Set(transacoes.map((item) => item.tipo).filter(Boolean))], [transacoes]);
  const filtradas = useMemo(() => transacoes.filter((item) => !tipo || item.tipo === tipo), [tipo, transacoes]);
  const total = useMemo(() => filtradas.reduce((sum, item) => sum + Number(item.valor || 0), 0), [filtradas]);
  const hoje = new Date().toISOString().slice(0, 10);
  const totalHoje = useMemo(() => transacoes.filter((item) => item.dataHora?.startsWith(hoje)).reduce((sum, item) => sum + Number(item.valor || 0), 0), [hoje, transacoes]);

  return (
    <div className="page-stack">
      <PageHeader actions={<button className="button" onClick={carregar} type="button"><Icon name="refresh" size={16} /> Atualizar</button>} description="Consulte os recebimentos gerados pelo faturamento das comandas." eyebrow="Financeiro" title="Registros financeiros" />
      <section className="summary-grid">
        <div className="summary-card success"><small>Recebido hoje</small><strong>{formatCurrency(totalHoje)}</strong></div>
        <div className="summary-card"><small>Total exibido</small><strong>{formatCurrency(total)}</strong></div>
        <div className="summary-card"><small>Registros</small><strong>{filtradas.length}</strong></div>
      </section>
      {error && <div className="alert alert-error"><Icon name="alert" size={17} />{error}</div>}
      <section className="panel">
        <div className="panel-header" style={{ alignItems: 'center' }}><div><h2 className="panel-title">Histórico de recebimentos</h2><p className="panel-subtitle">Ordenado das movimentações mais recentes para as mais antigas</p></div><select className="field-control" onChange={(event) => setTipo(event.target.value)} style={{ width: 175 }} value={tipo}><option value="">Todos os meios</option>{tipos.map((item) => <option key={item} value={item}>{paymentLabel(item)}</option>)}</select></div>
        {loading ? <div className="loading-state"><div><div className="spinner" />Carregando histórico...</div></div> : filtradas.length === 0 ? <div className="empty-state"><div><div className="empty-state-icon"><Icon name="finance" /></div><strong>Nenhuma transação</strong><p>Os faturamentos concluídos serão apresentados aqui.</p></div></div> : <div className="table-wrap"><table className="data-table"><thead><tr><th>Data e hora</th><th>Descrição</th><th>Pagamento</th><th>Comanda</th><th>Valor</th></tr></thead><tbody>{filtradas.map((transacao) => <tr key={transacao.id}><td>{formatDate(transacao.dataHora, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td><td><span className="cell-title">{transacao.descricao || 'Recebimento registrado'}</span><span className="cell-subtitle">Transação #{transacao.id}</span></td><td><span className="status-badge status-success">{paymentLabel(transacao.tipo)}</span></td><td>{transacao.comanda ? `#${transacao.comanda.numero}` : '—'}</td><td><span className="cell-title">{formatCurrency(transacao.valor)}</span></td></tr>)}</tbody></table></div>}
      </section>
    </div>
  );
};

const paymentLabel = (type) => ({ CREDITO: 'Crédito', DEBITO: 'Débito', DINHEIRO: 'Dinheiro', PIX: 'Pix' }[type] || type);
export default TransacoesFinanceirasPage;
