import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/api';
import Icon from '../components/Icon';
import PageHeader from '../components/PageHeader';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useAuth } from '../auth/AuthContext';

const paymentOptions = [
  { value: 'CREDITO', label: 'Cartão de crédito', icon: 'credit' },
  { value: 'DEBITO', label: 'Cartão de débito', icon: 'finance' },
  { value: 'PIX', label: 'Pix', icon: 'activity' },
  { value: 'DINHEIRO', label: 'Dinheiro', icon: 'cash' },
];

const ComandasPage = () => {
  const { usuario } = useAuth();
  const [cancelando, setCancelando] = useState(null);
  const cancelarComanda = async (comanda) => {
    if (!window.confirm(`Cancelar a comanda #${comanda.numero}? A mesa será liberada e o atendimento ficará no histórico. Não haverá recebimento nem baixa de estoque.`)) return;
    setCancelando(comanda.id); setError('');
    try { await api.delete(`/comandas/${comanda.id}`); setComandas((atuais) => atuais.filter((c) => c.id !== comanda.id)); }
    catch (err) { setError(err.response?.data?.message || 'Não foi possível cancelar o atendimento.'); }
    finally { setCancelando(null); }
  };
  const [comandas, setComandas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [comandaFaturamento, setComandaFaturamento] = useState(null);
  const [tipoPagamento, setTipoPagamento] = useState('');
  const [faturando, setFaturando] = useState(false);

  const fetchComandasAbertas = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/comandas/abertas');
      const lista = response.data?.content || response.data;
      setComandas(Array.isArray(lista) ? lista : []);
    } catch (err) {
      console.error('Erro ao buscar comandas abertas:', err);
      setError('Não foi possível carregar as comandas abertas. Verifique a conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchComandasAbertas();
  }, [fetchComandasAbertas]);

  const totalEmAberto = useMemo(() => comandas.reduce(
    (sum, comanda) => sum + Number(comanda.total || 0), 0,
  ), [comandas]);

  const fecharModal = () => {
    if (faturando) return;
    setComandaFaturamento(null);
    setTipoPagamento('');
  };

  const confirmarFaturamento = async () => {
    if (!comandaFaturamento || !tipoPagamento) return;
    setFaturando(true);
    setError('');
    try {
      await api.patch(`/comandas/${comandaFaturamento.id}/fechar`, { tipoPagamento });
      setComandas((atuais) => atuais.filter((comanda) => comanda.id !== comandaFaturamento.id));
      fecharModal();
      setComandaFaturamento(null);
      setTipoPagamento('');
    } catch (err) {
      console.error('Erro ao faturar comanda:', err);
      setError(err.response?.data?.message || 'Não foi possível faturar a comanda. Verifique o estoque e tente novamente.');
    } finally {
      setFaturando(false);
    }
  };

  return (
    <div className="page-stack">
      <PageHeader
        actions={(
          <>
            <button className="button" onClick={fetchComandasAbertas} type="button"><Icon name="refresh" size={16} /> Atualizar</button>
            <Link className="button button-primary" to="/pedidos"><Icon name="plus" size={16} /> Novo pedido</Link>
          </>
        )}
        description="Acompanhe os consumos ativos e conclua o atendimento escolhendo a forma de pagamento."
        eyebrow="Atendimento"
        title="Comandas abertas"
      />

      <section className="summary-grid">
        <div className="summary-card"><small>Comandas em atendimento</small><strong>{comandas.length}</strong></div>
        <div className="summary-card warning"><small>Valor total em aberto</small><strong>{formatCurrency(totalEmAberto)}</strong></div>
        <div className="summary-card success"><small>Ticket médio em aberto</small><strong>{formatCurrency(comandas.length ? totalEmAberto / comandas.length : 0)}</strong></div>
      </section>

      {error && <div className="alert alert-error"><Icon name="alert" size={17} />{error}</div>}

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
          {comandas.map((comanda) => (
            <article className="comanda-card" key={comanda.id}>
              <div className="comanda-card-top">
                <div>
                  <h2 className="comanda-number">Comanda #{comanda.numero}</h2>
                  <span className="comanda-table"><Icon name="tables" size={13} /> Mesa {comanda.mesa?.numero || 'não informada'}</span>
                </div>
                <span className="status-badge status-warning">Aberta</span>
              </div>
              <span className="comanda-value-label">Total estimado</span>
              <strong className="comanda-value">{formatCurrency(comanda.total)}</strong>
              <p className="cell-subtitle" style={{ margin: '-8px 0 16px' }}>
                Aberta em {formatDate(comanda.dataHoraAbertura, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </p>
              <button className="button button-success" disabled={Boolean(cancelando)} onClick={() => setComandaFaturamento(comanda)} type="button">
                <Icon name="check" size={16} /> Faturar comanda
              </button>
              {['ADMINISTRADOR','GERENTE'].includes(usuario?.perfil) && <button className="button" disabled={Boolean(cancelando)} type="button" onClick={() => cancelarComanda(comanda)} style={{ marginTop: 10 }}>{cancelando === comanda.id ? 'Cancelando...' : 'Cancelar atendimento'}</button>}
            </article>
          ))}
        </section>
      )}

      {comandaFaturamento && (
        <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && fecharModal()}>
          <div aria-labelledby="payment-title" aria-modal="true" className="modal-card" role="dialog">
            <div className="modal-header">
              <div>
                <h2 className="modal-title" id="payment-title">Faturar comanda #{comandaFaturamento.numero}</h2>
                <p className="modal-subtitle">Mesa {comandaFaturamento.mesa?.numero || 'não informada'} · {formatCurrency(comandaFaturamento.total)}</p>
              </div>
              <button aria-label="Fechar" className="icon-button" disabled={faturando} onClick={fecharModal} type="button"><Icon name="close" size={17} /></button>
            </div>

            <div className="form-field">
              <label className="form-label">Selecione a forma de pagamento</label>
              <div className="payment-options">
                {paymentOptions.map((option) => (
                  <label className={`payment-option ${tipoPagamento === option.value ? 'selected' : ''}`} key={option.value}>
                    <input
                      checked={tipoPagamento === option.value}
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
              <button className="button button-primary" disabled={!tipoPagamento || faturando} onClick={confirmarFaturamento} type="button">
                {faturando ? 'Processando...' : 'Confirmar faturamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComandasPage;
