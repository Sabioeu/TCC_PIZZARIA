import Select from '../components/Select';
import React, { useEffect, useRef, useState } from 'react';
import api from '../api/api';
import Icon from '../components/Icon';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import { useToast } from '../components/ToastProvider';
import './RelatoriosPage.css';

const modelos = [
  { id: 'estoque-entradas', titulo: 'Entradas de estoque', descricao: 'Reposições registradas, por item e período.', icon: 'inventory' },
  { id: 'estoque-saidas', titulo: 'Saídas de estoque', descricao: 'Consumo e saídas registradas para conferência.', icon: 'inventory' },
  { id: 'estoque-posicao', titulo: 'Posição do estoque', descricao: 'Produtos e insumos com seus saldos atuais.', icon: 'reports' },
  { id: 'financeiro', titulo: 'Financeiro', descricao: 'Recebimentos, despesas pagas e saldo dos registros.', icon: 'finance' },
  { id: 'contas-a-pagar', titulo: 'Contas a pagar', descricao: 'Vencimentos, fornecedores e valores em aberto.', icon: 'finance' },
];
const dataLocal = (data) => [data.getFullYear(), String(data.getMonth() + 1).padStart(2, '0'), String(data.getDate()).padStart(2, '0')].join('-');
const hoje = new Date();
const inicial = { nome: 'estoque-entradas', inicio: dataLocal(new Date(hoje.getFullYear(), hoje.getMonth(), 1)), fim: dataLocal(hoje), busca: '', status: '' };
const parametros = ({ nome, ...filtros }) => Object.fromEntries(Object.entries(filtros).filter(([chave, valor]) => valor && !(nome === 'estoque-posicao' && ['inicio', 'fim'].includes(chave)) && !(nome !== 'contas-a-pagar' && chave === 'status')));

export default function RelatoriosPage() {
  const { notify } = useToast();
  const downloadEmCurso = useRef(false);
  const [filtros, setFiltros] = useState(inicial);
  const [consulta, setConsulta] = useState(inicial);
  const [resultado, setResultado] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exportando, setExportando] = useState('');
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setErro(''); setSucesso(''); setResultado(null);
    api.get(`/relatorios/${consulta.nome}/dados`, { params: parametros(consulta), signal: controller.signal, timeout: 60000 })
      .then(({ data }) => { if (!controller.signal.aborted) setResultado(data); })
      .catch(() => { if (!controller.signal.aborted) setErro('Não foi possível consultar o relatório. Confira a conexão e tente novamente.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [consulta]);
  const alterar = (campo, valor) => setFiltros((atual) => ({ ...atual, [campo]: valor }));
  const selecionar = (nome) => {
    const novos = { ...filtros, nome, status: '' };
    setFiltros(novos);
    if (nome === 'estoque-posicao' || !novos.inicio || !novos.fim || novos.inicio <= novos.fim) setConsulta(novos);
    else { setResultado(null); setErro('A data inicial deve ser anterior ou igual à final.'); }
  };
  const consultar = (event) => {
    event.preventDefault();
    if (filtros.nome !== 'estoque-posicao' && filtros.inicio && filtros.fim && filtros.inicio > filtros.fim) { setErro('A data inicial deve ser anterior ou igual à final.'); return; }
    setConsulta({ ...filtros });
  };
  const exportar = async (formato) => {
    if (downloadEmCurso.current) return;
    downloadEmCurso.current = true;
    setExportando(formato); setErro(''); setSucesso('');
    try {
      const response = await api.get(`/relatorios/${consulta.nome}`, { params: { ...parametros(consulta), formato }, responseType: 'blob', timeout: 120000 });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url; link.download = `${consulta.nome}.${formato}`;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setSucesso(`Download em ${formato.toUpperCase()} iniciado com os filtros da consulta exibida.`);
      notify(`Download em ${formato.toUpperCase()} iniciado.`);
    } catch (error) {
      setErro('Não foi possível exportar o relatório. Tente novamente e verifique o backend.');
    } finally { downloadEmCurso.current = false; setExportando(''); }
  };
  const alterado = JSON.stringify(parametros(filtros)) !== JSON.stringify(parametros(consulta)) || filtros.nome !== consulta.nome;
  return (
    <div className="page-stack">
      <PageHeader eyebrow="Inteligência gerencial" title="Central de relatórios" description="Transforme os registros da operação em informações para conferir e acompanhar sua pizzaria." />
      <section className="report-models" aria-label="Tipos de relatório">
        {modelos.map((modelo) => <button type="button" key={modelo.id} className={`report-model ${filtros.nome === modelo.id ? 'selected' : ''}`} aria-pressed={filtros.nome === modelo.id} disabled={loading || Boolean(exportando)} onClick={() => selecionar(modelo.id)}>
          <span className="metric-icon brand"><Icon name={modelo.icon} size={19} /></span>
          <strong>{modelo.titulo}</strong><span>{modelo.descricao}</span>
        </button>)}
      </section>
      <section className="panel">
        <div className="panel-header"><div><h2 className="panel-title">Filtros da consulta</h2><p className="panel-subtitle">{filtros.nome === 'estoque-posicao' ? 'Saldo atual: não utiliza período histórico.' : filtros.nome === 'contas-a-pagar' ? 'O período considera a data de vencimento.' : filtros.nome === 'financeiro' ? 'Recebimentos por data da transação; despesas por data do pagamento.' : 'O período considera a data de movimentação.'}</p></div></div>
        <form className="report-filters panel-body" onSubmit={consultar}>
          <div className="form-field"><label className="form-label" htmlFor="report-inicio">Data inicial</label><input id="report-inicio" type="date" value={filtros.inicio} disabled={filtros.nome === 'estoque-posicao'} onChange={(e) => alterar('inicio', e.target.value)} /></div>
          <div className="form-field"><label className="form-label" htmlFor="report-fim">Data final</label><input id="report-fim" type="date" value={filtros.fim} disabled={filtros.nome === 'estoque-posicao'} onChange={(e) => alterar('fim', e.target.value)} /></div>
          <div className="form-field"><label className="form-label" htmlFor="report-busca">Buscar</label><input id="report-busca" placeholder={filtros.nome.startsWith('estoque') ? 'Nome do item...' : 'Descrição...'} maxLength={150} value={filtros.busca} onChange={(e) => alterar('busca', e.target.value)} /></div>
          {filtros.nome === 'contas-a-pagar' && <div className="form-field"><label className="form-label" htmlFor="report-status">Situação</label><Select id="report-status" value={filtros.status} onChange={(e) => alterar('status', e.target.value)}><option value="">Todas</option><option value="PENDENTE">Pendentes</option><option value="VENCIDA">Vencidas</option><option value="PAGA">Pagas</option></Select></div>}
          <div className="report-filter-actions"><button className="button button-primary" type="submit" disabled={loading || Boolean(exportando)}><Icon name="reports" size={16} /> Consultar</button><button className="button" type="button" disabled={loading || Boolean(exportando)} onClick={() => { const limpos = { ...filtros, inicio: '', fim: '', busca: '', status: '' }; setFiltros(limpos); setConsulta(limpos); }}>Limpar filtros</button></div>
        </form>
      </section>
      {erro && <div role="alert" className="alert alert-error"><Icon name="alert" size={17} />{erro}</div>}
      {sucesso && <div role="status" className="alert alert-success"><Icon name="check" size={17} />{sucesso}</div>}
      {alterado && resultado && <div className="alert">Filtros alterados. Clique em Consultar para atualizar os dados e as exportações.</div>}
      {loading ? <div className="loading-state"><div><div className="spinner" />Consultando registros...</div></div> : resultado && <>
        <section className="summary-grid">{resultado.indicadores.map((indicador) => <div className="summary-card" key={indicador.titulo}><small>{indicador.titulo}</small><strong>{indicador.valor}</strong></div>)}</section>
        <div className="alert report-context"><Icon name="reports" size={17} /><span>{resultado.observacao} Exportações incluem todos os registros da consulta, não apenas a página visível.</span></div>
        <DataTable key={JSON.stringify(consulta)} title={resultado.titulo} description={resultado.periodo} pageSize={20} rows={resultado.linhas.map((linha, id) => ({ ...linha, id }))} columns={resultado.colunas.map((coluna, indice) => ({ key: String(indice), label: coluna, sortable: false, render: (linha) => linha.celulas[indice] }))} emptyTitle="Nenhum registro encontrado" emptyDescription="Experimente outro período ou limpe os filtros. Também é possível exportar o relatório vazio." toolbar={<><button className="button button-primary" type="button" disabled={Boolean(exportando) || alterado} onClick={() => exportar('pdf')}>{exportando === 'pdf' ? 'Gerando PDF...' : 'Baixar PDF'}</button><button className="button" type="button" disabled={Boolean(exportando) || alterado} onClick={() => exportar('csv')}>{exportando === 'csv' ? 'Gerando CSV...' : 'Baixar CSV'}</button></>} />
      </>}
    </div>
  );
}
