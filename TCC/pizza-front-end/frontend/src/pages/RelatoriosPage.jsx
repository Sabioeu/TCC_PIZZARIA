import React, { useEffect, useState } from 'react';
import api from '../api/api';
import Icon from '../components/Icon';
import PageHeader from '../components/PageHeader';
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
  const [filtros, setFiltros] = useState(inicial);
  const [consulta, setConsulta] = useState(inicial);
  const [resultado, setResultado] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exportando, setExportando] = useState('');
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [pagina, setPagina] = useState(1);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setErro(''); setSucesso(''); setResultado(null); setPagina(1);
    api.get(`/relatorios/${consulta.nome}/dados`, { params: parametros(consulta), signal: controller.signal, timeout: 60000 })
      .then(({ data }) => { if (!controller.signal.aborted) setResultado(data); })
      .catch((error) => { if (!controller.signal.aborted) setErro(error.response?.data?.message || 'Não foi possível consultar. Verifique se o backend foi reiniciado com os novos relatórios.'); })
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
    setExportando(formato); setErro(''); setSucesso('');
    try {
      const response = await api.get(`/relatorios/${consulta.nome}`, { params: { ...parametros(consulta), formato }, responseType: 'blob', timeout: 120000 });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url; link.download = `${consulta.nome}.${formato}`;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setSucesso(`Download em ${formato.toUpperCase()} iniciado com os filtros da consulta exibida.`);
    } catch (error) {
      setErro('Não foi possível exportar o relatório. Tente novamente e verifique o backend.');
    } finally { setExportando(''); }
  };
  const paginas = Math.max(1, Math.ceil((resultado?.linhas.length || 0) / 20));
  const linhas = resultado?.linhas.slice((pagina - 1) * 20, pagina * 20) || [];
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
          {filtros.nome === 'contas-a-pagar' && <div className="form-field"><label className="form-label" htmlFor="report-status">Situação</label><select id="report-status" value={filtros.status} onChange={(e) => alterar('status', e.target.value)}><option value="">Todas</option><option value="PENDENTE">Pendentes</option><option value="VENCIDA">Vencidas</option><option value="PAGA">Pagas</option></select></div>}
          <div className="report-filter-actions"><button className="button button-primary" type="submit" disabled={loading || Boolean(exportando)}><Icon name="reports" size={16} /> Consultar</button><button className="button" type="button" disabled={loading || Boolean(exportando)} onClick={() => { const limpos = { ...filtros, inicio: '', fim: '', busca: '', status: '' }; setFiltros(limpos); setConsulta(limpos); }}>Limpar filtros</button></div>
        </form>
      </section>
      {erro && <div role="alert" className="alert alert-error"><Icon name="alert" size={17} />{erro}</div>}
      {sucesso && <div role="status" className="alert alert-success"><Icon name="check" size={17} />{sucesso}</div>}
      {alterado && resultado && <div className="alert">Filtros alterados. Clique em Consultar para atualizar os dados e as exportações.</div>}
      {loading ? <div className="loading-state"><div><div className="spinner" />Consultando registros...</div></div> : resultado && <>
        <section className="summary-grid">{resultado.indicadores.map((indicador) => <div className="summary-card" key={indicador.titulo}><small>{indicador.titulo}</small><strong>{indicador.valor}</strong></div>)}</section>
        <section className="panel">
          <div className="panel-header report-result-header"><div><h2 className="panel-title">{resultado.titulo}</h2><p className="panel-subtitle">{resultado.periodo}</p></div><div className="report-filter-actions"><button className="button button-primary" type="button" disabled={Boolean(exportando) || alterado} onClick={() => exportar('pdf')}>{exportando === 'pdf' ? 'Gerando PDF...' : 'Baixar PDF'}</button><button className="button" type="button" disabled={Boolean(exportando) || alterado} onClick={() => exportar('csv')}>{exportando === 'csv' ? 'Gerando CSV...' : 'Baixar CSV'}</button></div></div>
          <p className="report-note">{resultado.observacao}</p>
          {resultado.linhas.length === 0 ? <div className="empty-state"><div><Icon name="reports" /><strong>Nenhum registro encontrado</strong><p>Experimente outro período ou limpe os filtros. Também é possível exportar o relatório vazio.</p></div></div> :
            <><div className="table-wrap"><table className="data-table"><thead><tr>{resultado.colunas.map((coluna) => <th key={coluna}>{coluna}</th>)}</tr></thead><tbody>{linhas.map((linha, indice) => <tr key={indice}>{linha.celulas.map((celula, i) => <td key={i}>{celula}</td>)}</tr>)}</tbody></table></div>
              <div className="report-pagination"><span>{resultado.linhas.length} registros · Página {pagina} de {paginas}. Exportações incluem todos os registros filtrados.</span><div className="report-filter-actions"><button className="button" disabled={pagina === 1} onClick={() => setPagina(pagina - 1)} type="button">Anterior</button><button className="button" disabled={pagina === paginas} onClick={() => setPagina(pagina + 1)} type="button">Próxima</button></div></div></>}
        </section>
      </>}
    </div>
  );
}
