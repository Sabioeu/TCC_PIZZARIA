import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api/api';
import Icon from '../components/Icon';
import PageHeader from '../components/PageHeader';

const EstoquePage = () => {
  const [produtos, setProdutos] = useState([]);
  const [produtoSelecionadoId, setProdutoSelecionadoId] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [mensagem, setMensagem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const carregarProdutos = useCallback(async () => {
    setLoading(true);
    try { const response = await api.get('/produtos'); setProdutos(response.data || []); }
    catch (err) { console.error(err); setMensagem({ type: 'error', text: 'Não foi possível carregar o estoque.' }); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { carregarProdutos(); }, [carregarProdutos]);

  const estoqueBaixo = useMemo(() => produtos.filter((produto) => Number(produto.quantidade || 0) <= 5).length, [produtos]);
  const totalUnidades = useMemo(() => produtos.reduce((sum, produto) => sum + Number(produto.quantidade || 0), 0), [produtos]);

  const registrarEntrada = async (event) => {
    event.preventDefault();
    if (!produtoSelecionadoId || Number(quantidade) <= 0) {
      setMensagem({ type: 'error', text: 'Selecione um produto e informe uma quantidade válida.' });
      return;
    }
    setSaving(true);
    setMensagem(null);
    try {
      await api.post('/movimentos-estoque', { produtoId: Number(produtoSelecionadoId), tipo: 'ENTRADA', quantidade: Number(quantidade) });
      const response = await api.get(`/produtos/${produtoSelecionadoId}`);
      setProdutos((atuais) => atuais.map((produto) => produto.id === response.data.id ? response.data : produto));
      setMensagem({ type: 'success', text: `Entrada registrada. Novo saldo de ${response.data.nome}: ${Number(response.data.quantidade || 0).toFixed(2)}.` });
      setQuantidade('');
    } catch (err) {
      console.error('Erro ao registrar entrada:', err);
      setMensagem({ type: 'error', text: err.response?.data?.message || 'Não foi possível registrar a entrada.' });
    } finally { setSaving(false); }
  };

  return (
    <div className="page-stack">
      <PageHeader description="Registre entradas e acompanhe os saldos disponíveis para o atendimento." eyebrow="Inventário" title="Estoque de produtos" />
      <section className="summary-grid">
        <div className="summary-card"><small>Produtos controlados</small><strong>{produtos.length}</strong></div>
        <div className="summary-card success"><small>Saldo total</small><strong>{totalUnidades.toFixed(2)}</strong></div>
        <div className={`summary-card ${estoqueBaixo ? 'danger' : ''}`}><small>Estoque baixo</small><strong>{estoqueBaixo}</strong></div>
      </section>
      {mensagem && <div className={`alert ${mensagem.type === 'success' ? 'alert-success' : 'alert-error'}`}><Icon name={mensagem.type === 'success' ? 'check' : 'alert'} size={17} />{mensagem.text}</div>}
      <section className="split-layout">
        <article className="panel sticky-panel">
          <div className="panel-header"><div><h2 className="panel-title">Registrar entrada</h2><p className="panel-subtitle">Adicione unidades ao saldo de um produto</p></div><span className="metric-icon brand"><Icon name="inventory" size={17} /></span></div>
          <div className="panel-body">
            <form className="form-grid" onSubmit={registrarEntrada}>
              <div className="form-field full-span"><label className="form-label">Produto</label><select onChange={(event) => setProdutoSelecionadoId(event.target.value)} required value={produtoSelecionadoId}><option value="">Selecione...</option>{produtos.map((produto) => <option key={produto.id} value={produto.id}>{produto.nome} · saldo {Number(produto.quantidade || 0).toFixed(2)}</option>)}</select></div>
              <div className="form-field full-span"><label className="form-label">Quantidade da entrada</label><input min="0.01" onChange={(event) => setQuantidade(event.target.value)} placeholder="0,00" required step="0.01" type="number" value={quantidade} /></div>
              <div className="form-actions"><button className="button button-primary" disabled={saving || produtos.length === 0} type="submit">{saving ? 'Registrando...' : 'Confirmar entrada'} <Icon name="arrow" size={15} /></button></div>
            </form>
          </div>
        </article>
        <article className="panel">
          <div className="panel-header"><div><h2 className="panel-title">Posição de estoque</h2><p className="panel-subtitle">Saldo atualizado dos produtos</p></div><button aria-label="Atualizar" className="icon-button" onClick={carregarProdutos} type="button"><Icon name="refresh" size={16} /></button></div>
          {loading ? <div className="loading-state"><div><div className="spinner" />Carregando...</div></div> : produtos.length === 0 ? <div className="empty-state"><div><div className="empty-state-icon"><Icon name="inventory" /></div><strong>Sem produtos</strong><p>Cadastre produtos antes de movimentar o estoque.</p></div></div> : <div className="table-wrap"><table className="data-table"><thead><tr><th>Produto</th><th>Saldo</th><th>Situação</th></tr></thead><tbody>{produtos.map((produto) => { const saldo = Number(produto.quantidade || 0); return <tr key={produto.id}><td><span className="cell-title">{produto.nome}</span><span className="cell-subtitle">{produto.descricao || 'Produto do cardápio'}</span></td><td><span className="cell-title">{saldo.toFixed(2)}</span></td><td><span className={`status-badge ${saldo <= 5 ? 'status-danger' : 'status-success'}`}>{saldo <= 5 ? 'Baixo' : 'Regular'}</span></td></tr>; })}</tbody></table></div>}
        </article>
      </section>
    </div>
  );
};

export default EstoquePage;
