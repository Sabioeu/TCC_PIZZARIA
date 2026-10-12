import Select from '../components/Select';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/api';
import Icon from '../components/Icon';
import PageHeader from '../components/PageHeader';
import { formatCurrency, formatDate, comandaNumber, comandaReference } from '../utils/formatters';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/ToastProvider';
import './Atendimento.css';

const paymentOptions = [
  { value: 'CREDITO', label: 'Cartão de crédito', icon: 'credit' },
  { value: 'DEBITO', label: 'Cartão de débito', icon: 'finance' },
  { value: 'PIX', label: 'Pix', icon: 'activity' },
  { value: 'DINHEIRO', label: 'Dinheiro', icon: 'cash' },
];
const tipos = { PRESENCIAL: 'Presencial', DELIVERY: 'Delivery', RETIRADA: 'Retirada' };
const etapas = { RECEBIDO: 'Recebido', EM_PREPARO: 'Em preparo', PRONTO: 'Pronto', EM_ENTREGA: 'Em entrega', CONCLUIDO: 'Concluído' };
const proximaEtapa = (c) => ({ RECEBIDO: 'EM_PREPARO', EM_PREPARO: 'PRONTO', PRONTO: c.tipoAtendimento === 'DELIVERY' ? 'EM_ENTREGA' : 'CONCLUIDO', EM_ENTREGA: 'CONCLUIDO' }[c.etapaAtendimento]);
const normalizarBusca = (valor) => String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const trilhaAtendimento = (tipo) => tipo === 'DELIVERY'
  ? ['RECEBIDO', 'EM_PREPARO', 'PRONTO', 'EM_ENTREGA', 'CONCLUIDO']
  : ['RECEBIDO', 'EM_PREPARO', 'PRONTO', 'CONCLUIDO'];

const ComandasPage = () => {
  const { usuario } = useAuth();
  const { notify } = useToast();
  const operacaoEmCurso = useRef(false);
  const buscaEmCurso = useRef(false);
  const [cancelando, setCancelando] = useState(null);
  const [comandaCancelamento, setComandaCancelamento] = useState(null);
  const [filtroTipo, setFiltroTipo] = useState('TODOS');
  const [filtroEtapa, setFiltroEtapa] = useState('TODAS');
  const [busca, setBusca] = useState('');
  const [erroModal, setErroModal] = useState('');
  const [avancando, setAvancando] = useState(null);
  const avancarEtapa = async (comanda) => {
    if (operacaoEmCurso.current || buscaEmCurso.current || !proximaEtapa(comanda)) return;
    operacaoEmCurso.current = true;
    setAvancando(comanda.id); setError('');
    try {
      const { data } = await api.patch(`/comandas/${comanda.id}/etapa`, { etapa: proximaEtapa(comanda) });
      setComandas((lista) => lista.map((c) => c.id === data.id ? data : c));
      notify(`Comanda ${comandaReference(comanda)}: ${etapas[data.etapaAtendimento] || 'etapa atualizada'}.`, { type: 'success' });
    }
    catch (err) { setError(err.response?.data?.message || 'Não foi possível atualizar a etapa.'); }
    finally { operacaoEmCurso.current = false; setAvancando(null); }
  };
  const cancelarComanda = async (comanda) => {
    if (operacaoEmCurso.current || buscaEmCurso.current || !['ADMINISTRADOR', 'GERENTE'].includes(usuario?.perfil)) return;
    operacaoEmCurso.current = true;
    setCancelando(comanda.id); setErroModal('');
    try {
      await api.delete(`/comandas/${comanda.id}`);
      setComandas((atuais) => atuais.filter((c) => c.id !== comanda.id));
      setComandaCancelamento(null);
      notify(`Comanda ${comandaReference(comanda)} cancelada.`, { type: 'success' });
    }
    catch (err) { setErroModal(err.response?.data?.message || 'Não foi possível cancelar o atendimento.'); }
    finally { operacaoEmCurso.current = false; setCancelando(null); }
  };
  const [comandas, setComandas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [comandaFaturamento, setComandaFaturamento] = useState(null);
  const [tipoPagamento, setTipoPagamento] = useState('');
  const [faturando, setFaturando] = useState(false);

  const fetchComandasAbertas = useCallback(async () => {
    if (buscaEmCurso.current || operacaoEmCurso.current) return;
    buscaEmCurso.current = true;
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/comandas/abertas');
      const lista = response.data?.content || response.data;
      setComandas(Array.isArray(lista) ? lista : []);
    } catch (err) {
      setError('Não foi possível carregar as comandas abertas. Verifique a conexão com o servidor.');
    } finally {
      buscaEmCurso.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchComandasAbertas();
  }, [fetchComandasAbertas]);

  const totalEmAberto = useMemo(() => comandas.reduce(
    (sum, comanda) => sum + Number(comanda.total || 0), 0,
  ), [comandas]);
  const comandasFiltradas = useMemo(() => comandas.filter((c) => {
    const tipo = c.tipoAtendimento || 'PRESENCIAL';
    const correspondeTipo = filtroTipo === 'TODOS' || tipo === filtroTipo;
    const correspondeEtapa = filtroEtapa === 'TODAS' || (filtroEtapa === 'SALAO' ? tipo === 'PRESENCIAL' : tipo !== 'PRESENCIAL' && c.etapaAtendimento === filtroEtapa);
    const texto = normalizarBusca(`${comandaReference(c)} ${c.numero} ${c.cliente?.nome || ''} ${c.mesa ? `mesa ${c.mesa.numero}` : ''} ${c.telefoneContato || ''}`);
    return correspondeTipo && correspondeEtapa && texto.includes(normalizarBusca(busca.trim()));
  }), [comandas, filtroTipo, filtroEtapa, busca]);
  const ocupadas = Boolean(cancelando || avancando || faturando);
  const limparFiltros = () => { setBusca(''); setFiltroTipo('TODOS'); setFiltroEtapa('TODAS'); };

  const fecharModal = () => {
    if (operacaoEmCurso.current) return;
    setComandaFaturamento(null);
    setTipoPagamento('');
    setErroModal('');
  };

  const confirmarFaturamento = async () => {
    if (operacaoEmCurso.current || buscaEmCurso.current || !comandaFaturamento || !tipoPagamento) return;
    operacaoEmCurso.current = true;
    setFaturando(true);
    setErroModal('');
    try {
      await api.patch(`/comandas/${comandaFaturamento.id}/fechar`, { tipoPagamento });
      setComandas((atuais) => atuais.filter((comanda) => comanda.id !== comandaFaturamento.id));
      setComandaFaturamento(null);
      setTipoPagamento('');
      notify(`Comanda ${comandaReference(comandaFaturamento)} faturada com sucesso.`, { type: 'success' });
    } catch (err) {
      setErroModal(err.response?.data?.message || 'Não foi possível faturar a comanda. Verifique o estoque e tente novamente.');
    } finally {
      operacaoEmCurso.current = false;
      setFaturando(false);
    }
  };

  return (
    <div className="page-stack">
      <PageHeader
        actions={(
          <>
            <button className="button" disabled={loading || ocupadas} onClick={fetchComandasAbertas} type="button"><Icon name="refresh" size={16} /> {loading ? 'Atualizando...' : 'Atualizar'}</button>
            <Link className="button button-primary" to="/pedidos"><Icon name="plus" size={16} /> Novo pedido</Link>
          </>
        )}
        description="Localize cada pedido, acompanhe sua etapa e conclua o atendimento com o faturamento."
        eyebrow="Atendimento"
        title="Atendimentos abertos"
      />

      <section className="summary-grid">
        <div className="summary-card"><small>Comandas em atendimento</small><strong>{comandas.length}</strong></div>
        <div className="summary-card warning"><small>Valor total em aberto</small><strong>{formatCurrency(totalEmAberto)}</strong></div>
        <div className="summary-card success"><small>Ticket médio em aberto</small><strong>{formatCurrency(comandas.length ? totalEmAberto / comandas.length : 0)}</strong></div>
      </section>

      {error && <div className="alert alert-error" role="alert"><Icon name="alert" size={17} />{error}</div>}
      <section className="panel atendimento-filters" aria-label="Filtros de atendimentos">
        <div className="atendimento-filter-grid">
          <div className="form-field atendimento-filter-search"><label className="form-label" htmlFor="buscaComandas">Buscar atendimento</label><input className="search-input" id="buscaComandas" type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Comanda, cliente ou mesa..." /></div>
          <div className="form-field"><label className="form-label" htmlFor="filtroTipo">Tipo de atendimento</label><Select id="filtroTipo" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}><option value="TODOS">Todos os atendimentos</option>{Object.entries(tipos).map(([valor, label]) => <option key={valor} value={valor}>{label}</option>)}</Select></div>
          <div className="form-field"><label className="form-label" htmlFor="filtroEtapa">Etapa do pedido</label><Select id="filtroEtapa" value={filtroEtapa} onChange={(e) => setFiltroEtapa(e.target.value)}><option value="TODAS">Todas as etapas</option><option value="SALAO">Consumo no salão</option>{Object.entries(etapas).map(([valor, label]) => <option key={valor} value={valor}>{label}</option>)}</Select></div>
        </div>
        <div className="atendimento-filter-footer"><span aria-live="polite">{comandasFiltradas.length} de {comandas.length} atendimentos</span>{(busca || filtroTipo !== 'TODOS' || filtroEtapa !== 'TODAS') && <button className="button button-sm" type="button" onClick={limparFiltros}>Limpar filtros</button>}</div>
      </section>

      {loading ? (
        <div className="panel loading-state"><div><div className="spinner" />Carregando comandas...</div></div>
      ) : comandas.length === 0 ? (
        <div className="panel empty-state">
          <div>
            <div className="empty-state-icon"><Icon name="receipt" /></div>
            <strong>Nenhuma comanda aberta</strong>
            <p>O salão está sem atendimentos pendentes. Abra um novo pedido para começar.</p>
            <Link className="button button-primary" style={{ marginTop: 16 }} to="/pedidos">Criar pedido</Link>
          </div>
        </div>
      ) : (
        <section className="comanda-grid">
          {comandasFiltradas.length === 0 && <div className="panel empty-state atendimento-filter-empty"><div><div className="empty-state-icon"><Icon name="search" /></div><strong>Nenhum atendimento encontrado</strong><p>Ajuste a busca ou os filtros para ver os pedidos em aberto.</p><button className="button" type="button" onClick={limparFiltros}>Limpar filtros</button></div></div>}
          {comandasFiltradas.map((comanda) => (
            <article className="comanda-card" key={comanda.id}>
              <div className="comanda-card-top">
                <div>
                  <h2 className="comanda-number">Comanda #{comandaNumber(comanda)}</h2>
                  <span className="comanda-table">{tipos[comanda.tipoAtendimento || 'PRESENCIAL']}{comanda.mesa && ` · Mesa ${comanda.mesa.numero}${comanda.tipoAtendimento && comanda.tipoAtendimento !== 'PRESENCIAL' ? ' (referência)' : ''}`}</span>
                </div>
                <span className="status-badge status-warning">{comanda.tipoAtendimento && comanda.tipoAtendimento !== 'PRESENCIAL' ? etapas[comanda.etapaAtendimento] : 'Aberta'}</span>
              </div>
              <span className="comanda-value-label">Total estimado</span>
              <strong className="comanda-value">{formatCurrency(comanda.total)}</strong>
              <p className="cell-subtitle" style={{ margin: '-8px 0 16px' }}>
                Aberta em {formatDate(comanda.dataHoraAbertura, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className="cell-subtitle">Cliente: {comanda.cliente?.nome || 'Não informado'}</p>
              {comanda.tipoAtendimento === 'DELIVERY' && <div className="atendimento-delivery-details"><p><Icon name="store" size={15} /><span>{comanda.enderecoEntrega}</span></p><p>Contato: {comanda.telefoneContato}</p><small>Taxa incluída: {formatCurrency(comanda.taxaEntrega)}</small></div>}
              {comanda.tipoAtendimento && comanda.tipoAtendimento !== 'PRESENCIAL' && <ol className="atendimento-stage-track" aria-label={`Etapas da comanda ${comandaReference(comanda)}`}>
                {trilhaAtendimento(comanda.tipoAtendimento).map((etapa, indice, trilha) => {
                  const atual = trilha.indexOf(comanda.etapaAtendimento);
                  return <li className={indice < atual ? 'complete' : indice === atual ? 'current' : ''} aria-current={indice === atual ? 'step' : undefined} key={etapa}><span className="atendimento-stage-dot">{indice < atual ? <Icon name="check" size={10} /> : indice + 1}</span><span>{etapas[etapa]}</span></li>;
                })}
              </ol>}
              <div className="atendimento-card-actions">
              {comanda.tipoAtendimento && comanda.tipoAtendimento !== 'PRESENCIAL' && proximaEtapa(comanda) && <button className="button button-primary" disabled={ocupadas} type="button" onClick={() => avancarEtapa(comanda)}>{avancando === comanda.id ? 'Atualizando...' : `Avançar: ${etapas[proximaEtapa(comanda)]}`}</button>}
              <button className="button button-success" disabled={ocupadas || (comanda.tipoAtendimento && comanda.tipoAtendimento !== 'PRESENCIAL' && comanda.etapaAtendimento !== 'CONCLUIDO')} onClick={() => { setErroModal(''); setError(''); setComandaFaturamento(comanda); }} type="button">
                <Icon name="check" size={16} /> Faturar comanda
              </button>
              {comanda.tipoAtendimento && comanda.tipoAtendimento !== 'PRESENCIAL' && comanda.etapaAtendimento !== 'CONCLUIDO' && <p className="atendimento-context-hint">Conclua as etapas do pedido para liberar o faturamento.</p>}
              {['ADMINISTRADOR','GERENTE'].includes(usuario?.perfil) && <button className="button" disabled={ocupadas} type="button" onClick={() => { setErroModal(''); setError(''); setComandaCancelamento(comanda); }}>{cancelando === comanda.id ? 'Cancelando...' : 'Cancelar atendimento'}</button>}
              </div>
            </article>
          ))}
        </section>
      )}

      {comandaFaturamento && (
        <Modal busy={faturando} error={erroModal} onClose={fecharModal} title={`Faturar comanda #${comandaNumber(comandaFaturamento)}`} subtitle={`${comandaReference(comandaFaturamento)} · ${tipos[comandaFaturamento.tipoAtendimento || 'PRESENCIAL']} · ${formatCurrency(comandaFaturamento.total)}`}>

            <div className="form-field">
              <label className="form-label">Selecione a forma de pagamento</label>
              <div className="payment-options">
                {paymentOptions.map((option) => (
                  <label className={`payment-option ${tipoPagamento === option.value ? 'selected' : ''}`} key={option.value}>
                    <input
                      checked={tipoPagamento === option.value}
                      disabled={faturando}
                      name="pagamento"
                      onChange={() => setTipoPagamento(option.value)}
                      type="radio"
                      value={option.value}
                    />
                    <Icon name={option.icon} size={17} />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="modal-actions">
              <button className="button" disabled={faturando} onClick={fecharModal} type="button">Cancelar</button>
              <button className="button button-primary" aria-busy={faturando} disabled={!tipoPagamento || faturando} onClick={confirmarFaturamento} type="button">
                {faturando ? 'Processando...' : 'Confirmar faturamento'}
              </button>
            </div>
        </Modal>
      )}
      {comandaCancelamento && <ConfirmDialog title={`Cancelar comanda #${comandaNumber(comandaCancelamento)}?`} confirmLabel="Cancelar atendimento" description={`${comandaReference(comandaCancelamento)}. O atendimento ficará no histórico, sem recebimento nem baixa de estoque. A mesa, quando ocupada por este atendimento, será liberada.`} busy={Boolean(cancelando)} error={erroModal} onCancel={() => { if (!operacaoEmCurso.current) { setComandaCancelamento(null); setErroModal(''); } }} onConfirm={() => cancelarComanda(comandaCancelamento)} />}
    </div>
  );
};

export default ComandasPage;
