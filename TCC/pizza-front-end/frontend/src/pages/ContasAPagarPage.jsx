import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api/api';
import Icon from '../components/Icon';
import PageHeader from '../components/PageHeader';
import { formatCurrency, formatDate } from '../utils/formatters';

const currentMonth = new Date().toISOString().slice(0, 7);

const ContasAPagarPage = () => {
  const [contas, setContas] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [abaAtiva, setAbaAtiva] = useState('pendentes');
  const [modalAtivo, setModalAtivo] = useState(null);
  const [contaSelecionada, setContaSelecionada] = useState(null);
  const [filtroMes, setFiltroMes] = useState(currentMonth);
  const [filtroFornecedor, setFiltroFornecedor] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const carregarDados = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [contasResponse, fornecedoresResponse] = await Promise.all([
        api.get('/contas'),
        api.get('/fornecedores', { params: { apenasAtivos: true } }),
      ]);
      setContas(contasResponse.data || []);
      setFornecedores(fornecedoresResponse.data || []);
    } catch (err) {
      console.error('Erro ao carregar contas:', err);
      setError('Não foi possível carregar os compromissos financeiros.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const resumo = useMemo(() => ({
    vencidas: contas.filter((conta) => conta.status === 'VENCIDA').reduce((sum, conta) => sum + Number(conta.valor || 0), 0),
    pendentes: contas.filter((conta) => conta.status === 'PENDENTE').reduce((sum, conta) => sum + Number(conta.valor || 0), 0),
    pagas: contas.filter((conta) => conta.status === 'PAGA').reduce((sum, conta) => sum + Number(conta.valor || 0), 0),
  }), [contas]);

  const contasExibidas = useMemo(() => contas.filter((conta) => {
    if (abaAtiva === 'pendentes') return conta.status !== 'PAGA';
    const dataReferencia = conta.dataPagamento || conta.dataVencimento || '';
    const combinaMes = !filtroMes || dataReferencia.startsWith(filtroMes);
    const combinaFornecedor = !filtroFornecedor || String(conta.fornecedor?.id) === filtroFornecedor;
    return conta.status === 'PAGA' && combinaMes && combinaFornecedor;
  }), [abaAtiva, contas, filtroFornecedor, filtroMes]);

  const salvarNovaConta = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError('');
    try {
      const response = await api.post('/contas', {
        descricao: form.get('descricao'),
        fornecedorId: Number(form.get('fornecedorId')),
        valorTotal: Number(form.get('valorTotal')),
        primeiroVencimento: form.get('primeiroVencimento'),
        parcelas: Number(form.get('parcelas')) || 1,
      });
      setContas((atuais) => [...atuais, ...(response.data || [])]);
      setModalAtivo(null);
    } catch (err) {
      console.error('Erro ao criar conta:', err);
      setError(err.response?.data?.message || 'Não foi possível salvar o lançamento.');
    } finally {
      setSaving(false);
    }
  };

  const confirmarPagamento = async () => {
    if (!contaSelecionada) return;
    setSaving(true);
    setError('');
    try {
      const response = await api.patch(`/contas/${contaSelecionada.id}/pagar`);
      setContas((atuais) => atuais.map((conta) => conta.id === response.data.id ? response.data : conta));
      fecharModal();
    } catch (err) {
      console.error('Erro ao pagar conta:', err);
      setError(err.response?.data?.message || 'Não foi possível concluir a baixa da conta.');
    } finally {
      setSaving(false);
    }
  };

  const salvarEdicao = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError('');
    try {
      const response = await api.put(`/contas/${contaSelecionada.id}`, {
        descricao: form.get('descricao'),
        valor: Number(form.get('valor')),
        dataVencimento: form.get('dataVencimento'),
      });
      setContas((atuais) => atuais.map((conta) => conta.id === response.data.id ? response.data : conta));
      fecharModal();
    } catch (err) {
      console.error('Erro ao editar conta:', err);
      setError(err.response?.data?.message || 'Não foi possível atualizar a conta.');
    } finally {
      setSaving(false);
    }
  };

  const excluirConta = async (conta) => {
    const mensagem = conta.grupoId
      ? 'Esta conta pertence a um parcelamento. Todas as parcelas pendentes do grupo serão removidas. Deseja continuar?'
      : 'Deseja excluir este lançamento?';
    if (!window.confirm(mensagem)) return;
    setError('');
    try {
      await api.delete(`/contas/${conta.id}`);
      setContas((atuais) => conta.grupoId
        ? atuais.filter((item) => item.grupoId !== conta.grupoId)
        : atuais.filter((item) => item.id !== conta.id));
    } catch (err) {
      console.error('Erro ao excluir conta:', err);
      setError(err.response?.data?.message || 'Não foi possível excluir o lançamento.');
    }
  };

  const abrirModal = (tipo, conta = null) => {
    setContaSelecionada(conta);
    setModalAtivo(tipo);
  };

  const fecharModal = () => {
    if (saving) return;
    setModalAtivo(null);
    setContaSelecionada(null);
  };

  return (
    <div className="page-stack">
      <PageHeader
        actions={<button className="button button-primary" onClick={() => abrirModal('novo')} type="button"><Icon name="plus" size={16} /> Novo lançamento</button>}
        description="Controle vencimentos, parcelamentos e baixas com informações persistidas no financeiro."
        eyebrow="Financeiro"
        title="Contas a pagar"
      />

      <section className="summary-grid">
        <div className="summary-card warning"><small>Pendente</small><strong>{formatCurrency(resumo.pendentes)}</strong></div>
        <div className="summary-card danger"><small>Vencido</small><strong>{formatCurrency(resumo.vencidas)}</strong></div>
        <div className="summary-card success"><small>Total já pago</small><strong>{formatCurrency(resumo.pagas)}</strong></div>
      </section>

      {error && <div className="alert alert-error"><Icon name="alert" size={17} />{error}</div>}

      <section className="panel">
        <div className="panel-header" style={{ alignItems: 'center' }}>
          <div className="tabs">
            <button className={`tab ${abaAtiva === 'pendentes' ? 'active' : ''}`} onClick={() => setAbaAtiva('pendentes')} type="button">Em aberto</button>
            <button className={`tab ${abaAtiva === 'pagas' ? 'active' : ''}`} onClick={() => setAbaAtiva('pagas')} type="button">Histórico pago</button>
          </div>
          {abaAtiva === 'pagas' && (
            <div className="filters-row">
              <input className="field-control" onChange={(event) => setFiltroMes(event.target.value)} style={{ width: 150 }} type="month" value={filtroMes} />
              <select className="field-control" onChange={(event) => setFiltroFornecedor(event.target.value)} style={{ width: 190 }} value={filtroFornecedor}>
                <option value="">Todos os fornecedores</option>
                {fornecedores.map((fornecedor) => <option key={fornecedor.id} value={fornecedor.id}>{fornecedor.nome}</option>)}
              </select>
            </div>
          )}
        </div>

        {loading ? (
          <div className="loading-state"><div><div className="spinner" />Carregando lançamentos...</div></div>
        ) : contasExibidas.length === 0 ? (
          <div className="empty-state"><div><div className="empty-state-icon"><Icon name="wallet" /></div><strong>Nenhum lançamento encontrado</strong><p>{abaAtiva === 'pendentes' ? 'Não há compromissos em aberto.' : 'Ajuste o mês ou o fornecedor selecionado.'}</p></div></div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Descrição</th><th>Vencimento</th><th>Valor</th><th>Status</th><th style={{ textAlign: 'right' }}>Ações</th></tr></thead>
              <tbody>
                {contasExibidas.map((conta) => (
                  <tr key={conta.id}>
                    <td><span className="cell-title">{conta.descricao}</span><span className="cell-subtitle">{conta.fornecedor?.nome || 'Sem fornecedor'}{conta.grupoId ? ' · parcelada' : ''}</span></td>
                    <td>{formatDate(conta.dataVencimento)}</td>
                    <td><span className="cell-title">{formatCurrency(conta.valor)}</span></td>
                    <td><StatusConta status={conta.status} /></td>
                    <td>
                      {conta.status !== 'PAGA' ? (
                        <div className="table-actions">
                          <button className="button button-success button-sm" onClick={() => abrirModal('pagar', conta)} type="button">Baixar</button>
                          <button aria-label="Editar conta" className="icon-button" onClick={() => abrirModal('editar', conta)} type="button"><Icon name="edit" size={15} /></button>
                          <button aria-label="Excluir conta" className="icon-button" onClick={() => excluirConta(conta)} style={{ color: 'var(--red)' }} type="button"><Icon name="trash" size={15} /></button>
                        </div>
                      ) : <div className="table-actions"><span className="cell-subtitle">Pago em {formatDate(conta.dataPagamento)}</span></div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modalAtivo === 'novo' && (
        <Modal onClose={fecharModal} subtitle="Cadastre uma conta única ou gere as parcelas automaticamente." title="Novo lançamento">
          <form className="form-grid" onSubmit={salvarNovaConta}>
            <Field className="full-span" label="Descrição"><input name="descricao" placeholder="Ex.: Compra mensal de bebidas" required /></Field>
            <Field className="full-span" label="Fornecedor"><select name="fornecedorId" required><option value="">Selecione...</option>{fornecedores.map((fornecedor) => <option key={fornecedor.id} value={fornecedor.id}>{fornecedor.nome}</option>)}</select></Field>
            <Field label="Valor total"><input min="0.01" name="valorTotal" placeholder="0,00" required step="0.01" type="number" /></Field>
            <Field label="Primeiro vencimento"><input name="primeiroVencimento" required type="date" /></Field>
            <Field label="Parcelas"><input defaultValue="1" min="1" name="parcelas" required type="number" /></Field>
            <div className="form-actions"><button className="button" onClick={fecharModal} type="button">Cancelar</button><button className="button button-primary" disabled={saving} type="submit">{saving ? 'Salvando...' : 'Salvar lançamento'}</button></div>
          </form>
        </Modal>
      )}

      {modalAtivo === 'pagar' && contaSelecionada && (
        <Modal onClose={fecharModal} subtitle="A baixa registrará a data de pagamento de hoje." title="Confirmar pagamento">
          <div className="alert alert-success"><Icon name="check" size={17} />{contaSelecionada.descricao} · {formatCurrency(contaSelecionada.valor)}</div>
          <div className="modal-actions"><button className="button" onClick={fecharModal} type="button">Voltar</button><button className="button button-success" disabled={saving} onClick={confirmarPagamento} type="button">{saving ? 'Processando...' : 'Confirmar baixa'}</button></div>
        </Modal>
      )}

      {modalAtivo === 'editar' && contaSelecionada && (
        <Modal onClose={fecharModal} subtitle="Atualize os dados deste compromisso financeiro." title="Editar lançamento">
          <form className="form-grid" onSubmit={salvarEdicao}>
            <Field className="full-span" label="Descrição"><input defaultValue={contaSelecionada.descricao} name="descricao" required /></Field>
            <Field label="Valor"><input defaultValue={contaSelecionada.valor} min="0.01" name="valor" required step="0.01" type="number" /></Field>
            <Field label="Vencimento"><input defaultValue={contaSelecionada.dataVencimento} name="dataVencimento" required type="date" /></Field>
            <div className="form-actions"><button className="button" onClick={fecharModal} type="button">Cancelar</button><button className="button button-primary" disabled={saving} type="submit">{saving ? 'Salvando...' : 'Salvar alterações'}</button></div>
          </form>
        </Modal>
      )}
    </div>
  );
};

const Field = ({ children, className = '', label }) => <div className={`form-field ${className}`}><label className="form-label">{label}</label>{children}</div>;

const Modal = ({ children, onClose, subtitle, title }) => (
  <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <div aria-modal="true" className="modal-card" role="dialog">
      <div className="modal-header"><div><h2 className="modal-title">{title}</h2><p className="modal-subtitle">{subtitle}</p></div><button aria-label="Fechar" className="icon-button" onClick={onClose} type="button"><Icon name="close" size={17} /></button></div>
      {children}
    </div>
  </div>
);

const StatusConta = ({ status }) => {
  const config = {
    PAGA: ['status-success', 'Paga'],
    VENCIDA: ['status-danger', 'Vencida'],
    PENDENTE: ['status-warning', 'Pendente'],
  }[status] || ['status-neutral', status];
  return <span className={`status-badge ${config[0]}`}>{config[1]}</span>;
};

export default ContasAPagarPage;
