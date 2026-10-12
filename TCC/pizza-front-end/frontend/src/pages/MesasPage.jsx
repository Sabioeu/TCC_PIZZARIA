import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api from '../api/api';
import Icon from '../components/Icon';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import Select from '../components/Select';
import { useToast } from '../components/ToastProvider';
import './Atendimento.css';

const MesasPage = () => {
  const { notify } = useToast();
  const operacaoEmCurso = useRef(false);
  const buscaEmCurso = useRef(false);
  const [mesas, setMesas] = useState([]);
  const [mesaSelecionada, setMesaSelecionada] = useState(null);
  const [novoNumeroMesa, setNovoNumeroMesa] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [erroModal, setErroModal] = useState('');
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('TODAS');

  const fetchMesas = useCallback(async () => {
    if (buscaEmCurso.current) return;
    buscaEmCurso.current = true;
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/mesas');
      setMesas((response.data || []).sort((a, b) => a.numero - b.numero));
    } catch (err) {
      setError('Não foi possível carregar as mesas do salão.');
    } finally {
      buscaEmCurso.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMesas();
  }, [fetchMesas]);

  const resumo = useMemo(() => ({
    disponiveis: mesas.filter((mesa) => mesa.ativo && mesa.status === 'DISPONIVEL').length,
    ocupadas: mesas.filter((mesa) => mesa.ativo && mesa.status === 'OCUPADA').length,
    inativas: mesas.filter((mesa) => !mesa.ativo).length,
  }), [mesas]);
  const mesasFiltradas = useMemo(() => mesas.filter((mesa) => {
    const correspondeBusca = `mesa ${mesa.numero}`.includes(busca.trim().toLowerCase());
    const correspondeStatus = filtroStatus === 'TODAS' || (filtroStatus === 'INATIVA' ? !mesa.ativo : mesa.ativo && mesa.status === filtroStatus);
    return correspondeBusca && correspondeStatus;
  }), [mesas, busca, filtroStatus]);

  const criarMesa = async (event) => {
    event.preventDefault();
    if (operacaoEmCurso.current || buscaEmCurso.current || !novoNumeroMesa) return;
    const numero = Number(novoNumeroMesa);
    if (!Number.isInteger(numero) || numero < 1 || numero > 2147483647) { setError('Informe um número inteiro positivo para a mesa.'); return; }
    operacaoEmCurso.current = true;
    setCarregando(true);
    setError('');
    try {
      await api.post('/mesas', {
        numero,
        status: 'DISPONIVEL',
        ativo: true,
      });
      setNovoNumeroMesa('');
      notify(`Mesa ${numero} adicionada ao salão.`, { type: 'success' });
      await fetchMesas();
    } catch (err) {
      setError(err.response?.data?.message || 'Não foi possível criar a mesa. Verifique se o número já existe.');
    } finally {
      operacaoEmCurso.current = false;
      setCarregando(false);
    }
  };

  const alternarAtivacaoMesa = async () => {
    if (!mesaSelecionada || operacaoEmCurso.current || buscaEmCurso.current) return;
    operacaoEmCurso.current = true;
    setCarregando(true);
    setErroModal('');
    try {
      await api.put(`/mesas/${mesaSelecionada.id}`, {
        ...mesaSelecionada,
        ativo: !mesaSelecionada.ativo,
      });
      notify(`Mesa ${mesaSelecionada.numero} ${mesaSelecionada.ativo ? 'desativada' : 'ativada'}.`, { type: 'success' });
      setMesaSelecionada(null);
      await fetchMesas();
    } catch (err) {
      setErroModal(err.response?.data?.message || 'Não foi possível alterar a disponibilidade da mesa.');
    } finally {
      operacaoEmCurso.current = false;
      setCarregando(false);
    }
  };

  const selecionarMesa = (mesa) => {
    if (operacaoEmCurso.current) return;
    if (mesa.status === 'OCUPADA') {
      setError(`A mesa ${mesa.numero} está ocupada e não pode ser desativada durante o atendimento.`);
      return;
    }
    setError('');
    setErroModal('');
    setMesaSelecionada(mesa);
  };
  const fecharModal = () => { if (!operacaoEmCurso.current) { setMesaSelecionada(null); setErroModal(''); } };

  return (
    <div className="page-stack">
      <PageHeader
        actions={<button className="button" disabled={loading || carregando} onClick={fetchMesas} type="button"><Icon name="refresh" size={16} />{loading ? 'Atualizando...' : 'Atualizar salão'}</button>}
        description="Visualize a ocupação do salão, crie novas mesas e controle quais posições estão ativas."
        eyebrow="Salão"
        title="Gestão de mesas"
      />

      <section className="summary-grid">
        <div className="summary-card success"><small>Disponíveis</small><strong>{resumo.disponiveis}</strong></div>
        <div className="summary-card danger"><small>Ocupadas</small><strong>{resumo.ocupadas}</strong></div>
        <div className="summary-card"><small>Inativas</small><strong>{resumo.inativas}</strong></div>
      </section>

      {error && <div className="alert alert-error" role="alert"><Icon name="alert" size={17} />{error}</div>}

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Mapa do salão</h2>
            <p className="panel-subtitle">Clique em uma mesa livre para ativar ou desativar</p>
          </div>
          <form aria-label="Adicionar mesa" className="button-row" onSubmit={criarMesa}>
            <input
              aria-label="Número da nova mesa"
              className="search-input"
              min="1"
              max="2147483647"
              step="1"
              disabled={carregando}
              onChange={(event) => setNovoNumeroMesa(event.target.value)}
              placeholder="Nº da mesa"
              style={{ width: 130 }}
              type="number"
              value={novoNumeroMesa}
            />
            <button className="button button-primary" aria-busy={carregando} disabled={loading || carregando || !novoNumeroMesa} type="submit">
              <Icon name="plus" size={16} /> {carregando ? 'Adicionando...' : 'Adicionar mesa'}
            </button>
          </form>
        </div>

        <div className="panel-body">
          <div className="atendimento-filter-grid mesas-filter-grid">
            <div className="form-field"><label className="form-label" htmlFor="buscaMesas">Buscar mesa</label><input className="search-input" id="buscaMesas" type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Número da mesa..." /></div>
            <div className="form-field"><label className="form-label" htmlFor="filtroMesas">Disponibilidade</label><Select id="filtroMesas" value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}><option value="TODAS">Todas as mesas</option><option value="DISPONIVEL">Disponíveis</option><option value="OCUPADA">Ocupadas</option><option value="INATIVA">Inativas</option></Select></div>
          </div>
          <div className="atendimento-filter-footer"><span aria-live="polite">{mesasFiltradas.length} de {mesas.length} mesas</span>{(busca || filtroStatus !== 'TODAS') && <button className="button button-sm" type="button" onClick={() => { setBusca(''); setFiltroStatus('TODAS'); }}>Limpar filtros</button>}</div>
          {loading ? (
            <div className="loading-state"><div><div className="spinner" />Carregando salão...</div></div>
          ) : mesas.length === 0 ? (
            <div className="empty-state"><div><div className="empty-state-icon"><Icon name="tables" /></div><strong>Nenhuma mesa cadastrada</strong><p>Use o campo acima para montar o mapa do salão.</p></div></div>
          ) : mesasFiltradas.length === 0 ? (
            <div className="empty-state"><div><div className="empty-state-icon"><Icon name="search" /></div><strong>Nenhuma mesa encontrada</strong><p>Altere a busca ou a disponibilidade para ver as outras mesas.</p><button className="button" type="button" onClick={() => { setBusca(''); setFiltroStatus('TODAS'); }}>Limpar filtros</button></div></div>
          ) : (
            <div className="tables-grid">
              {mesasFiltradas.map((mesa) => {
                const stateClass = !mesa.ativo ? 'inactive' : mesa.status === 'OCUPADA' ? 'occupied' : 'available';
                return (
                  <button
                    aria-label={`Mesa ${mesa.numero}, ${!mesa.ativo ? 'inativa' : mesa.status.toLowerCase()}`}
                    className={`table-card ${stateClass}`}
                    disabled={carregando}
                    key={mesa.id}
                    onClick={() => selecionarMesa(mesa)}
                    type="button"
                  >
                    <span className="table-icon"><Icon name="tables" size={17} /></span>
                    <span className="table-number">Mesa {mesa.numero}</span>
                    <span className="table-status">{!mesa.ativo ? 'Inativa' : mesa.status === 'OCUPADA' ? 'Ocupada' : 'Disponível'}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {mesaSelecionada && (
        <Modal busy={carregando} error={erroModal} onClose={fecharModal} title={`Mesa ${mesaSelecionada.numero}`} subtitle="Altere a disponibilidade desta posição no salão.">
            <div className="alert" style={{ color: 'var(--ink-soft)', background: '#fafbfc', borderColor: 'var(--line)' }}>
              <Icon name="tables" size={17} />
              Status atual: <strong>{mesaSelecionada.ativo ? 'Ativa' : 'Inativa'}</strong>
            </div>
            <div className="modal-actions">
              <button className="button" disabled={carregando} onClick={fecharModal} type="button">Cancelar</button>
              <button className={`button ${mesaSelecionada.ativo ? 'button-danger' : 'button-success'}`} aria-busy={carregando} disabled={carregando} onClick={alternarAtivacaoMesa} type="button">
                {carregando ? 'Salvando...' : mesaSelecionada.ativo ? 'Desativar mesa' : 'Ativar mesa'}
              </button>
            </div>
        </Modal>
      )}
    </div>
  );
};

export default MesasPage;
