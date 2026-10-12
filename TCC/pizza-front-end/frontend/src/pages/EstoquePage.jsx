import Select from '../components/Select';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api from '../api/api';
import Icon from '../components/Icon';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import { useToast } from '../components/ToastProvider';
import { apiErrorMessage } from '../utils/apiError';

const porIngredientes = (produto) => produto.modoEstoque === 'INGREDIENTES';

const EstoquePage = () => {
  const { notify } = useToast();
  const envio = useRef(false);
  const [produtos, setProdutos] = useState([]);
  const [produtoSelecionadoId, setProdutoSelecionadoId] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [situacao, setSituacao] = useState('');
  const [controle, setControle] = useState('');
  const [mensagem, setMensagem] = useState(null);
  const [erroCarga, setErroCarga] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const atualizarProdutos = useCallback(async () => {
    const [response, disponibilidade] = await Promise.all([api.get('/produtos'), api.get('/produtos/disponibilidade')]);
    const saldos = new Map((disponibilidade.data || []).map((item) => [item.produtoId, item]));
    setProdutos((response.data || []).map((produto) => ({ ...produto, modoEstoque: saldos.get(produto.id)?.modoEstoque || produto.modoEstoque || 'PRODUTO', quantidade: Number(saldos.get(produto.id)?.estoque ?? produto.quantidade ?? 0), reservado: Number(saldos.get(produto.id)?.reservado || 0), disponivel: Number(saldos.get(produto.id)?.disponivel ?? produto.quantidade ?? 0) })));
  }, []);
  const carregarProdutos = useCallback(async () => {
    setLoading(true); setErroCarga('');
    try { await atualizarProdutos(); }
    catch (error) { setErroCarga(apiErrorMessage(error, 'Não foi possível carregar o estoque.')); }
    finally { setLoading(false); }
  }, [atualizarProdutos]);
  useEffect(() => { carregarProdutos(); }, [carregarProdutos]);
  const produtosEstocados = produtos.filter((produto) => !porIngredientes(produto));
  const produtosPreparados = produtos.filter(porIngredientes);
  const produtoSelecionado = produtos.find((produto) => String(produto.id) === produtoSelecionadoId);
  useEffect(() => {
    if (produtoSelecionado && porIngredientes(produtoSelecionado)) setProdutoSelecionadoId('');
  }, [produtoSelecionado]);
  const estoqueBaixo = produtos.filter((produto) => produto.disponivel <= 5).length;
  const totalReservado = produtosEstocados.reduce((sum, produto) => sum + produto.reservado, 0);
  const totalUnidades = produtosEstocados.reduce((sum, produto) => sum + Number(produto.quantidade || 0), 0);
  const filtrados = useMemo(() => produtos.filter((produto) => (!situacao || (situacao === 'baixo' ? produto.disponivel <= 5 : produto.disponivel > 5)) && (!controle || produto.modoEstoque === controle)), [produtos, situacao, controle]);
  const registrarEntrada = async (event) => {
    event.preventDefault();
    if (envio.current) return;
    const unidades = Number(quantidade);
    if (!produtoSelecionadoId || !Number.isFinite(unidades) || unidades <= 0) { setMensagem({ type: 'error', text: 'Selecione um produto e informe uma quantidade válida.' }); return; }
    if (!produtoSelecionado || porIngredientes(produtoSelecionado)) { setMensagem({ type: 'error', text: 'Produtos com ficha técnica são repostos pelos ingredientes, não por entrada de unidades prontas.' }); return; }
    envio.current = true; setSaving(true); setMensagem(null);
    try {
      await api.post('/movimentos-estoque', { produtoId: Number(produtoSelecionadoId), tipo: 'ENTRADA', quantidade: unidades });
      setQuantidade('');
      setMensagem({ type: 'success', text: 'Entrada registrada com sucesso.' });
      notify('Entrada de estoque registrada.');
      try { await atualizarProdutos(); setErroCarga(''); }
      catch { setMensagem({ type: 'success', text: 'Entrada registrada. Não repita o lançamento: clique em Atualizar estoque para conferir o novo saldo.' }); setErroCarga('O lançamento foi salvo, mas o saldo não pôde ser atualizado.'); }
    } catch (error) { setMensagem({ type: 'error', text: apiErrorMessage(error, 'Não foi possível registrar a entrada.') }); }
    finally { envio.current = false; setSaving(false); }
  };
  return <div className="page-stack">
    <PageHeader actions={<button className="button" type="button" disabled={loading || saving} onClick={carregarProdutos}><Icon name="refresh" size={16} /> Atualizar estoque</button>} description="Confira unidades em estoque e a capacidade de preparo dos produtos que usam ingredientes." eyebrow="Inventário" title="Estoque e disponibilidade" />
    <section className="summary-grid">
      <div className="summary-card" role="group" aria-label="Saldo físico total"><small>Saldo físico total</small><strong>{totalUnidades.toFixed(2)}</strong><span className="cell-subtitle">{produtosEstocados.length} produtos com controle por unidades</span></div>
      <div className="summary-card warning" role="group" aria-label="Unidades reservadas"><small>Unidades reservadas</small><strong>{totalReservado.toFixed(2)}</strong><span className="cell-subtitle">Somente produtos com estoque próprio</span></div>
      <div className="summary-card" role="group" aria-label="Produção por ingredientes"><small>Produção por ingredientes</small><strong>{produtosPreparados.length}</strong><span className="cell-subtitle">A capacidade depende dos insumos compartilhados</span></div>
      <div className={`summary-card ${estoqueBaixo ? 'danger' : 'success'}`} role="group" aria-label="Disponibilidade baixa"><small>Disponibilidade baixa</small><strong>{estoqueBaixo}</strong><span className="cell-subtitle">Até 5 unidades ou preparos disponíveis</span></div>
    </section>
    {mensagem && <div role={mensagem.type === 'success' ? 'status' : 'alert'} className={`alert ${mensagem.type === 'success' ? 'alert-success' : 'alert-error'}`}><Icon name={mensagem.type === 'success' ? 'check' : 'alert'} size={17} />{mensagem.text}</div>}
    <section className="split-layout">
      <article className="panel sticky-panel"><div className="panel-header"><div><h2 className="panel-title">Registrar entrada</h2><p className="panel-subtitle">Reponha o saldo físico de um produto</p></div><span className="metric-icon brand"><Icon name="inventory" size={17} /></span></div><div className="panel-body">
        <form onSubmit={registrarEntrada} aria-busy={saving} aria-label="Registrar entrada de estoque"><fieldset className="form-grid form-fieldset" disabled={saving || loading || Boolean(erroCarga)}>
          <div className="form-field full-span"><label className="form-label" htmlFor="entrada-produto">Produto</label><Select id="entrada-produto" disabled={saving || loading || Boolean(erroCarga)} onChange={(event) => setProdutoSelecionadoId(event.target.value)} required value={produtoSelecionadoId}><option value="">Selecione um produto</option>{produtosEstocados.map((produto) => <option key={produto.id} value={produto.id}>{produto.nome} · saldo {Number(produto.quantidade || 0).toFixed(2)}</option>)}</Select></div>
          <div className="form-field full-span"><label className="form-label" htmlFor="entrada-quantidade">Quantidade da entrada</label><input id="entrada-quantidade" min="0.01" onChange={(event) => setQuantidade(event.target.value)} placeholder="0,00" required step="0.01" type="number" value={quantidade} /></div>
          <p className="form-hint full-span">O lançamento fica registrado no relatório de entradas. Confira o produto e a quantidade antes de confirmar.</p>
          {produtosPreparados.length > 0 && <p className="form-hint full-span">Produtos com ficha técnica não recebem entrada direta. Reponha os ingredientes no cadastro de insumos para aumentar a capacidade de preparo.</p>}
          <div className="form-actions"><button className="button button-primary" disabled={saving || produtosEstocados.length === 0} type="submit">{saving ? 'Registrando...' : 'Confirmar entrada'} <Icon name="arrow" size={15} /></button></div>
        </fieldset></form>
      </div></article>
      <DataTable title="Posição de estoque" description="Unidades: físico menos reservas. Preparo: capacidade dos ingredientes após todas as reservas, inclusive de outros produtos." rows={filtrados} loading={loading} error={erroCarga} onRetry={carregarProdutos} searchKeys={['nome', 'descricao']} searchPlaceholder="Buscar produto ou descrição..." emptyDescription="Cadastre produtos ou ajuste os filtros para consultar os saldos." defaultSort={{ key: 'nome', direction: 'asc' }} toolbar={<><Select aria-label="Tipo de controle" value={controle} onChange={(event) => setControle(event.target.value)}><option value="">Todos os controles</option><option value="PRODUTO">Unidades em estoque</option><option value="INGREDIENTES">Preparo por ingredientes</option></Select><Select aria-label="Situação do estoque" value={situacao} onChange={(event) => setSituacao(event.target.value)}><option value="">Todos os saldos</option><option value="baixo">Disponibilidade baixa</option><option value="regular">Disponibilidade regular</option></Select></>} columns={[
        { key: 'nome', label: 'Produto', render: (produto) => <><span className="cell-title">{produto.nome}</span><span className="cell-subtitle">{produto.descricao || 'Produto do cardápio'}</span></> },
        { key: 'modoEstoque', label: 'Controle', render: (produto) => <span className={`status-badge ${porIngredientes(produto) ? 'status-info' : 'status-neutral'}`}>{porIngredientes(produto) ? 'Ingredientes' : 'Unidades'}</span> },
        { key: 'quantidade', label: 'Físico', value: (produto) => porIngredientes(produto) ? -1 : Number(produto.quantidade || 0), render: (produto) => porIngredientes(produto) ? <><span>—</span><span className="cell-subtitle">Saldo nos insumos</span></> : Number(produto.quantidade || 0).toFixed(2) },
        { key: 'reservado', label: 'Reservado', render: (produto) => <>{produto.reservado.toFixed(2)}{porIngredientes(produto) && <span className="cell-subtitle">Preparos deste produto</span>}</> },
        { key: 'disponivel', label: 'Disponível', render: (produto) => <><span className="cell-title">{produto.disponivel.toFixed(2)}</span>{porIngredientes(produto) && <span className="cell-subtitle">Capacidade de preparo</span>}</> },
        { key: 'situacao', label: 'Situação', value: (produto) => produto.disponivel, render: (produto) => <span className={`status-badge ${produto.disponivel <= 5 ? 'status-danger' : 'status-success'}`}>{produto.disponivel <= 0 ? 'Indisponível' : produto.disponivel <= 5 ? 'Baixo' : 'Regular'}</span> },
      ]} />
    </section>
  </div>;
};
export default EstoquePage;
