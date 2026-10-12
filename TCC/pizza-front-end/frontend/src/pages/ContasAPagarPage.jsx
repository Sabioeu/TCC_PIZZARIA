import Select from '../components/Select';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import DataTable from '../components/DataTable';
import { useToast } from '../components/ToastProvider';
import { apiErrorMessage } from '../utils/apiError';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api from '../api/api';
import Icon from '../components/Icon';
import PageHeader from '../components/PageHeader';
import { formatCurrency, formatDate, localDate } from '../utils/formatters';

const currentMonth = localDate().slice(0, 7);

const ContasAPagarPage = () => {
  const { notify } = useToast();
  const operacao = useRef(false);
  const [contaExcluir, setContaExcluir] = useState(null);
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
      setError(apiErrorMessage(err, 'Não foi possível carregar os compromissos financeiros.'));
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
    if (operacao.current) return;
    operacao.current = true;
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
      setModalAtivo(null); setContaSelecionada(null);
      notify('Lançamento financeiro cadastrado.');
    } catch (err) {
      setError(apiErrorMessage(err, 'Não foi possível salvar o lançamento.'));
    } finally {
      operacao.current = false; setSaving(false);
    }
  };

  const confirmarPagamento = async () => {
    if (!contaSelecionada || operacao.current) return;
    operacao.current = true;
    setSaving(true);
    setError('');
    try {
      const response = await api.patch(`/contas/${contaSelecionada.id}/pagar`);
      setContas((atuais) => atuais.map((conta) => conta.id === response.data.id ? response.data : conta));
      setModalAtivo(null); setContaSelecionada(null);
      notify('Pagamento registrado com sucesso.');
    } catch (err) {
      setError(apiErrorMessage(err, 'Não foi possível concluir a baixa da conta.'));
    } finally {
      operacao.current = false; setSaving(false);
    }
  };

  const salvarEdicao = async (event) => {
    event.preventDefault();
    if (operacao.current || !contaSelecionada) return;
    operacao.current = true;
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
      setModalAtivo(null); setContaSelecionada(null);
      notify('Lançamento atualizado.');
    } catch (err) {
      setError(apiErrorMessage(err, 'Não foi possível atualizar a conta.'));
    } finally {
      operacao.current = false; setSaving(false);
    }
  };

  const excluirConta = async (conta) => {
    if (operacao.current) return;
    operacao.current = true; setSaving(true);
    setError('');
    try {
      await api.delete(`/contas/${conta.id}`);
      setContas((atuais) => conta.grupoId
        ? atuais.filter((item) => item.grupoId !== conta.grupoId || item.status === 'PAGA')
        : atuais.filter((item) => item.id !== conta.id));
      setContaExcluir(null); notify('Lançamentos em aberto excluídos. Parcelas pagas foram preservadas.');
    } catch (err) {
      setError(apiErrorMessage(err, 'Não foi possível excluir o lançamento.'));
    } finally { operacao.current = false; setSaving(false); }
  };

  const abrirModal = (tipo, conta = null) => {
    if (operacao.current) return;
    setError(''); setContaSelecionada(conta);
    setModalAtivo(tipo);
  };

  const fecharModal = () => {
    if (operacao.current) return;
    setModalAtivo(null);
    setContaSelecionada(null);
  };

  return (
    <div className="page-stack">
      <PageHeader
        actions={<button disabled={saving || loading} className="button button-primary" onClick={() => abrirModal('novo')} type="button"><Icon name="plus" size={16} /> Novo lançamento</button>}
        description="Controle vencimentos, parcelamentos e baixas com informações persistidas no financeiro."
        eyebrow="Financeiro"
        title="Contas a pagar"
      />

      <section className="summary-grid">
        <div className="summary-card warning"><small>Pendente</small><strong>{formatCurrency(resumo.pendentes)}</strong></div>
        <div className="summary-card danger"><small>Vencido</small><strong>{formatCurrency(resumo.vencidas)}</strong></div>
        <div className="summary-card success"><small>Total já pago</small><strong>{formatCurrency(resumo.pagas)}</strong></div>
      </section>

      {error && !modalAtivo && !contaExcluir && <div role="alert" className="alert alert-error"><Icon name="alert" size={17} />{error}</div>}

      <DataTable key={abaAtiva} title={abaAtiva === 'pendentes' ? 'Compromissos em aberto' : 'Histórico de pagamentos'} description="Busque por descrição ou fornecedor. Ordene as colunas para organizar a conferência." rows={contasExibidas} loading={loading} searchKeys={['descricao', 'fornecedor.nome']} searchPlaceholder="Buscar lançamento ou fornecedor..." emptyTitle="Nenhum lançamento encontrado" emptyDescription={abaAtiva === 'pendentes' ? 'Não há compromissos em aberto.' : 'Ajuste o mês ou o fornecedor selecionado.'} defaultSort={{ key: 'dataVencimento', direction: abaAtiva === 'pendentes' ? 'asc' : 'desc' }} toolbar={<>
        <div className="tabs" aria-label="Situação das contas"><button aria-pressed={abaAtiva === 'pendentes'} className={`tab ${abaAtiva === 'pendentes' ? 'active' : ''}`} onClick={() => setAbaAtiva('pendentes')} type="button">Em aberto</button><button aria-pressed={abaAtiva === 'pagas'} className={`tab ${abaAtiva === 'pagas' ? 'active' : ''}`} onClick={() => setAbaAtiva('pagas')} type="button">Histórico pago</button></div>
        {abaAtiva === 'pagas' && <><div className="compact-field"><label htmlFor="contas-mes">Mês do pagamento</label><input id="contas-mes" className="field-control" onChange={(event) => setFiltroMes(event.target.value)} type="month" value={filtroMes} /></div><Select aria-label="Filtrar fornecedor" onChange={(event) => setFiltroFornecedor(event.target.value)} value={filtroFornecedor}><option value="">Todos os fornecedores</option>{fornecedores.map((fornecedor) => <option key={fornecedor.id} value={fornecedor.id}>{fornecedor.nome}</option>)}</Select><button type="button" className="button button-sm" onClick={() => { setFiltroMes(''); setFiltroFornecedor(''); }}>Todo o histórico</button></>}
        <button type="button" className="button button-sm" onClick={carregarDados} disabled={saving || loading}><Icon name="refresh" size={15} /> Atualizar</button>
      </>} columns={[
        { key: 'descricao', label: 'Descrição', render: (conta) => <><span className="cell-title">{conta.descricao}</span><span className="cell-subtitle">{conta.fornecedor?.nome || 'Sem fornecedor'}{conta.grupoId ? ' · parcelada' : ''}</span></> },
        { key: 'dataVencimento', label: abaAtiva === 'pendentes' ? 'Vencimento' : 'Pagamento', value: (conta) => abaAtiva === 'pendentes' ? conta.dataVencimento : conta.dataPagamento, render: (conta) => formatDate(abaAtiva === 'pendentes' ? conta.dataVencimento : conta.dataPagamento) },
        { key: 'valor', label: 'Valor', value: (conta) => Number(conta.valor), render: (conta) => <span className="cell-title">{formatCurrency(conta.valor)}</span> },
        { key: 'status', label: 'Status', render: (conta) => <StatusConta status={conta.status} /> },
        { key: 'acoes', label: 'Ações', align: 'right', sortable: false, render: (conta) => conta.status !== 'PAGA' ? <div className="table-actions"><button className="button button-success button-sm" disabled={saving} onClick={() => abrirModal('pagar', conta)} type="button">Baixar</button><button aria-label={`Editar ${conta.descricao}`} className="icon-button" disabled={saving} onClick={() => abrirModal('editar', conta)} type="button"><Icon name="edit" size={15} /></button><button aria-label={`Excluir ${conta.descricao}`} className="icon-button" disabled={saving} onClick={() => { setError(''); setContaExcluir(conta); }} style={{ color: 'var(--red)' }} type="button"><Icon name="trash" size={15} /></button></div> : <span className="status-badge status-success">Baixa registrada</span> },
      ]} />
      {contaExcluir && <ConfirmDialog title="Excluir lançamento em aberto?" description={contaExcluir.grupoId ? 'Este lançamento é parcelado. Todas as parcelas em aberto do grupo serão excluídas; parcelas já pagas permanecerão no histórico.' : `O lançamento "${contaExcluir.descricao}" será excluído. Esta ação não pode ser desfeita.`} confirmLabel="Excluir lançamento" busy={saving} error={error} onCancel={() => { if (!operacao.current) { setContaExcluir(null); setError(''); } }} onConfirm={() => excluirConta(contaExcluir)} />}

      {modalAtivo === 'novo' && (
        <Modal error={error} busy={saving} onClose={fecharModal} subtitle="Cadastre uma conta única ou gere as parcelas automaticamente." title="Novo lançamento">
          <form aria-busy={saving} className="form-grid" onSubmit={salvarNovaConta}>
            <Field className="full-span" label="Descrição"><input id="conta-nova-descricao" maxLength={200} disabled={saving} name="descricao" placeholder="Ex.: Compra mensal de bebidas" required /></Field>
            <Field className="full-span" label="Fornecedor"><Select disabled={saving} name="fornecedorId" required><option value="">Selecione...</option>{fornecedores.map((fornecedor) => <option key={fornecedor.id} value={fornecedor.id}>{fornecedor.nome}</option>)}</Select></Field>
            <Field label="Valor total"><input disabled={saving} min="0.01" name="valorTotal" placeholder="0,00" required step="0.01" type="number" /></Field>
            <Field label="Primeiro vencimento"><input disabled={saving} name="primeiroVencimento" required type="date" /></Field>
            <p className="form-hint full-span">As parcelas somam o valor total informado. A última pode ajustar centavos para manter o total exato.</p>
            <Field label="Parcelas"><input defaultValue="1" disabled={saving} min="1" max="120" name="parcelas" required type="number" /></Field>
            <div className="form-actions"><button className="button" onClick={fecharModal} type="button">Cancelar</button><button className="button button-primary" disabled={saving} type="submit">{saving ? 'Salvando...' : 'Salvar lançamento'}</button></div>
          </form>
        </Modal>
      )}

      {modalAtivo === 'pagar' && contaSelecionada && (
        <Modal error={error} busy={saving} onClose={fecharModal} subtitle="A baixa registrará a data de pagamento de hoje." title="Confirmar pagamento">
          <div className="alert alert-success"><Icon name="check" size={17} />{contaSelecionada.descricao} · {formatCurrency(contaSelecionada.valor)}</div>
          <div className="modal-actions"><button className="button" onClick={fecharModal} type="button">Voltar</button><button className="button button-success" disabled={saving} onClick={confirmarPagamento} type="button">{saving ? 'Processando...' : 'Confirmar baixa'}</button></div>
        </Modal>
      )}

      {modalAtivo === 'editar' && contaSelecionada && (
        <Modal error={error} busy={saving} onClose={fecharModal} subtitle="Atualize os dados deste compromisso financeiro." title="Editar lançamento">
          <form aria-busy={saving} className="form-grid" onSubmit={salvarEdicao}>
            <Field className="full-span" label="Descrição"><input defaultValue={contaSelecionada.descricao} maxLength={200} disabled={saving} name="descricao" required /></Field>
            <Field label="Valor"><input defaultValue={contaSelecionada.valor} disabled={saving} min="0.01" name="valor" required step="0.01" type="number" /></Field>
            <Field label="Vencimento"><input defaultValue={contaSelecionada.dataVencimento} disabled={saving} name="dataVencimento" required type="date" /></Field>
            <div className="form-actions"><button className="button" onClick={fecharModal} type="button">Cancelar</button><button className="button button-primary" disabled={saving} type="submit">{saving ? 'Salvando...' : 'Salvar alterações'}</button></div>
          </form>
        </Modal>
      )}
    </div>
  );
};

const Field = ({ children, className = '', label }) => {
  const id = React.useId();
  const control = React.isValidElement(children) ? React.cloneElement(children, { id: children.props.id || id }) : children;
  return <div className={`form-field ${className}`}><label className="form-label" htmlFor={control?.props?.id}>{label}</label>{control}</div>;
};

const StatusConta = ({ status }) => {
  const config = {
    PAGA: ['status-success', 'Paga'],
    VENCIDA: ['status-danger', 'Vencida'],
    PENDENTE: ['status-warning', 'Pendente'],
  }[status] || ['status-neutral', status];
  return <span className={`status-badge ${config[0]}`}>{config[1]}</span>;
};

export default ContasAPagarPage;
