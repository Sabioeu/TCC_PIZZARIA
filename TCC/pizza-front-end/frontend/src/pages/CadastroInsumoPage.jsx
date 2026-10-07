import React, { useCallback, useEffect, useState } from 'react';
import InsumoForm from '../components/InsumoForm';
import Icon from '../components/Icon';
import PageHeader from '../components/PageHeader';
import api from '../api/api';

const CadastroInsumoPage = () => {
  const [insumos, setInsumos] = useState([]);
  const [editando, setEditando] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const carregar = useCallback(async () => { setLoading(true); setError(''); try { const response = await api.get('/insumos'); setInsumos(response.data || []); } catch (err) { console.error(err); setError('Não foi possível carregar os insumos.'); } finally { setLoading(false); } }, []);
  useEffect(() => { carregar(); }, [carregar]);
  const excluir = async (insumo) => { if (!window.confirm(`Excluir o insumo "${insumo.nome}"?`)) return; try { await api.delete(`/insumos/${insumo.id}`); setInsumos((atuais) => atuais.filter((item) => item.id !== insumo.id)); } catch (err) { console.error(err); setError('Não foi possível excluir o insumo.'); } };

  return (
    <div className="page-stack">
      <PageHeader description="Organize matérias-primas, unidades de medida e quantidades disponíveis." eyebrow="Cadastros" title="Insumos" />
      <section className="split-layout">
        <article className="panel sticky-panel"><div className="panel-header"><div><h2 className="panel-title">{editando ? 'Editar insumo' : 'Novo insumo'}</h2><p className="panel-subtitle">{editando ? `Alterando o registro #${editando.id}` : 'Cadastre uma matéria-prima'}</p></div>{editando && <span className="status-badge status-info">Editando</span>}</div><div className="panel-body"><InsumoForm insumoParaEdicao={editando} onCadastroSucesso={(item) => setInsumos((atuais) => [...atuais, item])} onEdicaoSucesso={(item) => { if (item) setInsumos((atuais) => atuais.map((current) => current.id === item.id ? item : current)); setEditando(null); }} /></div></article>
        <article className="panel"><div className="panel-header"><div><h2 className="panel-title">Insumos cadastrados</h2><p className="panel-subtitle">{insumos.length} registros encontrados</p></div></div>{error && <div className="panel-body"><div className="alert alert-error">{error}</div></div>}{loading ? <Loading /> : insumos.length === 0 ? <Empty /> : <div className="table-wrap"><table className="data-table"><thead><tr><th>Insumo</th><th>Quantidade</th><th>Situação</th><th style={{ textAlign: 'right' }}>Ações</th></tr></thead><tbody>{insumos.map((insumo) => <tr key={insumo.id}><td><span className="cell-title">{insumo.nome}</span><span className="cell-subtitle">ID #{insumo.id}</span></td><td><span className="cell-title">{Number(insumo.quantidade || 0).toFixed(2)} {insumo.unidade}</span></td><td><span className={`status-badge ${Number(insumo.quantidade || 0) <= 5 ? 'status-danger' : 'status-success'}`}>{Number(insumo.quantidade || 0) <= 5 ? 'Estoque baixo' : 'Regular'}</span></td><ActionCell onDelete={() => excluir(insumo)} onEdit={() => setEditando(insumo)} /></tr>)}</tbody></table></div>}</article>
      </section>
    </div>
  );
};
const Loading = () => <div className="loading-state"><div><div className="spinner" />Carregando...</div></div>;
const Empty = () => <div className="empty-state"><div><div className="empty-state-icon"><Icon name="ingredients" /></div><strong>Nenhum insumo</strong><p>As matérias-primas aparecerão aqui.</p></div></div>;
const ActionCell = ({ onDelete, onEdit }) => <td><div className="table-actions"><button aria-label="Editar" className="icon-button" onClick={onEdit} type="button"><Icon name="edit" size={15} /></button><button aria-label="Excluir" className="icon-button" onClick={onDelete} style={{ color: 'var(--red)' }} type="button"><Icon name="trash" size={15} /></button></div></td>;
export default CadastroInsumoPage;
