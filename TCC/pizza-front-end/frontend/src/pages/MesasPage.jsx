import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api/api';
import Icon from '../components/Icon';
import PageHeader from '../components/PageHeader';

const MesasPage = () => {
  const [mesas, setMesas] = useState([]);
  const [mesaSelecionada, setMesaSelecionada] = useState(null);
  const [novoNumeroMesa, setNovoNumeroMesa] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchMesas = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/mesas');
      setMesas((response.data || []).sort((a, b) => a.numero - b.numero));
    } catch (err) {
      console.error('Erro ao carregar mesas:', err);
      setError('Não foi possível carregar as mesas do salão.');
    } finally {
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

  const criarMesa = async (event) => {
    event.preventDefault();
    if (!novoNumeroMesa) return;
    setCarregando(true);
    setError('');
    try {
      await api.post('/mesas', {
        numero: Number(novoNumeroMesa),
        status: 'DISPONIVEL',
        ativo: true,
      });
      setNovoNumeroMesa('');
      await fetchMesas();
    } catch (err) {
      console.error('Erro ao criar mesa:', err);
      setError(err.response?.data?.message || 'Não foi possível criar a mesa. Verifique se o número já existe.');
    } finally {
      setCarregando(false);
    }
  };

  const alternarAtivacaoMesa = async () => {
    if (!mesaSelecionada) return;
    setCarregando(true);
    setError('');
    try {
      await api.put(`/mesas/${mesaSelecionada.id}`, {
        ...mesaSelecionada,
        ativo: !mesaSelecionada.ativo,
      });
      setMesaSelecionada(null);
      await fetchMesas();
    } catch (err) {
      console.error('Erro ao alterar mesa:', err);
      setError('Não foi possível alterar a disponibilidade da mesa.');
    } finally {
      setCarregando(false);
    }
  };

  const selecionarMesa = (mesa) => {
    if (mesa.status === 'OCUPADA') {
      setError(`A mesa ${mesa.numero} está ocupada e não pode ser desativada durante o atendimento.`);
      return;
    }
    setMesaSelecionada(mesa);
  };

  return (
    <div className="page-stack">
      <PageHeader
        description="Visualize a ocupação do salão, crie novas mesas e controle quais posições estão ativas."
        eyebrow="Salão"
        title="Gestão de mesas"
      />

      <section className="summary-grid">
        <div className="summary-card success"><small>Disponíveis</small><strong>{resumo.disponiveis}</strong></div>
        <div className="summary-card danger"><small>Ocupadas</small><strong>{resumo.ocupadas}</strong></div>
        <div className="summary-card"><small>Inativas</small><strong>{resumo.inativas}</strong></div>
      </section>

      {error && <div className="alert alert-error"><Icon name="alert" size={17} />{error}</div>}

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Mapa do salão</h2>
            <p className="panel-subtitle">Clique em uma mesa livre para ativar ou desativar</p>
          </div>
          <form className="button-row" onSubmit={criarMesa}>
            <input
              aria-label="Número da nova mesa"
              className="search-input"
              min="1"
              onChange={(event) => setNovoNumeroMesa(event.target.value)}
              placeholder="Nº da mesa"
              style={{ width: 130 }}
              type="number"
              value={novoNumeroMesa}
            />
            <button className="button button-primary" disabled={carregando || !novoNumeroMesa} type="submit">
              <Icon name="plus" size={16} /> {carregando ? 'Adicionando...' : 'Adicionar mesa'}
            </button>
          </form>
        </div>

        <div className="panel-body">
          {loading ? (
            <div className="loading-state"><div><div className="spinner" />Carregando salão...</div></div>
          ) : mesas.length === 0 ? (
            <div className="empty-state"><div><div className="empty-state-icon"><Icon name="tables" /></div><strong>Nenhuma mesa cadastrada</strong><p>Use o campo acima para montar o mapa do salão.</p></div></div>
          ) : (
            <div className="tables-grid">
              {mesas.map((mesa) => {
                const stateClass = !mesa.ativo ? 'inactive' : mesa.status === 'OCUPADA' ? 'occupied' : 'available';
                return (
                  <button
                    aria-label={`Mesa ${mesa.numero}, ${!mesa.ativo ? 'inativa' : mesa.status.toLowerCase()}`}
                    className={`table-card ${stateClass}`}
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
        <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setMesaSelecionada(null)}>
          <div aria-labelledby="table-modal-title" aria-modal="true" className="modal-card" role="dialog">
            <div className="modal-header">
              <div>
                <h2 className="modal-title" id="table-modal-title">Mesa {mesaSelecionada.numero}</h2>
                <p className="modal-subtitle">Altere a disponibilidade desta posição no salão.</p>
              </div>
              <button aria-label="Fechar" className="icon-button" onClick={() => setMesaSelecionada(null)} type="button"><Icon name="close" size={17} /></button>
            </div>
            <div className="alert" style={{ color: 'var(--ink-soft)', background: '#fafbfc', borderColor: 'var(--line)' }}>
              <Icon name="tables" size={17} />
              Status atual: <strong>{mesaSelecionada.ativo ? 'Ativa' : 'Inativa'}</strong>
            </div>
            <div className="modal-actions">
              <button className="button" onClick={() => setMesaSelecionada(null)} type="button">Cancelar</button>
              <button className={`button ${mesaSelecionada.ativo ? 'button-danger' : 'button-success'}`} disabled={carregando} onClick={alternarAtivacaoMesa} type="button">
                {mesaSelecionada.ativo ? 'Desativar mesa' : 'Ativar mesa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MesasPage;
